const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    email: { type: String, unique: true },
    phone: { type: String },
    activeAccount: { type: Boolean},  // Account is usable with email + phone validated
    registrationDate: {type: Date},
    password: { type: String },
    token: { type: String },
  });


/**
 * See https://mongoosejs.com/docs/api/model.html#model_Model
 * TL;DR: allows easier creationg + validation of mongoDB objects => clearer code
 */
const UserModel = mongoose.model("user", userSchema);



module.exports = {
    UserModel
}