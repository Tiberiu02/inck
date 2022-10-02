export enum FileTypes {
  NOTE = "note",
  FOLDER = "folder",
}

export enum AccessTypes {
  NONE = "private",
  VIEW = "read_only",
  EDIT = "read_write",
}

export type FolderData = {
  _id: string;
  type: FileTypes;
  name: string;
  parentDir: string;
};

export type NoteData = {
  _id: string;
  type: FileTypes;
  name: string;
  parentDir: string;
  owner: string;
  fileId: string;
  defaultAccess: AccessTypes;
};

export type FileData = FolderData & NoteData;
