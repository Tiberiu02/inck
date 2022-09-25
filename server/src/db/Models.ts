import { ObjectId } from "mongodb";
import mongoose, { Schema, Model } from "mongoose";

const Mixed = mongoose.Schema.Types.Mixed;

const userSchema: Schema = new mongoose.Schema({
  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  email: { type: String, unique: true },
  phone: { type: String },
  activeAccount: { type: Boolean }, // Account is usable with email
  premiumTier: { type: String, default: "free" },
  registrationDate: { type: Date },
  password: { type: String },
  token: { type: String },
  subscribedToNewsletter: { type: Boolean, default: true },
});

const noteSchema: Schema = new mongoose.Schema({
  id: { type: String }, // URL identifier
  strokes: { type: Array, default: [] },
  creationDate: { type: Date, default: Date.now() },
  isFreeNote: { type: Boolean, default: true },
  backgroundType: { type: String, default: "blank" },
  backgroundOptions: { type: Object, default: {} },
  /*
   * Options:
   * fileHash: hash of pdf file to request (used as url in frontend)
   */
});

const fileSchema: Schema = new mongoose.Schema({
  type: { type: String }, // 'file' | 'folder'
  name: { type: String },
  owner: { type: ObjectId },
  fileId: { type: String, default: null }, // only for files
  parentDir: { type: Mixed },
  /**
   * DefaultAccess possible values:
   * private: only owner can read/write
   * read: Only owner can write, everyone can read
   * write: Everyone can read and write
   * */
  defaultAccess: { type: String, default: "private" },
  specialAccesses: { type: Mixed, default: {} }, // Dictionary of user: accessRights
  removalReqTime: { type: Date, default: null },
});

const passwordResetSchema: Schema = new mongoose.Schema({
  userId: { type: ObjectId, required: true },
  email: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // Expires after an hour
  },
  resetToken: { type: String },
});

/**
 * See https://mongoosejs.com/docs/api/model.html#model_Model
 * TL;DR: allows easier creationg + validation of mongoDB objects => clearer code
 */
// TODO: check how to type it better
export const UserModel: Model = mongoose.model("user", userSchema);
export const FileModel: Model = mongoose.model("file", fileSchema);
export const NoteModel: Model = mongoose.model("note", noteSchema);
export const PasswordResetModel: Model = mongoose.model("password-reset", passwordResetSchema);
