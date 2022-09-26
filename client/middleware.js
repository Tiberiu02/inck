import { NextResponse } from "next/server";
import { authCookieName } from "./src/components/AuthToken";

function redirect(request, relativeDest) {
  const url = request.nextUrl.clone();
  url.pathname = relativeDest;
  return NextResponse.redirect(url);
}

const AUTH_PAGES = ["/explorer", "/settings"];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(authCookieName);

  if (pathname == "/auth" && token !== undefined) {
    return redirect(request, "explorer");
  } else if (AUTH_PAGES.includes(pathname) && token === undefined) {
    return redirect(request, "auth");
  }

  return NextResponse.next();
}
