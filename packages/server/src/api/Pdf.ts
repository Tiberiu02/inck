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
import AWS from "aws-sdk";

const S3 = new AWS.S3();
const PDF_LOCATION = "../user-data/pdfs";
const PDF_BUCKET = "inck-pdfs";

function hashFile(buffer) {
  const hashSum = crypto.createHash("sha256");
  hashSum.update(buffer);
  return hashSum.digest("hex");
}

function isDataPDF(buffer: Buffer) {
  return Buffer.isBuffer(buffer) && buffer.lastIndexOf("%PDF-") === 0 && buffer.lastIndexOf("%%EOF") > -1;
}

async function PDFExists(hash: string) {
  try {
    // Get header, not full object
    await S3.headObject({
      Bucket: PDF_BUCKET,
      Key: `${hash}.pdf`,
    }).promise();

    return true;
  } catch (err) {
    if (err.code == "NotFound") {
      return false;
    } else {
      throw err;
    }
  }
}

async function uploadPDF(body: Buffer, hash: string) {
  await S3.upload({
    Bucket: PDF_BUCKET,
    Key: `${hash}.pdf`,
    Body: body,
  }).promise();
}

export async function receivePDF(req: Request, res: Response) {
  try {
    const timer = new Timer();

    const user = jwt.verify(req.body.token, process.env.JWT_TOKEN) as JwtPayload;

    const pdfData: Buffer = (req.files.file as UploadedFile).data;
    if (!isDataPDF(pdfData)) {
      return res.status(409).send({ status: "error", message: "Invalid file content" });
    }

    const pdfDataHash = hashFile(pdfData);
    const fileExists = await PDFExists(pdfDataHash);
    if (!fileExists) {
      console.log("upload pdf:");
      await uploadPDF(pdfData, pdfDataHash);
    } else {
      console.log("pdf already exists");
    }

    res.status(201).send({
      status: "success",
      fileHash: pdfDataHash,
    });

    logEvent("pdf_upload", {
      executionTime: timer.elapsed(),
      userId: user.userId,
      pdfDataHash,
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
