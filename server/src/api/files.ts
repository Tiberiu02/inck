import { Timer } from "../Timer.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import { FileModel, NoteModel, UserModel } from "../db/Models.js";
import { logEvent } from "../logging/AppendAnalytics.js";

import { FileTypes, AccessTypes } from "../../common-types/Files.js";
import { BackgroundOptions, BackgroundTypes } from "../../common-types/Notes.js";

function parseAuthToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_TOKEN as string) as JwtPayload;
}

// Get files for the file explorer

export async function getFiles(authToken: string) {
  const timer = new Timer();
  const user = parseAuthToken(authToken);
  const files = (await FileModel.find({ owner: user.userId })).map((f) => f.toObject());

  logEvent("get_files_for_explorer", {
    userId: user.userId,
    filesCount: files.length,
    executionTime: timer.elapsed().toString(),
  });

  return files;
}

// Create a new note

type NoteOptions = {
  name: string;
  parentFolderId: string;
  publicAccess: AccessTypes;
  backgroundType: BackgroundTypes;
  backgroundOptions?: BackgroundOptions;
};

export async function createNote(authToken: string, options: NoteOptions): Promise<void> {
  const user = parseAuthToken(authToken);

  const noteId = await generateNoteId();

  const createFile = FileModel.create({
    type: FileTypes.NOTE,
    name: options.name,
    parentDir: options.parentFolderId,
    owner: user.userId,
    fileId: noteId,
    defaultAccess: options.publicAccess,
  });

  const createNote = NoteModel.create({
    id: noteId,
    isFreeNote: false,
    backgroundType: options.backgroundType,
    backgroundOptions: options.backgroundOptions,
    strokes: {},
  });

  await Promise.all([createFile, createNote]);
}

async function generateNoteId(): Promise<string> {
  const NOTE_ID_LEN = 6;

  const id = Array(NOTE_ID_LEN).fill(0).map(randomUppercaseLetter).join("");

  const notesWithId = await NoteModel.count({
    id: id,
  });

  return !notesWithId ? id : await generateNoteId();
}

async function generateFileId(): Promise<string> {
  const FILE_ID_LEN = 10;

  const id = Array(FILE_ID_LEN).fill(0).map(randomAlphaNumeric).join("");

  const filesWithId = await FileModel.count({
    fileId: id,
  });

  return !filesWithId ? id : await generateFileId();
}

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomUppercaseLetter = () => String.fromCharCode(randInt(65, 90));
const randomAlphaNumeric = () => Math.random().toString(36).charAt(2);
