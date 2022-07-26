import { io } from "socket.io-client";
import { Tool } from "../Tools/Tool";
import { Vector2D } from "../types";

const SERVER_PORT = 8080;

type Collaborator = { pointer?: Vector2D; activeStroke?: Tool; el?: HTMLElement; id: string };

export class NetworkConnection {
  private socket: any;
  private collabs: { [id: number]: Collaborator };
  private requestRerender: () => void;
  private onConnect: () => void;
  private connected: boolean;

  constructor(requestRerender: () => void) {
    this.requestRerender = requestRerender;
    this.socket = io(`${window.location.host.split(":")[0]}:${SERVER_PORT}`);

    this.onConnect = () => {};
    this.connected = false;

    this.socket.on("connect", () => {
      this.connected = true;
      this.onConnect();
    });

    this.collabs = {};

    this.socket.on("new collaborator", (id: string) => {
      this.collabs[id] = { id };

      this.socket.on(`collaborator pointer ${id}`, pointer => {
        this.collabs[id].pointer = pointer;
        this.requestRerender();
      });
      this.socket.on(`collaborator tool ${id}`, tool => {
        this.collabs[id].activeStroke = tool ? Tool.deserialize(tool, window.app.canvasManager) : undefined;
        this.requestRerender();
      });
      this.socket.on(`collaborator input ${id}`, (x, y, p, t) => {
        //console.log("collab input", this.collabs[id].activeStroke);
        if (this.collabs[id].activeStroke) {
          this.collabs[id].activeStroke.update(x, y, p, t);
          this.requestRerender();
        }
      });
      this.socket.on(`collaborator remove ${id}`, () => {
        delete this.collabs[id];
      });
    });
  }

  getCollaborators(): Collaborator[] {
    return Object.values(this.collabs);
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
