import { ObjectId } from "mongodb";
import { Socket } from "socket.io";
import { NoteAccess } from "./api/FileExplorer";

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
  timestamp: number;
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
  grid = "grid",
  lines = "lines",
  cornell = "cornell",
}

export interface BackgroundOptions {
  fileHash?: string;
  spacing?: number;
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
  strokes: { [id: string]: Stroke };
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
  strokes: { [id: string]: Stroke };
  pdfUrl?: string;
  bgPattern?: BackgroundTypes;
  bgSpacing?: number;
  canWrite: boolean;
  creationDate: number;
}
