import { FileModel } from "./Models.mjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { exploreTree } from "./FsTreeExplorer.mjs";

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

export async function createFileFn(req, res) {
  try {
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN)

    // TODO: validate file name & type
    // TODO: when generating file id, make sure it's not already used
    const file = await FileModel.create({
      type: req.body.type,
      name: req.body.name,
      parentDir: req.body.parentDir,
      owner: token.userId,
      fileId: generateRandomString(4),
      defaultAccess: req.body.options && req.body.options.publicAccess
    });

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
      await FileModel.deleteOne({
        _id: fileId,
        owner: token.userId
      })
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

export async function editFileFn(req, res) {
  try {
    const { id, newName, newVisibility, options } = req.body
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN)
    // TODO: validate file name & type
    // TODO: when generating file id, make sure it's not already used


    const updateObject = { name: newName }
    // TODO: check visibility is in a subset of valid values
    if (newVisibility != "" && newVisibility != null) {
      updateObject["defaultAccess"] = newVisibility
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