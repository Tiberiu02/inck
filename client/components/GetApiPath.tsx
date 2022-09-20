export default function GetApiPath(path) {
  if (window) {
    return `${window.location.protocol}//${window.location.hostname}:8080${path}`;
  }
}

export async function postFetchAPI(apiPath, payload) {
  const response = await fetch(GetApiPath(apiPath), {
    method: "post",
    body: JSON.stringify(payload),
    headers: {
      "Content-type": "application/json;charset=UTF-8",
    },
  });

  const json = await response.json();
  return json;
}
