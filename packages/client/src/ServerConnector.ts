import type { ApiInterface } from "@inck/server/src/api/index";

async function ApiFetch(path: string, args: any[]) {
  const url = `${window.location.protocol}//${window.location.hostname}:8080${path}`;

  const response = await fetch(url, {
    method: "post",
    body: JSON.stringify(args),
    headers: {
      "Content-type": "application/json;charset=UTF-8",
    },
  });

  const json = await response.json();

  if (response.ok) {
    return json.result;
  } else if (json.error) {
    throw new Error(json.error);
  } else {
    throw new Error("Connection to the server api failed, invalid response.");
  }
}

function BuildApiConnector(path: string) {
  return new Proxy((...args: any[]) => ApiFetch(path, args), {
    get(_obj, endpoint) {
      if (typeof endpoint !== "string" || endpoint === "then") {
        // special case for if the proxy is accidentally treated
        // like a PromiseLike (like in `Promise.resolve(proxy)`)
        return undefined;
      }
      const x = BuildApiConnector(`${path}/${endpoint}`);
      return x;
    },
  });
}

type PromiseWrapper<T extends any> = T extends Promise<infer I> ? T : Promise<T>;
type AsyncWrapper<T> = T extends (...args: any) => any
  ? (...args: Parameters<T>) => PromiseWrapper<ReturnType<T>>
  : {
      [key in keyof T]: AsyncWrapper<T[key]>;
    };

export const HttpServer = BuildApiConnector("/api") as AsyncWrapper<ApiInterface>;
