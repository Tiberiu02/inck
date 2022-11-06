import { SerializedTool } from "../Tooling/Tool";
import { View } from "../View/View";
import { getAuthToken } from "../../components/AuthToken";

const CONNECT_EVENT_NAME = "connect-web-worker";

export function StartWorker(hostURL: string, authToken: string, docId: string) {
  const worker = new Worker(`/api/sockets.worker.js`);
  worker.postMessage([CONNECT_EVENT_NAME, hostURL, authToken, docId]);
  return worker;
}

export const SERVER_PORT = 8080;

export class NetworkConnection {
  private connected: boolean;
  private canWrite: boolean;
  private worker: Worker;
  private handlers: Map<string, Function[]>;

  public docId: string;

  constructor() {
    this.handlers = new Map();

    const pathname = window.location.pathname;
    const wloc = pathname.match(/\/note\/([\w\d_]+)/);

    this.docId = (wloc && wloc[1]) || "";

    this.canWrite = false;
    this.worker = StartWorker(`${window.location.host.split(":")[0]}:${SERVER_PORT}`, getAuthToken(), this.docId);

    this.worker.onmessage = (e: MessageEvent<any[]>) => {
      // console.log(e.data);
      if (this.handlers.has(e.data[0])) {
        const args = e.data.slice(1);
        for (const handler of this.handlers.get(e.data[0])) {
          handler(...args);
        }
      }
    };
    this.worker.postMessage("hello");

    this.on("connect_error", (err) => {
      console.log(err.message);
      //window.location.href = "/";
    });

    this.on("load note", (data: any) => {
      this.canWrite = data.canWrite;
    });

    this.on("unauthorized", async () => {
      this.connected = false;
      window.location.href = "/";
    });

    this.connected = false;

    this.on("connect", () => {
      this.connected = true;
      console.log("Connected");
      document.getElementById("offline-warning").style.visibility = "hidden";
    });

    this.on("disconnect", () => {
      this.connected = false;
      console.log("Disconneccted");
      document.getElementById("offline-warning").style.visibility = "visible";
    });

    window.addEventListener("pointermove", (e) => {
      if (e.pointerType != "touch") {
        this.updatePointer(View.instance.getCanvasX(e.x), View.instance.getCanvasY(e.y));
      }
    });
  }

  emit(...args: [string, ...any[]]) {
    if (this.connected) {
      //   this.socket.emit(name, ...args);
    }
    // console.log(name, args);
    this.worker.postMessage(args);
  }

  on(name: string, handler: any) {
    // this.socket.on(name, handler);
    if (!this.handlers.has(name)) {
      this.handlers.set(name, []);
    }
    this.handlers.get(name).push(handler);
  }

  isConnected() {
    return this.connected;
  }

  updatePointer(x: number, y: number) {
    this.emit("remote control", "setPointer", x, y);
  }

  updateCollab(method: string, ...args: any[]) {
    this.emit("remote control", method, ...args);
  }

  updateCollabDirected(targetId: string, method: string, ...args: any[]) {
    this.emit("directed remote control", targetId, method, ...args);
  }

  updateTool(method: string, ...args: any[]) {
    this.updateCollab("updateTool", method, ...args);
  }

  setTool(tool: SerializedTool, targetCollabId?: string) {
    if (targetCollabId) {
      this.updateCollabDirected(targetCollabId, "setTool", tool);
    } else {
      this.updateCollab("setTool", tool);
    }
  }

  get writeAllowed() {
    return this.canWrite;
  }
}
