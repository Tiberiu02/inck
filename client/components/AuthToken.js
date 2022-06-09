import Cookies from "universal-cookie";

export const authCookieName = 'authToken'

export function GetAuthToken() {
  const cookies = new Cookies();
  return cookies.get(authCookieName);
}

export function SetAuthToken(token) {
  const cookies = new Cookies()
  cookies.set(
    authCookieName,
    token,
    {
      path: "/",
      withCredentials: true,
    }, // Allows the cookie to be accessible on all pages of the domain
  )
}