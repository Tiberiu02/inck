import { FileModel, NoteModel, UserModel } from "../db/Models.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { exploreTree } from "./FsTreeExplorer.js";
import { Request, Response } from "express";
import { DBUser } from "../BackendInterfaces.js";
import { Timer } from "../Timer.js";
import { logEvent } from "../logging/AppendAnalytics.js";

export enum NoteAccess {
  private = "private",
  readOnly = "read_only",
  readWrite = "readWrite",
}

// TODO: make cleaner once sure everything works
const VALID_VISIBILITIES = [NoteAccess.private, NoteAccess.readOnly, NoteAccess.readWrite];
export const NEW_FILES_NAME_LENGTH = 6;

export async function getAccountDetailsFromToken(req: Request, res: Response) {
  try {
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN as string) as JwtPayload;
    const userEntry: DBUser = await UserModel.findOne({ _id: token.userId });
    res.status(201).send({
      firstName: userEntry.firstName,
      lastName: userEntry.lastName,
      email: userEntry.email,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "Unable to fetch files" });
  }
}

/**
 * Potential errors w/ status:
 * 400: missing fields, invalid email
 * 409: user already exists
 */
export async function getFilesFn(req: Request, res: Response) {
  try {
    const timer = new Timer();
    const jwtToken = process.env.JWT_TOKEN as string;
    const token = jwt.verify(req.body.token, jwtToken) as JwtPayload;
    const files = await FileModel.find({ owner: token.userId });

    res.status(201).send({ files });
    logEvent("get_files_for_explorer", {
      userId: token.userId,
      filesCount: files.length,
      executionTime: timer.elapsed().toString(),
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "Unable to fetch files" });
  }
}

export async function getThrashedFilesFn(req: Request, res: Response) {
  try {
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN);
    // TODO: on first access, try to get notes without thrash time and set it to null for consistency
    const files = await FileModel.find({
      owner: token.userId,
      removalReqTime: { $ne: null },
    });

    console.log(files);
    res.status(201).send({ files });
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "Unable to fetch files" });
  }
}

function generateRandomString(n: number) {
  let randomString = "";
  let characters = "abcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < n; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomString;
}

export async function generateNewFileName(n: number) {
  let name = generateRandomString(n);

  let fileAlreadyExists = false;
  let noteAlreadyExists = false;
  do {
    const fileWithIdCount = await FileModel.count({
      fileId: name,
    });

    const noteWithIdCount = await NoteModel.count({
      id: name,
    });

    fileAlreadyExists = fileWithIdCount > 0;
    noteAlreadyExists = noteWithIdCount > 0;
  } while (fileAlreadyExists || noteAlreadyExists);
  return name;
}

export async function insertNewNoteInDB({
  type, // folder or note
  name,
  parentDir,
  owner,
  fileId,
  defaultAccess,
  backgroundType = "blank", // for now blank, pdf, in the future other things as well
  backgroundOptions = {},
}) {
  const filePromise = FileModel.create({
    type,
    name,
    parentDir,
    owner,
    fileId,
    defaultAccess,
  });

  const notePromise = NoteModel.create({
    id: fileId,
    isFreeNote: false,
    backgroundType,
    backgroundOptions,
    strokes: {},
  });

  await filePromise;
  await notePromise;
}

export async function createFileFn(req: Request, res: Response) {
  /**
   * Create authenticated note without pdf background
   */
  try {
    const timer = new Timer();
    if (req.body.type != "note" && req.body.type != "folder") {
      res.status(400).send({ error: "Invalid request" });
    }

    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN);
    const newFileId = await generateNewFileName(NEW_FILES_NAME_LENGTH);

    await insertNewNoteInDB({
      type: req.body.type,
      name: req.body.name,
      parentDir: req.body.parentDir,
      owner: token.userId,
      fileId: newFileId,
      defaultAccess: req.body.options && req.body.options.publicAccess,
    });

    const allFiles = await FileModel.find({
      owner: token.userId,
    });

    logEvent("create_auth_file", {
      userId: token.userId,
      fileId: newFileId,
      type: req.body.type,
      name: req.body.name,
      executionTime: timer.elapsed().toString(),
      pdf: "false",
    });
    return res.status(201).send({
      message: "success",
      files: allFiles,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "internal error" });
  }
}

export async function removeFilesFn(req: Request, res: Response) {
  try {
    const timer = new Timer();
    const { notesToRemove } = req.body;
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN);

    const children = await exploreTree(notesToRemove);
    for (let fileId of children) {
      // Delete file (explorer)
      const removed = await FileModel.findOneAndDelete({
        _id: fileId,
        owner: token.userId,
      });
      // Delete note (strokes data)
      if (removed.type == "note") {
        await NoteModel.deleteOne({
          id: removed.fileId,
          isFreeNote: false,
        });
      }
    }

    const allFiles = await FileModel.find({
      owner: token.userId,
    });
    logEvent("remove_files_from_explorer", {
      userId: token.userId,
      filesCount: allFiles.length,
      executionTime: timer.elapsed().toString(),
    });
    return res.status(201).send({
      message: "success",
      files: allFiles,
    });
  } catch (err) {
    res.status(400).send({ error: "Unable to fetch files" });
  }
}

export async function moveFilesFn(req: Request, res: Response) {
  try {
    const { notesToMove, target } = req.body;
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN);

    for (let idx = 0; idx < notesToMove.length; idx++) {
      const { type, _id } = notesToMove[idx];

      const update = await FileModel.updateOne(
        {
          _id: _id,
          owner: token.userId,
          type: type,
        },
        {
          parentDir: target,
        }
      );

      console.log(update);
    }

    const allFiles = await FileModel.find({
      owner: token.userId,
    });

    return res.status(201).send({
      message: "success",
      files: allFiles,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "Unable to fetch files" });
  }
}

export async function importFreeNote(req: Request, res: Response) {
  try {
    const { name, parentDir, visibility, freeNoteURL } = req.body;
    console.log(freeNoteURL);
    console.log(name);
    console.log(visibility);

    const wloc = freeNoteURL.match(/\/note\/([\w\d_]+)/);

    if (wloc == null || wloc.length != 2) {
      res.status(400).send({ error: "Unable to import free note: free note does not exist" });
    }
    const freeNoteId = wloc[1];

    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN);
    const newFileId = await generateNewFileName(NEW_FILES_NAME_LENGTH);

    // Get free note
    const freeNoteData = await NoteModel.findOne({
      id: freeNoteId,
      isFreeNote: true,
    });

    if (freeNoteData == null) {
      res.status(400).send({ error: "Unable to import free note: free note does not exist" });
    }

    // Make an auth copy of free note
    await NoteModel.create({
      id: newFileId,
      strokes: freeNoteData.strokes || [],
      isFreeNote: false,
    });
    // Create an explorer file
    await FileModel.create({
      type: "file",
      name: name,
      owner: token.userId,
      fileId: newFileId,
      parentDir: parentDir,
      defaultAccess: visibility,
    });

    const allFiles = await FileModel.find({
      owner: token.userId,
    });

    return res.status(201).send({
      message: "success",
      files: allFiles,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "Unable to import free note" });
  }
}

function validVisibility(visibility: NoteAccess) {
  return VALID_VISIBILITIES.includes(visibility);
}

export async function editFileFn(req: Request, res: Response) {
  try {
    const timer = new Timer();
    const { id, newName, newVisibility } = req.body;
    if (!validVisibility(newVisibility)) {
      console.log("Invalid request: visibility requested: " + newVisibility);
      res.status(400).send({ error: "Invalid request" });
      return;
    }

    if (newName.trim() == "") {
      console.log("Invalid new name: " + "'" + newName + "'");
      res.status(400).send({ error: "Invalid request" });
    }

    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN);

    const updateObject = {
      name: newName,
      defaultAccess: newVisibility,
    };

    await FileModel.findOneAndUpdate(
      {
        _id: ObjectId(id),
        owner: token.userId,
      },
      updateObject
    );

    const allFiles = await FileModel.find({
      owner: token.userId,
    });
    logEvent("edit_file_from_explorer", {
      user: token.userId,
      newName: newName,
      newVisibility: newVisibility,
      executionTime: timer.elapsed().toString(),
    });
    return res.status(201).send({
      message: "success",
      files: allFiles,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "internal error" });
  }
}
