import { ObjectId } from 'mongodb';
import mongoose from 'mongoose'

const Mixed = mongoose.Schema.Types.Mixed;

const userSchema = new mongoose.Schema({
  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  email: { type: String, unique: true },
  phone: { type: String },
  activeAccount: { type: Boolean },  // Account is usable with email + phone validated
  registrationDate: {type: Date },
  password: { type: String },
  token: { type: String },
});


/**
 * See https://mongoosejs.com/docs/api/model.html#model_Model
 * TL;DR: allows easier creationg + validation of mongoDB objects => clearer code
 */
 export const UserModel = mongoose.model("user", userSchema);



const fileSchema = new mongoose.Schema({
  type: { type: String }, // 'file' | 'folder'
  name: { type: String },
  owner: { type: ObjectId },
  fileId: { type: String, default: null }, // only for files
  parentDir: { type: Mixed },
  publicAccess: { type: String }
});

export const FileModel = mongoose.model('file', fileSchema);