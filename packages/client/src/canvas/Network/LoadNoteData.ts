import { io } from "socket.io-client";
import { getAuthToken } from "../../components/AuthToken";
import { SERVER_PORT } from "./NetworkConnection";

export function LoadNoteData(noteId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const socket = io(`${window.location.host.split(":")[0]}:${SERVER_PORT}`, {
      query: {
        authToken: getAuthToken(),
        docId: noteId,
      },
    });

    socket.on("load note", (data: any) => {
      socket.disconnect();
      resolve(data);
    });
  });
}
