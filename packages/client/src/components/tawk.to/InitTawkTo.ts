import jwt from "jsonwebtoken";
import { getAuthToken } from "../AuthToken";

export async function InitTawkTo() {
  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();

  const token: any = jwt.decode(getAuthToken());
  const email: string = token.email;
  const name = email
    .split("@")[0]
    .replaceAll(".", " ")
    .toLowerCase()
    .replace(/(^.|\s+.)/g, (m) => m.toUpperCase());

  window.Tawk_API.visitor = {
    name,
    email,
    hash: "hash-value",
  };

  let s1 = document.createElement("script");
  s1.async = true;
  s1.src = "https://embed.tawk.to/632ee39854f06e12d89699a8/1gdnii3gf";
  s1.charset = "UTF-8";
  s1.setAttribute("crossorigin", "*");
  document.body.append(s1);
}
