import { ObjectId } from "mongodb";
import { Socket } from "socket.io";
import { NoteAccess } from "./api/FileExplorer.mjs";

export interface DrawingUser {
  ip: string;
  id: string;
  docId?: string;
  canWrite: boolean;
  authToken: string;
  socket: Socket;
}

export interface DrawnDocument {
  users: DrawingUser[];
}

export interface Stroke {
  id: string;
  deserializer: string;
  zIndex: number;
  width: number;
  color: number[];
  data: number[];
}

export interface JwtPayload {
  userId?: string;
}

export enum UserPremiumTier {
  free = "free",
}

export enum BackgroundTypes {
  blank = "blank",
  pdf = "pdf",
}

export interface BackgroundOptions {
  fileHash?: string;
}

export enum FileType {
  file = "file",
  folder = "folder",
}

export interface DBUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  activeAccount: boolean;
  premiumTier: UserPremiumTier;
  registrationDate: Date;
  password: string;
  token: string;
  subscribedToNewsletter: true;
}

export interface DBNote {
  id: string;
  strokes: Stroke[];
  creationDate: Date;
  isFreeNote: Boolean;
  backgroundType: BackgroundTypes;
  backgroundOptions: BackgroundOptions;
}

export interface DBFile {
  type: FileType.file | FileType.folder;
  name: string;
  owner: ObjectId;
  fileId?: String;
  parentDir: "f/notes" | string;
  defaultAccess: NoteAccess;
}

export interface DBPasswordReset {
  userId: ObjectId;
  email: String;
  createdAt: Date;
  resetToken: String;
}

export interface FrontEndNoteData {
  id: string;
  strokes: Stroke[];
  pdfUrl?: string;
  canWrite: boolean;
}
