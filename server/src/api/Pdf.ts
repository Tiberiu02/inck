import _fs from "fs";
import crypto from "crypto";
import { generateNewFileName, insertNewNoteInDB, NEW_FILES_NAME_LENGTH } from "./FileExplorer.js";
import jwt from "jsonwebtoken";
import { FileModel, NoteModel } from "../db/Models.js";
import { Request, Response } from "express";
import { Timer } from "../Timer.js";
import { logEvent } from "../logging/AppendAnalytics.js";

const PDF_LOCATION = "user-data/pdfs";

const fs = _fs.promises;

function hashFile(buffer) {
  const hashSum = crypto.createHash("sha256");
  hashSum.update(buffer);
  return hashSum.digest("hex");
}

export async function receivePDF(req: Request, res: Response) {
  try {
    const timer = new Timer();
    const pdfData = req.files.file.data;
    const { name, parentDir, defaultAccess } = req.body;

    const newFileId = await generateNewFileName(NEW_FILES_NAME_LENGTH);
    const pdfDataHash = hashFile(pdfData);
    const pdfFileName = `${pdfDataHash}.pdf`;
    const token = jwt.verify(req.body.token, process.env.JWT_TOKEN);

    const pdfPath = `${PDF_LOCATION}/${pdfFileName}`;
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
    logEvent("create_auth_file", {
      userId: token.userId,
      fileId: newFileId,
      type: "note",
      name,
      executionTime: timer.elapsed().toString(),
      pdf: "true",
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

export async function getPDF(req: Request, res: Response) {
  try {
    const timer = new Timer();
    const pdfName = req.params.pdfName;
    res.sendFile(`${PDF_LOCATION}/${pdfName}.pdf`, { root: "." });
    logEvent("serving_pdf_file", {
      pdfName,
      executionTime: timer.elapsed().toString(),
    });
  } catch (err) {
    console.error(err);
  }
}