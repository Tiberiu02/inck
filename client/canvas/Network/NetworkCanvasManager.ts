import { CanvasManager } from "../CanvasManager";
import { RenderLoop } from "../Rendering/RenderLoop";
import { SerializedTool, Tool } from "../Tooling/Tool";
import { View } from "../View/View";
import { NetworkConnection } from "./NetworkConnection";
import { Vector2D } from "../Math/V2";
import {
  Graphic,
  PersistentGraphic,
  SerializedGraphic,
  SerializeGraphic,
  DeserializeGraphic,
} from "../Drawing/Graphic";
import { RGB } from "../types";
import { CollabPen, SerializedPen } from "../Tooling/Pen";
import { CollabSelection, SerializedSelection } from "../Tooling/Selection";
import { V3 } from "../Math/V3";

// input: h as an angle in [0,360] and s,l in [0,1] - output: r,g,b in [0,1]
function hsl2rgb(h: number, s: number, l: number): RGB {
  let a = s * Math.min(l, 1 - l);
  let f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  return [f(0), f(8), f(4)];
}

interface CollaboratorInterface {
  setTool(tool: SerializedTool): void;
  updateTool(methodName: string, ...args: any[]): void;
}

export class Collaborator implements CollaboratorInterface {
  private id: string;
  private pointer: Vector2D;
  private tool: any;
  private el: HTMLElement;
  private canvasManager: CanvasManager;

  constructor(id: string, collabsContainer: HTMLDivElement, canvasManager: CanvasManager) {
    this.id = id;
    this.canvasManager = canvasManager;

    this.el = this.createPointerElement(collabsContainer);
  }

  getColor(luminance = 0.5): RGB {
    return hsl2rgb(parseInt(this.id, 36), 1, luminance);
  }

  private createPointerElement(collabsContainer: HTMLDivElement): HTMLElement {
    const el = document.createElement("div");
    Object.assign(el.style, {
      width: "0px",
      height: "0px",
      borderTop: "15px solid transparent",
      borderBottom: "6px solid transparent",
      borderLeft: `15px solid rgb(${V3.mul(this.getColor(), 255)})`,
      display: "none",
      position: "absolute",
    });
    collabsContainer.appendChild(el);
    return el;
  }

  setTool(data: SerializedTool) {
    if (data.deserializer == "pen") {
      this.tool = CollabPen.deserialize(data as SerializedPen, this.canvasManager);
    } else if (data.deserializer == "selection") {
      this.tool = CollabSelection.deserialize(data as SerializedSelection, this.canvasManager, this);
    }
  }

  updateTool(methodName: string, ...args: any[]) {
    if (this.tool && this.tool[methodName]) {
      this.tool[methodName](...args);
    }
  }

  render() {
    this.el.style.display = "none";

    if (this.pointer) {
      const [x, y] = View.getScreenCoords(this.pointer.x, this.pointer.y);

      if (x >= 0 && x < innerWidth - 15 && y >= 0 && y < innerHeight - 21) {
        Object.assign(this.el.style, {
          top: `${y}px`,
          left: `${x}px`,
          display: "block",
        });
      }
    }

    if (this.tool) {
      this.tool.render();
    }
  }
}

export class NetworkCanvasManager implements CanvasManager {
  private baseCanvas: CanvasManager;
  private network: NetworkConnection;
  private collabs: { [id: number]: Collaborator };
  private collabsContainer: HTMLDivElement;

  constructor(baseCanvas: CanvasManager, network: NetworkConnection) {
    this.baseCanvas = baseCanvas;
    this.network = network;

    const pathname = window.location.pathname;
    const authWloc = pathname.match(/\/auth-note\/([\w\d_]+)/);
    const freeWloc = pathname.match(/\/free-note\/([\w\d_]+)/);

    const docId = (authWloc && authWloc[1]) || (freeWloc && freeWloc[1]) || "";
    //network.close()

    network.emit("request document", docId);

    network.on("userId", (userId: string) => {
      window.userId = userId;
    });

    network.on("load strokes", (data: SerializedGraphic[]) => {
      console.log("loaded strokes", data);

      for (let s of data) {
        if (!s) continue;

        const stroke = DeserializeGraphic(s);
        if (stroke) {
          this.baseCanvas.add(stroke);
        }
      }

      RenderLoop.scheduleRender();
    });

    network.on("unload strokes", (ids: string[]) => {
      ids.forEach(id => this.baseCanvas.remove(id));
      RenderLoop.scheduleRender();
    });

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

    this.collabs = {};

    this.network.on("new collaborator", (id: string) => {
      this.collabs[id] = new Collaborator(id, this.collabsContainer, baseCanvas);

      this.network.on(`collaborator pointer ${id}`, pointer => {
        this.collabs[id].pointer = pointer;
        RenderLoop.scheduleRender();
      });
      this.network.on(`collaborator tool ${id}`, (tool: SerializedTool) => {
        //this.collabs[id].tool = tool ? DeserializeTool(tool, this.baseCanvas) : undefined;
        //RenderLoop.scheduleRender();
      });
      this.network.on(`collaborator input ${id}`, (x, y, p, t) => {
        if (this.collabs[id].tool) {
          this.collabs[id].tool.update(x, y, p, t);
          RenderLoop.scheduleRender();
        }
      });
      this.network.on(`collaborator update ${id}`, (method: string, ...args: any[]) => {
        this.collabs[id][method](...args);
      });
      this.network.on(`collaborator remove ${id}`, () => {
        delete this.collabs[id];
        RenderLoop.scheduleRender();
      });
    });
  }

  add(graphic: PersistentGraphic): void {
    this.baseCanvas.add(graphic);
    this.network.emit("new stroke", SerializeGraphic(graphic));
  }

  remove(id: string): boolean {
    this.network.emit("remove stroke", id);
    return this.baseCanvas.remove(id);
  }

  getAll(): PersistentGraphic[] {
    return this.baseCanvas.getAll();
  }

  addForNextRender(drawable: Graphic): void {
    this.baseCanvas.addForNextRender(drawable);
  }

  render(): void {
    for (let c of Object.values(this.collabs)) {
      c.render();
    }

    this.baseCanvas.render();
  }
}
