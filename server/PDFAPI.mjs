import _fs from "fs"
import crypto from "crypto"
import { generateNewFileName, insertNewNoteInDB, NEW_FILES_NAME_LENGTH } from "./FileExplorer.mjs"
import jwt from "jsonwebtoken";
import { FileModel, NoteModel } from "./Models.mjs";
import { join, dirname } from 'path';
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fs = _fs.promises

function hashFile(buffer) {
    const hashSum = crypto.createHash('sha256')
    hashSum.update(buffer)
    return hashSum.digest('hex')
}

export async function receivePDF(req, res) {
    try {
        const pdfData = req.files.file.data
        const { name, parentDir, defaultAccess } = req.body

        const newFileId = await generateNewFileName(NEW_FILES_NAME_LENGTH)
        const pdfDataHash = hashFile(pdfData)
        const pdfFileName = `${pdfDataHash}.pdf`
        const token = jwt.verify(req.body.token, process.env.JWT_TOKEN)

        const pdfPath = `server/pdfs/${pdfFileName}`
        const fsPromise = fs.writeFile(pdfPath, pdfData)


        const insertPromise = insertNewNoteInDB({
            type: "note",
            name: name,
            parentDir: parentDir,
            owner: token.userId,
            fileId: newFileId,
            defaultAccess: defaultAccess,
            backgroundType: "pdf",
            backgroundOptions: {
                fileHash: pdfDataHash
            }
        })

        await fsPromise
        await insertPromise

        const allFiles = await FileModel.find({
            owner: token.userId,
        })

        return res.status(201).send({
            status: 'success',
            files: allFiles,
        });



    } catch (err) {
        console.log(err)
        res.status(400).send({ error: "Unable to import pdf (454)" })
    }
}


export async function servePDF(req, res) {
    try {
        const { docId } = req.body
        const noteData = await NoteModel.findOne({
            id: docId
        })

        if (noteData === null) {
            return res.status(400).send({ error: "Unable to serve PDF (432)" })
        }

        let responseOptions = {
            status: "success",
            backgroundType: noteData.backgroundType
        }

        if (noteData.backgroundType == "pdf") {
            responseOptions.pdfURL = `/api/pdf/get-pdf/${noteData.backgroundOptions.fileHash}.pdf`
        }

        res.status(201).send(responseOptions)


    } catch (err) {
        console.log("Error while serving PDF:")
        console.log(err)
        res.status(400).send({ error: "Unable to serve PDF (999)" })
    }
}

export async function getPDF(req, res) {
    const pdfName = req.params.pdfName;
    res.sendFile(join(__dirname, `pdfs/${pdfName}.pdf`));
}