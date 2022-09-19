import jwt from "jsonwebtoken";
import { PRIVATE, READ_ONLY, READ_WRITE } from "./FileExplorer.mjs";
import { FileModel, NoteModel } from "./Models.mjs";

function disconnectFn(user, docs, socket) {
  if (!user.docId) {
    return;
  }

  for (let other of docs[user.docId].users) {
    if (other != user) {
      other.socket.emit(`collaborator remove ${user.id}`);
    }
  }
  docs[user.docId].users = docs[user.docId].users.filter(u => u != user);
  console.log(
    `[${new Date().toLocaleString()}] ${user.ip} stopped drawing on ${user.docId}, ${
      docs[user.docId].users.length
    } users remaining`
  );
}

async function removeStrokeFn(id, user, docs, socket) {
  if (!user.docId || !user.canWrite || typeof id != "string") {
    return;
  }

  for (let other of docs[user.docId].users) {
    if (other != user) {
      other.socket.emit("unload strokes", [id]);
    }
  }

  await NoteModel.updateOne(
    {
      id: user.docId,
    },
    {
      $pull: { strokes: { id: id } },
    }
  );
}

async function newStrokeFn(stroke, user, docs, socket) {
  if (!user.docId || !user.canWrite) {
    return;
  }
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

  await NoteModel.updateOne(
    {
      id: user.docId,
    },
    {
      $push: { strokes: stroke },
    }
  );
}

async function docRights(docId, user) {
  // return read acces; write access
  const noteData = await NoteModel.findOne({
    id: docId,
  });

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

  let token = {
    userId: null,
  };
  if (user.authToken !== undefined) {
    try {
      token = jwt.verify(user.authToken, process.env.JWT_TOKEN);
    } catch (err) {
      console.log("Error: " + err);
    }
  }

  const access = fileData.defaultAccess;
  const isOwner = token.userId == fileData.owner;

  const readAccess = access == READ_WRITE || access == READ_ONLY || isOwner;

  const writeAccess = access == READ_WRITE || isOwner;

  return [readAccess, writeAccess];
}

function checkSpecialPriviledges(docId, user) {
  if (user.docId == "demo") {
    user.canWrite = false;
  }
  if (user.docId == "secret_demo_page") {
    user.docId = "demo";
  }
}

async function requestDocumentFn(id, user, docs, socket) {
  if (user.docId) {
    return;
  }

  const noteData = await NoteModel.findOne({
    id: id,
  });

  const noteExists = noteData !== null;
  let note;

  // if note doesn't exist => create free note
  if (!noteExists) {
    await NoteModel.create({
      id: id,
      isFreeNote: true,
    });

    note = {
      id: id,
      strokes: [],
    };
  } else {
    note = {
      id: id,
      strokes: noteData.strokes,
    };

    if (noteData.backgroundType == "pdf") {
      const url = `/api/pdf/get-pdf/${noteData.backgroundOptions.fileHash}.pdf`;
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
  checkSpecialPriviledges(id, user);
  note.canWrite = user.canWrite;

  const docUserList = docs[id] || { users: [] };
  docUserList.users.push(user);
  docs[id] = docUserList;

  console.log(`[${new Date().toLocaleString()}] ${user.ip} opened /note/${user.docId}`);

  // Inform existing collaborators about new collaborator, and vice versa
  for (let other of docs[user.docId].users) {
    if (other != user) {
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
}

function remoteControlFn(args, user, docs, socket) {
  if (!user.docId || !docs[user.docId] /* || (socket.isAuthSocket && !user.canWrite) */) {
    return;
  }

  for (let other of docs[user.docId].users) {
    if (other != user) {
      other.socket.emit(`collaborator update ${user.id}`, ...args);
    }
  }
}

function directedRemoteControlFn(targetId, args, user, docs, socket) {
  if (!user.docId || !docs[user.docId] /* || (socket.isAuthSocket && !user.canWrite) */) {
    return;
  }

  for (let other of docs[user.docId].users) {
    if (other.id == targetId) {
      other.socket.emit(`collaborator update ${user.id}`, ...args);
    }
  }
}

export function remoteControl(user, docs, socket) {
  return (...args) => remoteControlFn(args, user, docs, socket);
}

export function directedRemoteControl(user, docs, socket) {
  return (targetId, ...args) => directedRemoteControlFn(targetId, args, user, docs, socket);
}

export function disconnect(user, docs, socket) {
  return () => disconnectFn(user, docs, socket);
}

export function removeStroke(user, docs, socket) {
  return id => removeStrokeFn(id, user, docs, socket);
}

export function newStroke(user, docs, socket) {
  return stroke => newStrokeFn(stroke, user, docs, socket);
}

export function requestDocument(user, docs, socket) {
  return id => requestDocumentFn(id, user, docs, socket);
}
