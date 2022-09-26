import fs from "fs";

const replaceSpace = "###SPACE###";

const OUTPUT_LOCATION = "../user-data/analytics";

function YYYYMMDD(date: Date, separator = "/") {
  return `${date.getFullYear()}${separator}${date.getMonth() + 1}${separator}${date.getDate()}`;
}

function HHMMSS(date: Date) {
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

function updateStream() {
  const now = new Date();
  const fname = `${OUTPUT_LOCATION}/${YYYYMMDD(now, "-")}.log`;
  appendStream.close();
  appendStream = fs.createWriteStream(fname, { flags: "a" });
}

export function logEvent(eventName: string, parameters: { [id: string]: any }) {
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
if (!fs.existsSync(OUTPUT_LOCATION)) {
  fs.mkdirSync(OUTPUT_LOCATION);
}

const now = new Date();
const fname = `${OUTPUT_LOCATION}/${YYYYMMDD(now, "-")}.log`;

let appendStream = fs.createWriteStream(fname, { flags: "a" });
updateStream();
setInterval(updateStream, 1000 * 60 * 30);
