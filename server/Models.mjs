import { ObjectId } from 'mongodb';
import mongoose from 'mongoose'

const Mixed = mongoose.Schema.Types.Mixed;

const userSchema = new mongoose.Schema({
  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  email: { type: String, unique: true },
  phone: { type: String },
  activeAccount: { type: Boolean },  // Account is usable with email
  premiumTier: { type: String, default: "free" },
  registrationDate: { type: Date },
  password: { type: String },
  token: { type: String },
  subscribedToNewsletter: { type: Boolean, default: true }
});


const noteSchema = new mongoose.Schema({
  id: { type: String },  // URL identifier
  strokes: { type: Array, default: [] },
  creationDate: { type: Date, default: Date.now() },
  isFreeNote: { type: Boolean, default: true }
})


const fileSchema = new mongoose.Schema({
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
  specialAccesses: { type: Mixed, default: {} },  // Dictionary of user: accessRights
  removalReqTime: { type: Date, default: null }
});


const passwordResetSchema = new mongoose.Schema({
  userId: { type: ObjectId, required: true },
  email: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // Expires after an hour
  },
  resetToken: { type: String }
})


/**
 * See https://mongoosejs.com/docs/api/model.html#model_Model
 * TL;DR: allows easier creationg + validation of mongoDB objects => clearer code
 */

export const UserModel = mongoose.model("user", userSchema);
export const FileModel = mongoose.model('file', fileSchema);
export const NoteModel = mongoose.model('note', noteSchema)
export const PasswordResetModel = mongoose.model("password-reset", passwordResetSchema)
