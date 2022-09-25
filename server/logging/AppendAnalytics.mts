import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const replaceSpace = "###SPACE###";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function YYYYMMDD(date: Date, separator = "/") {
  return `${date.getFullYear()}${separator}${date.getMonth() + 1}${separator}${date.getDate()}`;
}

function HHMMSS(date: Date) {
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

function updateStream() {
  const now = new Date();
  const fname = `${loggingDirPath}/${YYYYMMDD(now, "-")}.log`;
  appendStream.close();
  appendStream = fs.createWriteStream(fname, { flags: "a" });
}

export function logEvent(eventName: string, parameters: { [id: string]: string }) {
  const now = new Date();

  let logString = YYYYMMDD(now);
  logString += "_";
  logString += HHMMSS(now);
  logString += " ";

  logString += eventName;
  for (const key in parameters) {
    let value = parameters[key].toString();
    value = value.replaceAll(" ", replaceSpace);
    logString += ` ${key}=${value}`;
  }

  logString += "\n";

  appendStream.write(logString);
}

// Executed on import
const loggingDirPath = __dirname + "/analytics";
if (!fs.existsSync(loggingDirPath)) {
  fs.mkdirSync(loggingDirPath);
}

const now = new Date();
const fname = `${loggingDirPath}/${YYYYMMDD(now, "-")}.log`;

let appendStream = fs.createWriteStream(fname, { flags: "a" });
updateStream();
setInterval(updateStream, 1000 * 60 * 30);
