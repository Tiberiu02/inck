import { AccessTypes, FileTypes } from "@inck/common-types/Files";
import { BackgroundOptions, BackgroundTypes } from "@inck/common-types/Notes";

// Types used in explorer
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
  backgroundType: BackgroundTypes;
  backgroundOptions?: BackgroundOptions;
};

export type FileTree = { [id: string]: FolderInfo | NoteInfo };
