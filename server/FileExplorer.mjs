import { FileModel } from "./Models.mjs";
import jwt from "jsonwebtoken";

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
    console.log(files)
    res.status(201).send({ files });

  } catch (err) {
    console.log(err);
    res.status(400).send({error: "Unable to fetch files"})
  }
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
      publicAccess: req.options && req.options.publicAccess
    });

    return res.status(201).send({ message: 'success' });

  } catch (err) {
    console.log(err);
    res.status(400).send({error: "internal error"})
  }
}