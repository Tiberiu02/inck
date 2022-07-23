import { NextResponse } from "next/server";
import { authCookieName } from "./components/AuthToken";

function redirect(request, relativeDest) {
  const url = request.nextUrl.clone();
  url.pathname = relativeDest;
  return NextResponse.redirect(url);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies[authCookieName];

  if (pathname == "/auth" && token !== undefined) {
    return redirect(request, "explorer");
  } else if (pathname == "/explorer" && token === undefined) {
    return redirect(request, "auth");
  }

  return NextResponse.next();
}
