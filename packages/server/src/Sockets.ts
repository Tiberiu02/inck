import jwt from "jsonwebtoken";
import { FileModel, NoteModel } from "./db/Models";
import { Socket as WebSocket } from "socket.io";
import {
  BackgroundTypes,
  DBFile,
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

const PDF_BASE_URI = "https://d2bq6ozq8i17u6.cloudfront.net";

function disconnectFn(user: DrawingUser, docs: { [id: string]: DrawnDocument }, socket: WebSocket) {
  if (!user.docId) {
    return;
  }
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
  if (formatData == null) return;

  const { format } = formatData;
  if (format != LAST_NOTE_FORMAT) {
    let noteData = await NoteModel.findOne({ id: id }, { _id: 0, __v: 0 });
    if (noteData == null) return;
    noteData = noteData.toObject();
    noteData = UpdateNoteFormat(noteData);
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
  cache.putStroke(user.docId, stroke);
  logEvent("draw_new_stroke", {
    docId: user.docId,
    userId: user.userId ? user.userId : "None",
    executionTime: timer.elapsed().toString(),
  });
}

async function docRights(docId: string, user: DrawingUser) {
  // return read acces; write access
  const noteData = await NoteModel.findOne({ id: docId }, { isFreeNote: 1 });

  if (noteData?.isFreeNote) {
    return [undefined, true, true];
  }

  const fileData = await FileModel.findOne({
    fileId: docId,
    isFreeNote: false,
  });

  if (fileData == null) {
    console.error("Unexpected case: this should never happen");
    return [undefined, false, false];
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
  const owner = fileData.owner;
  const isOwner = token.userId == owner;

  const readAccess = access == AccessTypes.EDIT || access == AccessTypes.VIEW || isOwner;
  const writeAccess = access == AccessTypes.EDIT || isOwner;

  return [owner, readAccess, writeAccess];
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
  console.log("Document requested", id);

  if (user.docId) {
    return;
  }

  await EnsureLastNoteFormat(id);

  const timer = new Timer();
  const noteData: DBNote = await NoteModel.findOne({ id: id });

  const fileData: DBFile = await FileModel.findOne({ fileId: id });

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

    if (fileData) {
      if (fileData.backgroundType == BackgroundTypes.pdf) {
        const fileHash = fileData.backgroundOptions.fileHash as string;
        // WARNING: DO NOT USE path.join here, it breaks with urls !!!
        note.pdfUrl = `${PDF_BASE_URI}/${fileHash}.pdf`;
      } else if (
        fileData.backgroundType != BackgroundTypes.blank &&
        fileData.backgroundOptions != BackgroundTypes.pdf
      ) {
        note.bgPattern = fileData.backgroundType;
        note.bgSpacing = fileData.backgroundOptions.spacing;
      }
    }
  }

  // Check authentication here
  console.log("testing rights");
  const [owner, canRead, canWrite] = await docRights(id, user);
  console.log("Rights fetched");
  user.userId = owner;
  if (!canRead) {
    socket.emit("unauthorized");
    console.log("unauthorized");
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
  console.log("sent document", id);
  logEvent("request_document_strokes", {
    docId: id,
    userId: owner ? owner : "None",
    userIp: user.ip,
    executionTime: timer.elapsed().toString(),
  });
}

function remoteControlFn(args: any, user: DrawingUser, docs: { [id: string]: DrawnDocument }, socket: WebSocket) {
  if (!user.docId || !docs[user.docId] /* || (socket.isAuthSocket && !user.canWrite) */) {
    return;
  }
  for (let other of docs[user.docId].users) {
    if (other != user) {
      other.socket.emit(`collaborator update ${user.id}`, ...args);
    }
  }
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
  for (let other of docs[user.docId].users) {
    if (other.id == targetId) {
      other.socket.emit(`collaborator update ${user.id}`, ...args);
    }
  }
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
