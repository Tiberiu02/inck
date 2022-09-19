import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

import { UserModel } from "../db/Models.mjs";

const EMAIL = "tiberiu.musat123@epfl.ch";

async function main() {
  mongoose.connect(process.env.MONGO_URI);

  console.log("deleting", EMAIL);
  await UserModel.remove({ email: EMAIL });
  console.log("deleted", EMAIL);
}

await main();
