// import { io, Socket } from "socket.io-client";

importScripts("https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.5.3/socket.io.js");

const CONNECT_EVENT_NAME = "connect-web-worker";

let socket;

addEventListener("message", (event) => {
  if (!Array.isArray(event.data)) return;

  const name = event.data[0];
  const args = event.data.slice(1);

  if (name === CONNECT_EVENT_NAME) {
    console.log(args);
    const [hostURL, authToken, docId] = args;
    socket = io(hostURL, { query: { authToken, docId } });
    socket.onAny((...args) => {
      postMessage(args);
    });

    postMessage([event.data, 123]);
  } else {
    socket.emit(name, ...args);
  }
});
