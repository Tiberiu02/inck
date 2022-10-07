import { io } from "socket.io-client";
import { SerializedGraphic } from "../../canvas/Drawing/Graphic";
import { SERVER_PORT } from "../../canvas/Network/NetworkConnection";
import { LocalStorage } from "../../LocalStorage";
import { getAuthToken } from "../AuthToken";

export function SyncNote(noteId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = io(`${window.location.host.split(":")[0]}:${SERVER_PORT}`, {
      query: {
        authToken: getAuthToken(),
        docId: noteId,
      },
    });

    socket.on("load note", (data: any) => {
      const cachedStrokes = LocalStorage.loadCachedNote(noteId) as { [id: string]: SerializedGraphic };

      const receivedStrokes = data.strokes as { [id: string]: SerializedGraphic };

      const newStrokes = Object.values(cachedStrokes).filter(
        (stroke) =>
          stroke.timestamp > data.creationDate &&
          (!receivedStrokes[stroke.id] || receivedStrokes[stroke.id].timestamp < cachedStrokes[stroke.id].timestamp)
      );

      socket.emit("sync strokes", newStrokes);
      socket.on("sync complete", () => {
        console.log("Synced note", noteId);
        LocalStorage.removeCachedNote(noteId);
        socket.disconnect();
        resolve();
      });
    });

    socket.on("unauthorized", () => {
      console.log("Unauthorized", noteId);
      LocalStorage.removeCachedNote(noteId);
      socket.disconnect();
      resolve();
    });

    socket.on("disconnect", () => {
      socket.disconnect();
      resolve();
    });
  });
}
