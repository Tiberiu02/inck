import { FileModel, NoteModel } from "./Models.mjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { exploreTree } from "./FsTreeExplorer.mjs";

export const PRIVATE = "private"
export const READ_WRITE = "read_write"
export const READ_ONLY = "read_only"

const VALID_VISIBILITIES = [PRIVATE, READ_ONLY, READ_WRITE]

/**
 * Potential errors w/ status:
 * 400: missing fields, invalid email
 * 409: user already exists
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export async function getFilesFn(req, res) {
  try {
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN)
    const files = await FileModel.find({ owner: token.userId })
    //console.log(files)
    res.status(201).send({ files });

  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "Unable to fetch files" })
  }
}

export async function getThrashedFilesFn(req, res) {
  try {
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN)
    // TODO: on first access, try to get notes without thrash time and set it to null for consistency
    const files = await FileModel.find({
      owner: token.userId,
      removalReqTime: { $ne: null }
    })

    console.log(files)
    res.status(201).send({ files });

  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "Unable to fetch files" })
  }
}

function generateRandomString(n) {
  let randomString = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < n; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomString;
}

async function generateNewFileName(n) {

  let name = generateRandomString(n)

  let fileAlreadyExists = false
  let noteAlreadyExists = false
  do {
    const fileWithIdCount = await FileModel.count({
      fileId: name
    })

    const noteWithIdCount = await NoteModel.count({
      id: name
    })

    fileAlreadyExists = fileWithIdCount > 0
    noteAlreadyExists = noteWithIdCount > 0


  } while (fileAlreadyExists || noteAlreadyExists)
  return name

}

async function insertNewNoteInDB(
  type,
  name,
  parentDir,
  owner,
  fileId,
  defaultAccess) {
  const filePromise = FileModel.create({
    type,
    name,
    parentDir,
    owner,
    fileId,
    defaultAccess
  });

  const notePromise = NoteModel.create({
    id: fileId,
    isFreeNote: false,
  })

  await filePromise
  await notePromise
}

export async function createFileFn(req, res) {
  /**
   * Create authenticated note
   */
  try {
    if (req.body.type != "note" && req.body.type != "folder") {
      res.status(400).send({ error: "Invalid request" })
    }

    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN)
    const newFileId = await generateNewFileName(12)

    await insertNewNoteInDB(
      req.body.type,
      req.body.name,
      req.body.parentDir,
      token.userId,
      newFileId,
      req.body.options && req.body.options.publicAccess
    )

    const allFiles = await FileModel.find({
      owner: token.userId,
    })

    return res.status(201).send({
      message: 'success',
      files: allFiles,
    });

  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "internal error" })
  }
}

export async function removeFilesFn(req, res) {
  try {
    const { notesToRemove } = req.body
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN)

    const children = await exploreTree(notesToRemove)
    for (let fileId of children) {
      // Delete file (explorer)
      const removed = await FileModel.findOneAndDelete({
        _id: fileId,
        owner: token.userId
      })
      // Delete note (strokes data)
      if (removed.type == 'note') {
        await NoteModel.deleteOne({
          id: removed.fileId,
          isFreeNote: false
        })
      }
    }

    const allFiles = await FileModel.find({
      owner: token.userId,
    })

    return res.status(201).send({
      message: 'success',
      files: allFiles
    })

  } catch (err) {
    res.status(400).send({ error: "Unable to fetch files" })
  }
}

export async function moveFilesFn(req, res) {
  try {
    const { notesToMove, target } = req.body
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN)

    for (let idx = 0; idx < notesToMove.length; idx++) {
      const { type, _id } = notesToMove[idx]

      const update = await FileModel.updateOne({
        _id: _id,
        owner: token.userId,
        type: type
      }, {
        parentDir: target
      })

      console.log(update)

    }

    const allFiles = await FileModel.find({
      owner: token.userId,
    })

    return res.status(201).send({
      message: 'success',
      files: allFiles
    })

  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "Unable to fetch files" })
  }
}

export async function importFreeNote(req, res) {
  try {
    const { name, parentDir, visibility, freeNoteURL } = req.body
    console.log(freeNoteURL)
    console.log(name)
    console.log(visibility)

    const wloc = freeNoteURL.match(/\/free-note\/([\w\d_]+)/)

    if (wloc == null || wloc.length != 2) {
      res.status(400).send({ error: "Unable to import free note: free note does not exist" })
    }
    const freeNoteId = wloc[1]

    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN)
    const newFileId = await generateNewFileName(12)

    // Get free note
    const freeNoteData = await NoteModel.findOne({
      id: freeNoteId,
      isFreeNote: true
    })

    if (freeNoteData == null) {
      res.status(400).send({ error: "Unable to import free note: free note does not exist" })
    }

    // Make an auth copy of free note
    await NoteModel.create({
      id: newFileId,
      strokes: freeNoteData.strokes || [],
      isFreeNote: false
    })
    // Create an explorer file
    await FileModel.create({
      type: "file",
      name: name,
      owner: token.userId,
      fileId: newFileId,
      parentDir: parentDir,
      defaultAccess: visibility
    })

    const allFiles = await FileModel.find({
      owner: token.userId,
    })

    return res.status(201).send({
      message: 'success',
      files: allFiles,
    });

  } catch (err) {
    console.log(err)
    res.status(400).send({ error: "Unable to import free note" })
  }
}

function validVisibility(visibility) {
  return VALID_VISIBILITIES.includes(visibility)
}

export async function editFileFn(req, res) {
  try {
    const { id, newName, newVisibility } = req.body
    if (!validVisibility(newVisibility)) {
      console.log("Invalid request: visibility requested: " + newVisibility)
      res.status(400).send({ error: "Invalid request" })
      return
    }

    if (newName.trim() == "") {
      console.log("Invalid new name: " + "'" + newName + "'")
      res.status(400).send({ error: "Invalid request" })
    }

    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN)


    const updateObject = {
      name: newName,
      defaultAccess: newVisibility
    }

    await FileModel.findOneAndUpdate({
      _id: ObjectId(id),
      owner: token.userId
    }, updateObject)


    const allFiles = await FileModel.find({
      owner: token.userId,
    })

    return res.status(201).send({
      message: 'success',
      files: allFiles
    })
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "internal error" })
  }
}