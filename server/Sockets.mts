import jwt from "jsonwebtoken";
import { NoteAccess } from "./api/FileExplorer.mjs";
import { FileModel, NoteModel } from "./db/Models.mjs";
import { Socket as WebSocket } from "socket.io";
import {
  BackgroundTypes,
  DBNote,
  DrawingUser,
  DrawnDocument,
  FrontEndNoteData,
  JwtPayload,
  Stroke,
} from "./BackendInterfaces.mjs";
import { Timer } from "./Timer.mjs";
import { logEvent } from "./logging/AppendAnalytics.mjs";

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

async function removeStrokeFn(id: string, user: DrawingUser, docs: { [id: string]: DrawnDocument }, socket: WebSocket) {
  if (!user.docId || !user.canWrite || typeof id != "string") {
    return;
  }
  const timer = new Timer();
  for (let other of docs[user.docId].users) {
    if (other != user) {
      other.socket.emit("unload strokes", [id]);
    }
  }

  await NoteModel.updateOne({ id: user.docId }, { $pull: { strokes: { id: id } } });
  logEvent("remove_stroke", {
    docId: user.docId,
    executionTime: timer.elapsed().toString(),
  });
}

async function newStrokeFn(
  stroke: Stroke,
  user: DrawingUser,
  docs: { [id: string]: DrawnDocument },
  socket: WebSocket
) {
  if (!user.docId || !user.canWrite) {
    return;
  }
  const timer = new Timer();
  console.log(`[${new Date().toLocaleString()}] ${user.ip} is drawing on /note/${user.docId}`);
  const [uId, sId] = stroke.id.split("-");

  /*
    if (uId != user.id) {
        console.log(`Invalid stroke on ${user.docId}. User id = ${user.id} (received ${uId})`);
        return;
    }
    */

  for (let other of docs[user.docId].users) {
    if (other != user) {
      other.socket.emit("load strokes", [stroke]);
    }
  }

  await NoteModel.updateOne({ id: user.docId }, { $push: { strokes: stroke } });
  logEvent("draw_new_stroke", {
    docId: user.docId,
    executionTime: timer.elapsed().toString(),
  });
}

async function docRights(docId: string, user: DrawingUser) {
  // return read acces; write access
  const noteData = await NoteModel.findOne({ id: docId });

  if (noteData.isFreeNote) {
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

  const readAccess = access == NoteAccess.readWrite || access == NoteAccess.readOnly || isOwner;
  const writeAccess = access == NoteAccess.readWrite || isOwner;

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
  socket: WebSocket
) {
  if (user.docId) {
    return;
  }
  const timer = new Timer();
  const noteData: DBNote = await NoteModel.findOne({ id: id });

  const noteExists = noteData !== null;
  let note: FrontEndNoteData = {
    id: id,
    strokes: [],
    canWrite: false,
  };

  // if note doesn't exist => create free note
  if (!noteExists) {
    await NoteModel.create({ id: id, isFreeNote: true });
  } else {
    note.strokes = noteData.strokes;

    if (noteData.backgroundType == BackgroundTypes.pdf) {
      const fileHash = noteData.backgroundOptions.fileHash as string;
      const url = `/api/pdf/get-pdf/${fileHash}.pdf`;
      note.pdfUrl = url;
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
      continue;
      // Note: only notify about writers
      if (other.canWrite) {
        user.socket.emit("new collaborator", other.id);
      }
      if (user.canWrite) {
        other.socket.emit("new collaborator", user.id);
      }
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

export function removeStroke(user: DrawingUser, docs: { [id: string]: DrawnDocument }, socket: WebSocket) {
  return (id: string) => removeStrokeFn(id, user, docs, socket);
}

export function newStroke(user: DrawingUser, docs: { [id: string]: DrawnDocument }, socket: WebSocket) {
  return (stroke: Stroke) => newStrokeFn(stroke, user, docs, socket);
}

export function requestDocument(user: DrawingUser, docs: { [id: string]: DrawnDocument }, socket: WebSocket) {
  return (id: string) => requestDocumentFn(id, user, docs, socket);
}
