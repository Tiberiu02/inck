import { io } from "socket.io-client";
import { Tool } from "../Tooling/Tool";
import { View } from "../View/View";
import { authCookieName, getAuthToken, setAuthToken, disconnect } from "../../components/AuthToken.js";
import { Vector2D } from "../Math/V2";

const SERVER_PORT = 8080;

export class NetworkConnection {
  private socket: any;
  private onConnect: () => void;
  private connected: boolean;
  private canWrite: boolean;

  constructor() {
    const pathname = window.location.pathname;
    const authWloc = pathname.match(/\/auth-note\/([\w\d_]+)/);

    const isAuth = (authWloc && authWloc[1].trim() != "") || false;
    this.canWrite = false;
    this.socket = io(`${window.location.host.split(":")[0]}:${SERVER_PORT}`, {
      query: {
        authToken: getAuthToken(),
        isAuthSocket: isAuth,
      },
    });

    this.socket.on("connect_error", err => {
      console.log(err.message);
      window.location.href = "/";
    });

    this.socket.on("can write", (canWrite: boolean) => {
      this.canWrite = canWrite;
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
    this.socket.emit("update pointer", pointer);
  }

  updateInput(x: number, y: number, p: number, t: number) {
    this.socket.emit("update input", x, y, p, t);
  }

  updateTool(tool: Tool) {
    this.socket.emit("update tool", tool ? tool.serialize() : undefined);
  }

  close() {
    this.connected = false;
    this.socket.disconnect(true);
  }

  writeAllowed() {
    return this.canWrite;
  }
}
