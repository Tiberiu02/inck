export default function GetApiPath(path) {
  if (window)
    return `${window.location.protocol}//${window.location.hostname}:8080${path}`
}