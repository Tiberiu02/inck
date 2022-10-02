import { AccessTypes, FileTypes } from "@inck/common-types/Files";

export type FileInfo = {
  _id: string;
  name: string;
  type: FileTypes;
};

export type FolderInfo = FileInfo & {
  type: FileTypes.FOLDER;
  children: FileInfo[];
};

export type NoteInfo = FileInfo & {
  type: FileTypes.NOTE;
  fileId: string;
  defaultAccess: AccessTypes;
};

export type FileTree = { [id: string]: FolderInfo | NoteInfo };
