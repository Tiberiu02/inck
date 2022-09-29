import { Timer } from "../Timer";
import jwt, { JwtPayload } from "jsonwebtoken";
import { FileModel, NoteModel } from "../db/Models";
import { logEvent } from "../logging/AppendAnalytics";

import { FileTypes, AccessTypes } from "../../../common-types/Files";
import { BackgroundOptions, BackgroundTypes } from "../../../common-types/Notes";

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

export async function deleteFiles(authToken: string, rootFileIds: string[]) {
  const user = parseAuthToken(authToken);

  const fileIds = [];
  const noteIds = [];

  await exploreTree(rootFileIds, (file) => {
    if (file.owner != user.userId) {
      throw new Error("Unauthorized");
    }

    fileIds.push(file._id);
    if (file.type == FileTypes.NOTE) {
      noteIds.push(file.fileId);
    }
  });

  await FileModel.deleteMany({
    _id: {
      $in: fileIds,
    },
    owner: user.userId,
  });

  await NoteModel.deleteMany({
    id: {
      $in: noteIds,
    },
  });
}

export async function exploreTree(roots: string[], callback): Promise<void> {
  await Promise.all(
    roots.map(async (fileId) => {
      const file = await FileModel.findOne({ _id: fileId });
      if (file.type == FileTypes.FOLDER) {
        const children = await FileModel.find({
          parentDir: fileId,
        });
        await exploreTree(
          children.map((f) => f._id.toString() as string),
          callback
        );
      }
      await callback(file.toObject());
    })
  );
}

export async function moveFiles(authToken: string, fileIds: string[], targetId: string) {
  const user = parseAuthToken(authToken);

  await FileModel.updateMany(
    {
      _id: {
        $in: fileIds,
      },
      owner: user.userId,
    },
    {
      $set: {
        parentDir: targetId,
      },
    }
  );
}

// Create a new note

type NoteOptions = {
  name: string;
  publicAccess: AccessTypes;
  backgroundType: BackgroundTypes;
  backgroundOptions?: BackgroundOptions;
};

export async function createNote(authToken: string, parentFolderId: string, options: NoteOptions): Promise<void> {
  const user = parseAuthToken(authToken);

  const noteId = await generateNoteId();

  const createFile = FileModel.create({
    type: FileTypes.NOTE,
    name: options.name,
    parentDir: parentFolderId,
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

export async function editNoteInfo(authToken: string, noteFileId: string, newOptions: NoteOptions) {
  const user = parseAuthToken(authToken);

  const note = await FileModel.findOne({ _id: noteFileId });

  if (!note) {
    throw new Error("Note not found");
  }

  if (note.owner != user.userId) {
    throw new Error("Unauthorized");
  }

  console.log(newOptions);

  note.name = newOptions.name;
  note.defaultAccess = newOptions.publicAccess;
  note.backgroundType = newOptions.backgroundType;
  note.backgroundOptions = newOptions.backgroundOptions;

  await note.save();
}

async function generateNoteId(): Promise<string> {
  const NOTE_ID_LEN = 6;

  const id = Array(NOTE_ID_LEN).fill(0).map(randomUppercaseLetter).join("");

  const notesWithId = await NoteModel.count({
    id: id,
  });

  return !notesWithId ? id : await generateNoteId();
}

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomUppercaseLetter = () => String.fromCharCode(randInt(65, 90));

// Create a new folder

type FolderOptions = {
  name: string;
};

export async function createFolder(authToken: string, parentFolderId: string, options: FolderOptions): Promise<void> {
  const user = parseAuthToken(authToken);

  await FileModel.create({
    type: FileTypes.FOLDER,
    name: options.name,
    parentDir: parentFolderId,
    owner: user.userId,
  });
}

export async function editFolderInfo(authToken: string, folderFileId: string, newOptions: FolderOptions) {
  const user = parseAuthToken(authToken);

  const folder = await FileModel.findOne({ _id: folderFileId });

  if (!folder) {
    throw new Error("Folder not found");
  }

  if (folder.owner != user.userId) {
    throw new Error("Unauthorized");
  }

  folder.name = newOptions.name;

  await folder.save();
}
