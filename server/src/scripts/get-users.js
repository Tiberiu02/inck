import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

const userSchema = new mongoose.Schema({
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

UserModel = mongoose.model("user", userSchema);

async function main() {
  mongoose.connect(process.env.MONGO_URI);

  console.log("printing users:", UserModel);
  const users = (await UserModel.find({}, { email: 1, subscribedToNewsletter: 1 }))
    .map((u) => u)
    .filter((u) => u.email.includes("@epfl.ch"));

  console.log("found users", users.length);

  for (const user of users) {
    console.log(user.email);
  }
}

await main();
