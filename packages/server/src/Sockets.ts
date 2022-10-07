import jwt from "jsonwebtoken";
import { FileModel, NoteModel } from "./db/Models";
import { Socket as WebSocket } from "socket.io";
import {
  BackgroundTypes,
  DBNote,
  DrawingUser,
  DrawnDocument,
  FrontEndNoteData,
  JwtPayload,
  Stroke,
} from "./BackendInterfaces";
import { Timer } from "./Timer";
import { logEvent } from "./logging/AppendAnalytics";
import { AccessTypes } from "@inck/common-types/Files";
import { RedisCache } from "./RedisCache";

function disconnectFn(user: DrawingUser, docs: { [id: string]: DrawnDocument }, socket: WebSocket) {
  if (!user.docId) {
    return;
  }
  const timer = new Timer();
  for (let other of docs[user.docId].users) {
    if (other != user) {
      other.socket.emit(`collaborator remove ${user.id}`);
    }
  }
  docs[user.docId].users = docs[user.docId].users.filter((u) => u != user);
  console.log(
    `[${new Date().toLocaleString()}] ${user.ip} stopped drawing on ${user.docId}, ${
      docs[user.docId].users.length
    } users remaining`
  );
  logEvent("disconnect_user_wsocket", {
    userIp: user.ip.toString(),
    usersLeftCount: Object.keys(docs).length.toString(),
    docId: user.docId,
    executionTime: timer.elapsed().toString(),
  });
}

enum NoteFormats {
  DictNoteUpdate = "dict_note",
}

const LAST_NOTE_FORMAT = NoteFormats.DictNoteUpdate;

const UpdateNoteFunctions = {
  undefined: (noteData: any) => {
    const oldStrokes: Stroke[] = noteData.strokes;
    noteData.format = NoteFormats.DictNoteUpdate;
    noteData.strokes = {};

    if (oldStrokes && oldStrokes.length) {
      for (const stroke of oldStrokes) {
        noteData.strokes[stroke.id] = stroke;
      }
    }

    return noteData;
  },
};

function UpdateNoteFormat(noteData: any) {
  while (noteData.format != LAST_NOTE_FORMAT) {
    noteData = UpdateNoteFunctions[noteData.format as "undefined"](noteData);
  }
  return noteData;
}

async function EnsureLastNoteFormat(id: string) {
  const formatData = (await NoteModel.findOne({ id: id }, { format: 1 })) as any;
  // console.log(id, formatData);
  if (formatData == null) return;

  const { format } = formatData;
  // console.log("format", format);
  if (format != LAST_NOTE_FORMAT) {
    let noteData = await NoteModel.findOne({ id: id }, { _id: 0, __v: 0 });
    if (noteData == null) return;
    noteData = noteData.toObject();
    // console.log("initial note data", noteData);
    noteData = UpdateNoteFormat(noteData);
    // console.log("updated note data", noteData);
    await NoteModel.findOneAndReplace({ id: id }, noteData);
  }
}

async function newStrokeFn(
  stroke: Stroke,
  user: DrawingUser,
  docs: { [id: string]: DrawnDocument },
  socket: WebSocket,
  cache: RedisCache
) {
  if (!user.docId || !user.canWrite) {
    return;
  }

  const timer = new Timer();
  console.log(`[${new Date().toLocaleString()}] ${user.ip} is drawing on /note/${user.docId}`);
  for (let other of docs[user.docId].users) {
    if (other != user) {
      other.socket.emit("load strokes", [stroke]);
    }
  }

  const timestampData = await NoteModel.findOne(
    { id: user.docId },
    { _id: 0, strokes: { [stroke.id]: { timestamp: 1 } } }
  );

  const timestamp =
    (timestampData &&
      timestampData.strokes &&
      timestampData.strokes[stroke.id] &&
      timestampData.strokes[stroke.id].timestamp) ||
    0;

  if (stroke.timestamp > timestamp) {
    cache.putStroke(user.docId, stroke);
    /*
    if (stroke.deserializer == "stroke") {
      cache.putStroke(user.docId, stroke);
    } else if (stroke.deserializer == "removed") {
      await cache.removeStroke(user.docId, stroke.id);
    } else {
      throw Error(`Unknown deserializer ${stroke.deserializer}`);
    }
    */
    //await NoteModel.updateOne({ id: user.docId }, { $set: { [`strokes.${stroke.id}`]: stroke } });
  } else {
    console.log("user tried to add outdated strokes");
  }

  logEvent("draw_new_stroke", {
    docId: user.docId,
    executionTime: timer.elapsed().toString(),
  });
}

async function docRights(docId: string, user: DrawingUser) {
  // return read acces; write access
  const noteData = await NoteModel.findOne({ id: docId }, { isFreeNote: 1 });

  if (noteData?.isFreeNote) {
    return [true, true];
  }

  const fileData = await FileModel.findOne({
    fileId: docId,
    isFreeNote: false,
  });

  if (fileData == null) {
    console.log("Unexpected case: this should never happen");
    return [false, false];
  }

  let token: JwtPayload = {
    userId: undefined,
  };
  if (user.authToken !== undefined) {
    try {
      token = jwt.verify(user.authToken, process.env.JWT_TOKEN as string) as JwtPayload;
    } catch (err) {
      console.log("Error: " + err);
    }
  }

  const access = fileData.defaultAccess;
  const isOwner = token.userId == fileData.owner;

  const readAccess = access == AccessTypes.EDIT || access == AccessTypes.VIEW || isOwner;
  const writeAccess = access == AccessTypes.EDIT || isOwner;

  return [readAccess, writeAccess];
}

function checkSpecialPriviledges(user: DrawingUser) {
  if (user.docId == "demo") {
    user.canWrite = false;
  }
  if (user.docId == "secret_demo_page") {
    user.docId = "demo";
  }
}

async function requestDocumentFn(
  id: string,
  user: DrawingUser,
  docs: { [id: string]: DrawnDocument },
  socket: WebSocket,
  cache: RedisCache
) {
  if (user.docId) {
    return;
  }

  await EnsureLastNoteFormat(id);

  const timer = new Timer();
  const noteData: DBNote = await NoteModel.findOne({ id: id });

  const noteExists = noteData !== null;
  let note: FrontEndNoteData = {
    id: id,
    strokes: {},
    canWrite: false,
    creationDate: Date.now(),
  };

  // if note doesn't exist => create free note
  if (!noteExists) {
    await NoteModel.create({ id: id, isFreeNote: true, format: LAST_NOTE_FORMAT });
  } else {
    note.strokes = noteData.strokes;
    note.creationDate = noteData.creationDate.getTime();

    const cacheStrokes = await cache.getAllStrokes(id);
    note.strokes = { ...note.strokes, ...cacheStrokes };

    if (noteData.backgroundType == BackgroundTypes.pdf) {
      const fileHash = noteData.backgroundOptions.fileHash as string;
      const url = `/api/pdf/get-pdf/${fileHash}.pdf`;
      note.pdfUrl = url;
    } else if (noteData.backgroundType) {
      note.bgPattern = noteData.backgroundType;
      note.bgSpacing = noteData.backgroundOptions.spacing;
    }
  }

  // Check authentication here
  const [canRead, canWrite] = await docRights(id, user);
  if (!canRead) {
    socket.emit("unauthorized");
    return;
  }
  user.docId = id;
  user.canWrite = canWrite;
  checkSpecialPriviledges(user);

  note.canWrite = user.canWrite;

  const docUserList = docs[id] || { users: [] };
  docUserList.users.push(user);
  docs[id] = docUserList;

  console.log(`[${new Date().toLocaleString()}] ${user.ip} opened /note/${user.docId}`);

  // Inform existing collaborators about new collaborator, and vice versa
  for (let other of docs[user.docId].users) {
    if (other != user) {
      // TODO: only communicate the new user if it can write
      user.socket.emit("new collaborator", other.id);
      other.socket.emit("new collaborator", user.id);
    }
  }

  socket.emit("load note", note);
  logEvent("request_document_strokes", {
    docId: id,
    userIp: user.ip,
    executionTime: timer.elapsed().toString(),
  });
}

function remoteControlFn(args: any, user: DrawingUser, docs: { [id: string]: DrawnDocument }, socket: WebSocket) {
  if (!user.docId || !docs[user.docId] /* || (socket.isAuthSocket && !user.canWrite) */) {
    return;
  }
  const timer = new Timer();
  for (let other of docs[user.docId].users) {
    if (other != user) {
      other.socket.emit(`collaborator update ${user.id}`, ...args);
    }
  }
  logEvent("remote_control_fn", {
    docId: user.docId,
    connectedUsersCount: docs[user.docId].users.length.toString(),
    executionTime: timer.elapsed().toString(),
  });
}

function directedRemoteControlFn(
  targetId: string,
  args: any,
  user: DrawingUser,
  docs: { [id: string]: DrawnDocument },
  socket: WebSocket
) {
  if (!user.docId || !docs[user.docId] /* || (socket.isAuthSocket && !user.canWrite) */) {
    return;
  }
  const timer = new Timer();
  for (let other of docs[user.docId].users) {
    if (other.id == targetId) {
      other.socket.emit(`collaborator update ${user.id}`, ...args);
    }
  }
  logEvent("directed_remote_control_fn", {
    docId: user.docId,
    connectedUsersCount: docs[user.docId].users.length.toString(),
    executionTime: timer.elapsed().toString(),
  });
}

export function remoteControl(user: DrawingUser, docs: { [id: string]: DrawnDocument }, socket: WebSocket) {
  return (...args: any) => remoteControlFn(args, user, docs, socket);
}

export function directedRemoteControl(user: DrawingUser, docs: { [id: string]: DrawnDocument }, socket: WebSocket) {
  return (targetId: string, ...args: any) => directedRemoteControlFn(targetId, args, user, docs, socket);
}

export function disconnect(user: DrawingUser, docs: { [id: string]: DrawnDocument }, socket: WebSocket) {
  return () => disconnectFn(user, docs, socket);
}

export function newStroke(
  user: DrawingUser,
  docs: { [id: string]: DrawnDocument },
  socket: WebSocket,
  cache: RedisCache
) {
  return (stroke: Stroke) => newStrokeFn(stroke, user, docs, socket, cache);
}

export function syncStrokes(
  user: DrawingUser,
  docs: { [id: string]: DrawnDocument },
  socket: WebSocket,
  cache: RedisCache
) {
  return async (strokes: Stroke[]) => {
    for (const stroke of strokes) {
      await newStrokeFn(stroke, user, docs, socket, cache);
    }
    socket.emit("sync complete");
  };
}

export function requestDocument(
  user: DrawingUser,
  docs: { [id: string]: DrawnDocument },
  socket: WebSocket,
  cache: RedisCache
) {
  return (id: string) => requestDocumentFn(id, user, docs, socket, cache);
}
