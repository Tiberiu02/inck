import { resolve } from "path";

import * as TJS from "typescript-json-schema";

const path = "src/api/test.ts";
const typeName = "ApiSchema";

const isNumber = (val: any) => typeof val == "number";
const isString = (val: any) => typeof val == "string";

const refDefPref = "#/definitions/";

// optionally pass argument to schema generator
const settings: TJS.PartialArgs = {
  required: true,
};

// optionally pass ts compiler options
import { api } from "./api/test";

const compilerOptions: TJS.CompilerOptions = {
  strictNullChecks: true,
};

const program = TJS.getProgramFromFiles([resolve(path)], compilerOptions);
const schema = TJS.generateSchema(program, typeName, settings);

// console.log(JSON.stringify(schema, null, 2));

const tcApi = addTypeChecking(api, schema, schema.definitions);

try {
  console.log(tcApi.f(10, 200, 3000));
  // @ts-ignore
  console.log(tcApi.obj.prod(10, "123"));
} catch (e) {
  console.log(e);
}

function addTypeChecking<T extends any>(api: T, schema: TJS.Definition, defs: any): T {
  if (schema["$ref"]) {
    const ref = schema["$ref"] as string;
    if (!ref.startsWith(refDefPref)) {
      throw `Unknown ref: ${ref}`;
    }

    const def = ref.slice(refDefPref.length);
    if (!defs[def]) {
      throw `Unknown def: ${def}`;
    }

    return addTypeChecking(api, defs[def], defs);
  }

  if (typeof api == "function") {
    const argTypes = schema.properties.params as TJS.Definition;
    const argTypeChecks = (argTypes.items as TJS.Definition[]).map(typeCheckFactory);
    return ((...args: any[]) => {
      if (args.length < argTypes.minItems) {
        throw "Too few arguments";
      }

      if (args.length > argTypes.maxItems) {
        throw "Too many arguments";
      }

      for (let i = 0; i < args.length; i++) {
        if (!argTypeChecks[i](args[i])) {
          throw `Argument at position ${i} does not match type`;
        }
      }

      return api(...args);
    }) as T;
  } else if (typeof api == "object") {
    const typeChecked = {};
    for (const key of Object.keys(api)) {
      typeChecked[key] = addTypeChecking(api[key], schema.properties[key] as TJS.Definition, defs);
    }
    return typeChecked as T;
  } else {
    throw `Invalid API type (${typeof api}), api edpoints must be either objects or functions.`;
  }
}

// TODO: add objects & arrays
function typeCheckFactory(type: any): (val: any) => boolean {
  if (type.type == "number") {
    return isNumber;
  } else if (type.type == "string") {
    return isString;
  } else {
    throw `Unknown type ${type.type}`;
  }
}
