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
    res.status(400).send({error: "Unable to fetch files"})
  }
}

export async function getThrashedFilesFn(req, res) {
  try {
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN)
    // TODO: on first access, try to get notes without thrash time and set it to null for consistency
    const files = await FileModel.find({ 
      owner: token.userId,
      removalReqTime: {$ne: null}
     })

     console.log(files)
     return
    //console.log(files)
    res.status(201).send({ files });

  } catch (err) {
    console.log(err);
    res.status(400).send({error: "Unable to fetch files"})
  }
}

export async function removeFilesFn(req, res) {
  const body = req.body
  const children = await exploreTree(body.notesToRemove)
  console.log(children)

  children.forEach(async (fileId) => {
    const keek = await FileModel.find({
      _id: fileId

    })

    const kek = await FileModel.deleteMany({
      _id: fileId
    })
    console.log(keek)
    console.log(kek)
  })

  return
}

function generateRandomString(n) {
  let randomString           = '';
  let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for ( let i = 0; i < n; i++ ) {
    randomString += characters.charAt(Math.floor(Math.random()*characters.length));
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

    return res.status(201).send({ message: 'success' });

  } catch (err) {
    console.log(err);
    res.status(400).send({error: "internal error"})
  }
}



export async function editFileFn(req, res) {
  try {
    const {token, id, newName, newVisibility, options} = req.body
    jwt.verify(token, process.env.JWT_TOKEN)
    // TODO: validate file name & type
    // TODO: when generating file id, make sure it's not already used


    const updateObject = {name: newName}
    // TODO: check visibility is in a subset of valid values
    if (newVisibility != "" && newVisibility != null) {
      updateObject["defaultAccess"] = newVisibility
    }

    const result = await FileModel.findOneAndUpdate({
      "_id": ObjectId(id)
    }, updateObject)

    return res.status(201).send({ message: 'success' });

  } catch (err) {
    console.log(err);
    res.status(400).send({error: "internal error"})
  }
}