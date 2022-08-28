import Cookies from "universal-cookie";

export const authCookieName = 'authToken'
const cookies = new Cookies()


export function getAuthToken() {
  return cookies.get(authCookieName);
}

export function setAuthToken(token) {
  cookies.set(
    authCookieName,
    token,
    {
      path: "/",
      withCredentials: true,
    }, // Allows the cookie to be accessible on all pages of the domain
  )
}

export function disconnect(reload = true) {
  cookies.remove(authCookieName)
  if (reload) {
    window.location.reload(false)
  }
}