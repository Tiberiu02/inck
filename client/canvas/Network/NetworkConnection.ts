import { io } from "socket.io-client";
import { Tool } from "../Tooling/Tool";
import { Vector2D } from "../types";
import { View } from "../View/View";

const SERVER_PORT = 8080;

export class NetworkConnection {
  private socket: any;
  private onConnect: () => void;
  private connected: boolean;

  constructor() {
    this.socket = io(`${window.location.host.split(":")[0]}:${SERVER_PORT}`);

    this.onConnect = () => {};
    this.connected = false;

    this.socket.on("connect", () => {
      this.connected = true;
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
}
