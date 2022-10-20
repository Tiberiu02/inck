import fs from "fs";
import crypto from "crypto";
import { generateNewFileName, insertNewNoteInDB, NEW_FILES_NAME_LENGTH } from "./FileExplorer";
import jwt, { JwtPayload } from "jsonwebtoken";
import { FileModel, NoteModel } from "../db/Models";
import { Request, Response } from "express";
import { Timer } from "../Timer";
import { logEvent } from "../logging/AppendAnalytics";
import path from "path";
import { UploadedFile } from "express-fileupload";

const PDF_LOCATION = "../user-data/pdfs";

function hashFile(buffer) {
  const hashSum = crypto.createHash("sha256");
  hashSum.update(buffer);
  return hashSum.digest("hex");
}

export async function receivePDF(req: Request, res: Response) {
  try {
    const user = jwt.verify(req.body.token, process.env.JWT_TOKEN) as JwtPayload;

    const pdfData = (req.files.file as UploadedFile).data;

    const pdfDataHash = hashFile(pdfData);
    const pdfFileName = `${pdfDataHash}.pdf`;

    const pdfPath = path.resolve(PDF_LOCATION, pdfFileName);
    fs.writeFileSync(pdfPath, pdfData);

    logEvent("pdf_upload", { user: user.email, hash: pdfDataHash, userId: user.userId });

    return res.status(201).send({
      status: "success",
      fileHash: pdfDataHash,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: err.message });
  }
}

export async function getPDF(req: Request, res: Response) {
  try {
    const pdfName = req.params.pdfName + ".pdf";
    const pdfPath = path.resolve(PDF_LOCATION, pdfName);

    logEvent("serving_pdf_file", {
      pdfName,
    });

    res.sendFile(pdfPath);
  } catch (err) {
    console.error(err);
  }
}
