import { Socket } from "socket.io";

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

export enum BakcgroundTypes {
  blank = "blank",
}

export interface backgroundOptions {
  fileash?: string
}

export interface DBUser {
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
  backgroundType: BakcgroundTypes;
  backgroundOptions: 
}

export interface DBFile {}

export interface DBPasswordReset {}
