import * as files from "./files.js";

export const API = {
  files: files,
};

// Check format (all handlers must be async functions)

type HandlerTree = ((...args: any) => Promise<any>) | { [name: string]: HandlerTree };
const formatCheck: HandlerTree = API;

// Update Skeleton (used by client code)

import fs from "fs";

function BuildSkeleton(obj: any) {
  if (typeof obj == "object") {
    const result: any = {};
    for (const key in obj) {
      result[key] = BuildSkeleton(obj[key]);
    }
    return result;
  } else {
    return 1;
  }
}

const skeleton = `// This file was generated automatically by the server code
export const ServerApiSkeleton = ${JSON.stringify(BuildSkeleton(API))};`;

const path = "../client/server-api-skeleton.js";
let change = false;

try {
  const oldSkeleton = fs.readFileSync(path).toString();
  if (skeleton != oldSkeleton) {
    change = true;
  }
} catch (e) {
  change = true;
}

if (change) {
  console.log("API change detected");
  fs.writeFileSync(path, skeleton);
  console.log("Updated API skeleton, please rebuild client");
  console.log("");
}
