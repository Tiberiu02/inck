import { Timer } from "../Timer.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import { FileModel, NoteModel, UserModel } from "../db/Models.js";
import { logEvent } from "../logging/AppendAnalytics.js";

export async function getFiles(authToken: string) {
  const timer = new Timer();
  const secred = process.env.JWT_TOKEN as string;
  const token = jwt.verify(authToken, secred) as JwtPayload;
  const files = (await FileModel.find({ owner: token.userId })).map((f) => f.toObject());

  logEvent("get_files_for_explorer", {
    userId: token.userId,
    filesCount: files.length,
    executionTime: timer.elapsed().toString(),
  });

  return files;
}
