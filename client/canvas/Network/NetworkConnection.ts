import { io } from "socket.io-client";
import { SerializedTool, MyTool } from "../Tooling/Tool";
import { View } from "../View/View";
import { authCookieName, getAuthToken, setAuthToken, disconnect } from "../../components/AuthToken";
import { Vector2D } from "../Math/V2";
import { Socket } from "socket.io-client";

export const SERVER_PORT = 8080;

export class NetworkConnection {
  private socket: Socket;
  private onConnect: () => void;
  private connected: boolean;
  private canWrite: boolean;

  constructor() {
    this.canWrite = false;

    const pathname = window.location.pathname;
    const wloc = pathname.match(/\/note\/([\w\d_]+)/);

    const docId = (wloc && wloc[1]) || "";

    this.socket = io(`${window.location.host.split(":")[0]}:${SERVER_PORT}`, {
      query: {
        authToken: getAuthToken(),
        docId: docId,
      },
    });

    this.socket.on("connect_error", err => {
      console.log(err.message);
      window.location.href = "/";
    });

    this.socket.on("load note", (data: any) => {
      this.canWrite = data.canWrite;
    });

    this.socket.on("unauthorized", async () => {
      this.close();
      window.location.href = "/";
    });

    this.onConnect = () => {};
    this.connected = false;

    this.socket.on("connect", () => {
      this.connected = true;
      console.log("Connected");
      this.onConnect();
    });

    window.addEventListener("pointermove", e => this.updatePointer(new Vector2D(...View.getCanvasCoords(e.x, e.y))));
  }

  emit(name: string, ...args: any[]) {
    if (this.connected) {
      this.socket.emit(name, ...args);
    } else {
      const onConnect = this.onConnect;
      this.onConnect = () => {
        onConnect();
        this.socket.emit(name, ...args);
      };
    }
  }

  on(name: string, handler: any) {
    this.socket.on(name, handler);
  }

  updatePointer(pointer: Vector2D) {
    this.socket.emit("remote control", "setPointer", pointer);
  }

  close() {
    this.connected = false;
    this.socket.disconnect();
  }

  updateCollab(method: string, ...args: any[]) {
    this.socket.emit("remote control", method, ...args);
  }

  updateCollabDirected(targetId: string, method: string, ...args: any[]) {
    this.socket.emit("directed remote control", targetId, method, ...args);
  }

  updateTool(method: string, ...args: any[]) {
    this.updateCollab("updateTool", method, ...args);
  }

  setTool(tool: SerializedTool, directedAtUserId?: string) {
    if (directedAtUserId) {
      this.updateCollabDirected(directedAtUserId, "setTool", tool);
    } else {
      this.updateCollab("setTool", tool);
    }
  }

  get writeAllowed() {
    return this.canWrite;
  }
}
