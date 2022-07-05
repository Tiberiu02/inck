import { io } from "socket.io-client";
import { CanvasManager } from "./CanvasManager";
import { ViewManager } from "./Gestures";
import { StrokeToPath, FillPath } from "./Physics";
import { Tool, Eraser, Pen, Highlighter } from "./Tools";
import { Vector2D } from "./types";

function hexToRgb(hex) {
  const normal = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (normal) return normal.slice(1).map(e => parseInt(e, 16));

  const shorthand = hex.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (shorthand) return shorthand.slice(1).map(e => 0x11 * parseInt(e, 16));

  return null;
}

// input: h as an angle in [0,360] and s,l in [0,1] - output: r,g,b in [0,1]
function hsl2rgb(h, s, l) {
  let a = s * Math.min(l, 1 - l);
  let f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  return [f(0), f(8), f(4)];
}

const SERVER_PORT = 8080;

/**
 * EXPLANATION OF SERVER INTERACTION PROTOCOL
 *
 * Any string (id) coresponds to a document.
 * For every document, the server stores a list of objects (strokes).
 *
 * The client can request all strokes in a document by emitting 'request document'. The server will respond with 'load document'.
 * The client can append any object to the list of strokes by emitting 'new stroke'.
 */
export default class Connector {
  canvasManager: CanvasManager;
  render: any;
  socket: any;
  docId: string;
  collabs: { [id: number]: { pointer: Vector2D; activeStroke: Tool; el?: HTMLElement } };
  collabsContainer: HTMLDivElement;
  decodeCoordLegacy: (n: any) => number[];

  constructor(canvasManager: CanvasManager, renderFn: () => void) {
    this.canvasManager = canvasManager;
    this.render = renderFn;
    this.socket = io(`${window.location.host.split(":")[0]}:${SERVER_PORT}`);

    this.socket.on("connect", () => {
      const wloc = window.location.pathname.match(/\/note\/([\w\d_]+)/);
      this.docId = (wloc && wloc[1]) || "";

      this.socket.emit("request document", this.docId);
    });

    this.socket.on("load strokes", data => this.loadData(data));

    this.collabs = {};
    this.collabsContainer = document.createElement("div");
    Object.assign(this.collabsContainer.style, {
      width: "100vw",
      height: "100vh",
      overflow: "none",
      "pointer-events": "none",

      position: "absolute",
      top: "0px",
      left: "opx",
    });
    document.body.appendChild(this.collabsContainer);

    this.socket.on("collaborator", (id: number, pointer: Vector2D, activeStroke: object) => {
      this.collabs[id] = {
        pointer: pointer,
        activeStroke: activeStroke && Tool.deserialize(activeStroke),
        el: this.collabs[id] ? this.collabs[id].el : undefined,
      };
      console.log(id, this.collabs[id]);
      this.render();
    });
  }

  drawCollabs(view: ViewManager, callback: (vertex: Tool) => void) {
    for (let [id, c] of Object.entries(this.collabs)) {
      if (!c.el) {
        c.el = document.createElement("div");
        Object.assign(c.el.style, {
          width: "0px",
          height: "0px",
          borderTop: "15px solid transparent",
          borderBottom: "6px solid transparent",
          borderLeft: `15px solid rgb(${hsl2rgb(+id * 360, 1, 0.5)
            .map(x => x * 255)
            .join(",")})`,
          display: "none",
          position: "absolute",
        });
        this.collabsContainer.appendChild(c.el);
      }

      c.el.style.display = "none";

      if (c.pointer) {
        const x = (c.pointer.x - view.left) * view.zoom * innerWidth;
        const y = (c.pointer.y - view.top) * view.zoom * innerWidth;

        if (x >= 0 && x < innerWidth - 15 && y >= 0 && y < innerHeight - 21)
          Object.assign(c.el.style, {
            top: `${y}px`,
            left: `${x}px`,
            display: "block",
          });
      }

      if (c.activeStroke) {
        callback(c.activeStroke);
      }
    }
  }

  loadData(data) {
    console.log(data);
    for (let s of data) {
      if (!s) continue;

      const stroke = Tool.deserialize(s);
      this.canvasManager.addStroke(stroke);
    }

    this.render();
  }

  registerStroke(stroke: object) {
    this.socket.emit("new stroke", stroke);
  }
}
