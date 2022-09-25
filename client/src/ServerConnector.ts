import { API } from "../../server/src/api/index";
import { ServerApiSkeleton } from "../server-api-skeleton";

function GetApiPath(path) {
  if (window) {
    return `${window.location.protocol}//${window.location.hostname}:8080${path}`;
  }
}

function BuildApiConnector(api: any, path: string) {
  if (typeof api == "object") {
    const connector = {};
    for (const endpoint in api) {
      connector[endpoint] = BuildApiConnector(api[endpoint], `${path}/${endpoint}`);
    }
    return connector;
  } else {
    return async (...args: any[]) => {
      console.log("server request", path, args);

      const response = await fetch(GetApiPath(path), {
        method: "post",
        body: JSON.stringify(args),
        headers: {
          "Content-type": "application/json;charset=UTF-8",
        },
      });

      const json = await response.json();

      if (json.result) {
        return json.result;
      } else if (json.error) {
        throw new Error(json.error);
      } else {
        throw new Error("Connection to the server api failed, invalid response.");
      }
    };
  }
}

export const AppServer = BuildApiConnector(ServerApiSkeleton, "/api") as typeof API;
