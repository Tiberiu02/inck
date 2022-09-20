import _fs from "fs";
import crypto from "crypto";
import { generateNewFileName, insertNewNoteInDB, NEW_FILES_NAME_LENGTH } from "./FileExplorer.mjs";
import jwt from "jsonwebtoken";
import { FileModel, NoteModel } from "../db/Models.mjs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fs = _fs.promises;

function hashFile(buffer) {
  const hashSum = crypto.createHash("sha256");
  hashSum.update(buffer);
  return hashSum.digest("hex");
}

export async function receivePDF(req, res) {
  try {
    const pdfData = req.files.file.data;
    const { name, parentDir, defaultAccess } = req.body;

    const newFileId = await generateNewFileName(NEW_FILES_NAME_LENGTH);
    const pdfDataHash = hashFile(pdfData);
    const pdfFileName = `${pdfDataHash}.pdf`;
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN);

    const pdfPath = `user-data/pdfs/${pdfFileName}`;
    const fsPromise = fs.writeFile(pdfPath, pdfData);

    const insertPromise = insertNewNoteInDB({
      type: "note",
      name: name,
      parentDir: parentDir,
      owner: token.userId,
      fileId: newFileId,
      defaultAccess: defaultAccess,
      backgroundType: "pdf",
      backgroundOptions: {
        fileHash: pdfDataHash,
      },
    });

    await fsPromise;
    await insertPromise;

    const allFiles = await FileModel.find({
      owner: token.userId,
    });

    return res.status(201).send({
      status: "success",
      files: allFiles,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "Unable to import pdf (454)" });
  }
}

export async function getPDF(req, res) {
  const pdfName = req.params.pdfName;
  res.sendFile(join(__dirname, `../../user-data/pdfs/${pdfName}.pdf`));
}
