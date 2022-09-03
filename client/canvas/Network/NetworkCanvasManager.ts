import { CanvasManager } from "../CanvasManager";
import { RenderLoop } from "../Rendering/RenderLoop";
import { SerializedTool, MyTool, TheirTool } from "../Tooling/Tool";
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
import { TheirPen, SerializedPen } from "../Tooling/Pen/TheirPen";
import { TheirSelection, SerializedSelection } from "../Tooling/Selection/TheirSelection";
import { V3 } from "../Math/V3";
import { Collaborator } from "./Collaborator";

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

      this.network.on(`collaborator update ${id}`, (method: string, ...args: any[]) => {
        this.collabs[id][method](...args);
      });
      this.network.on(`collaborator remove ${id}`, () => {
        this.collabs[id].remove();
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
