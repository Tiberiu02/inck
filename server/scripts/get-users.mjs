import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

import { UserModel } from "../server/Models.mjs";

async function main() {
  mongoose.connect(process.env.MONGO_URI);

  console.log("printing users:", UserModel);
  const users = (await UserModel.find({}, { email: 1, subscribedToNewsletter: 1 }))
    .map(u => u)
    .filter(u => u.email.includes("@epfl.ch"));

  console.log("found users", users.length);

  for (const user of users) {
    console.log(user.email);
  }
}

await main();
