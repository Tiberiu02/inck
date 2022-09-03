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
        `[${new Date().toLocaleString()}] ${user.ip} stopped drawing on ${user.docId}, ${docs[user.docId].users.length
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

    await NoteModel.updateOne({
        id: user.docId,
        isFreeNote: !user.isAuthSocket,
    }, {
        $pull: { strokes: { id: id } }
    })
}

async function newStrokeFn(stroke, user, docs, socket) {
    if (!user.docId || !user.canWrite) {
        return;
    }

    console.log(`[${new Date().toLocaleString()}] ${user.ip} is drawing on /doc/${user.isAuthSocket ? "premium" : "free"}/${user.docId}`);

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

    await NoteModel.updateOne({
        id: user.docId,
        isFreeNote: !user.isAuthSocket,
    }, {
        $push: { strokes: stroke }
    })
}

async function docRights(docId, user) {
    // return read acces; write access
    const noteData = await NoteModel.findOne({
        id: docId,
        isFreeNote: !user.isAuthSocket,
    })

    if (noteData.isFreeNote) {
        return [true, true]
    }

    const fileData = await FileModel.findOne({
        fileId: docId,
        isFreeNote: false,
    })

    if (fileData == null) {
        console.log("Unexpected case: this should never happen")
        return [false, false]
    }

    let token = {
        userId: null,
        defaultAccess: null
    };
    if (user.authToken !== undefined) {
        try {
            token = jwt.verify(user.authToken, process.env.JWT_TOKEN)
        } catch (err) {
            console.log("Error: " + err)
        }
    }

    const access = fileData.defaultAccess
    const isOwner = token.userId == fileData.owner

    const readAccess = (
        access == READ_WRITE ||
        access == READ_ONLY ||
        isOwner
    )

    const writeAccess = (
        access == READ_WRITE ||
        isOwner
    )

    return [readAccess, writeAccess]

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

    const noteExists = await NoteModel.countDocuments({
        id: id,
        isFreeNote: !user.isAuthSocket
    }) > 0

    // if free + new note => good
    if (!noteExists && !user.isAuthSocket) {
        await NoteModel.create({
            id: id,
            isFreeNote: true
        })
    }

    // if premium + doesnt exist, not good
    if (!noteExists && user.isAuthSocket) {
        console.log("Unauthorized access to non-existent note " + id)
        socket.emit("unauthorized")
        return
    }

    // Check authentication here
    const [canRead, canWrite] = await docRights(id, user)
    if (user.isAuthSocket && !canRead) {
        socket.emit("unauthorized")
        return
    }
    user.docId = id;
    user.canWrite = canWrite
    checkSpecialPriviledges(id, user);

    const docUserList = docs[id] || { users: [] }
    docUserList.users.push(user)
    docs[id] = docUserList

    // Connect with other users only if can write
    if (user.canWrite) {
        const noteType = user.isAuthSocket ? "auth" : "free"
        console.log(`[${new Date().toLocaleString()}] ${user.ip} started drawing on /doc/${noteType}/${user.docId}`);
    }
    // Inform existing collaborators about new collaborator, and vice versa
    for (let other of docs[user.docId].users) {
        if (other != user) {
            user.socket.emit("new collaborator", other.id);
            other.socket.emit("new collaborator", user.id);
            continue
            // Note: only notify about writers
            if (other.canWrite) {
                user.socket.emit("new collaborator", other.id);
            }
            if (user.canWrite) {
                other.socket.emit("new collaborator", user.id);
            }
        }
    }
    let strokes;
    const noteParams = {
        id: id,
        isFreeNote: !user.isAuthSocket,
    }

    NoteModel.find(noteParams).then((noteData) => {
        if (noteData.length == 0) {
            NoteModel.create(noteParams)
            strokes = []
        } else {
            strokes = noteData[0].strokes
        }
        socket.emit("can write", user.canWrite)
        socket.emit("load strokes", strokes, user.id)
    })
}

function remoteControlFn(args, user, docs, socket) {
    if (!user.docId || !docs[user.docId] /* || (socket.isAuthSocket && !user.canWrite) */) {
        return;
    };

    for (let other of docs[user.docId].users) {
        if (other != user) {
            other.socket.emit(`collaborator update ${user.id}`, ...args);
        }
    }
}

function directedRemoteControlFn(targetId, args, user, docs, socket) {
    if (!user.docId || !docs[user.docId] /* || (socket.isAuthSocket && !user.canWrite) */) {
        return;
    };


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
    return () => disconnectFn(user, docs, socket)
}

export function removeStroke(user, docs, socket) {
    return (id) => removeStrokeFn(id, user, docs, socket)
}

export function newStroke(user, docs, socket) {
    return (stroke) => newStrokeFn(stroke, user, docs, socket)
}

export function requestDocument(user, docs, socket) {
    return (id) => requestDocumentFn(id, user, docs, socket)
}