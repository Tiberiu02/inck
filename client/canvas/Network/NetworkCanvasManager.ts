import { CanvasManager } from "../CanvasManager";
import { DeserializeDrawable, Drawable, SerializedDrawable, SerializeDrawable } from "../Drawing/Drawable";
import { RenderLoop } from "../Rendering/RenderLoop";
import { DeserializeTool, SerializedTool, Tool } from "../Tooling/Tool";
import { Vector2D } from "../types";
import { View } from "../View/View";
import { NetworkConnection } from "./NetworkConnection";

// input: h as an angle in [0,360] and s,l in [0,1] - output: r,g,b in [0,1]
function hsl2rgb(h, s, l) {
  let a = s * Math.min(l, 1 - l);
  let f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  return [f(0), f(8), f(4)];
}

type Collaborator = { pointer?: Vector2D; tool?: Tool; el?: HTMLElement; id: string };

export class NetworkCanvasManager implements CanvasManager {
  private baseCanvas: CanvasManager;
  private network: NetworkConnection;
  private collabs: { [id: number]: Collaborator };
  private collabsContainer: HTMLDivElement;

  constructor(baseCanvas: CanvasManager, network: NetworkConnection) {
    this.baseCanvas = baseCanvas;
    this.network = network;

    const wloc = window.location.pathname.match(/\/note\/([\w\d_]+)/);
    const docId = (wloc && wloc[1]) || "";

    network.emit("request document", docId);

    network.on("userId", (userId: string) => {
      window.userId = userId;
    });

    network.on("load strokes", (data: SerializedDrawable[]) => {
      console.log("loaded strokes", data);

      for (let s of data) {
        if (!s) continue;

        const stroke = DeserializeDrawable(s);
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
      this.collabs[id] = { id };

      this.network.on(`collaborator pointer ${id}`, pointer => {
        this.collabs[id].pointer = pointer;
        RenderLoop.scheduleRender();
      });
      this.network.on(`collaborator tool ${id}`, (tool: SerializedTool) => {
        this.collabs[id].tool = tool ? DeserializeTool(tool, this.baseCanvas) : undefined;
        RenderLoop.scheduleRender();
      });
      this.network.on(`collaborator input ${id}`, (x, y, p, t) => {
        if (this.collabs[id].tool) {
          this.collabs[id].tool.update(x, y, p, t);
          RenderLoop.scheduleRender();
        }
      });
      this.network.on(`collaborator remove ${id}`, () => {
        delete this.collabs[id];
        RenderLoop.scheduleRender();
      });
    });
  }

  add(drawable: Drawable): void {
    this.baseCanvas.add(drawable);
    this.network.emit("new stroke", SerializeDrawable(drawable));
  }

  remove(id: string): boolean {
    this.network.emit("remove stroke", id);
    return this.baseCanvas.remove(id);
  }

  getAll(): Drawable[] {
    return this.baseCanvas.getAll();
  }

  addForNextRender(drawable: Drawable): void {
    this.baseCanvas.addForNextRender(drawable);
  }

  render(): void {
    for (let c of Object.values(this.collabs)) {
      if (!c.el) {
        c.el = document.createElement("div");
        Object.assign(c.el.style, {
          width: "0px",
          height: "0px",
          borderTop: "15px solid transparent",
          borderBottom: "6px solid transparent",
          borderLeft: `15px solid rgb(${hsl2rgb(parseInt(c.id, 36), 1, 0.5)
            .map(x => x * 255)
            .join(",")})`,
          display: "none",
          position: "absolute",
        });
        this.collabsContainer.appendChild(c.el);
      }

      c.el.style.display = "none";

      if (c.pointer) {
        const [x, y] = View.getScreenCoords(c.pointer.x, c.pointer.y);

        if (x >= 0 && x < innerWidth - 15 && y >= 0 && y < innerHeight - 21)
          Object.assign(c.el.style, {
            top: `${y}px`,
            left: `${x}px`,
            display: "block",
          });
      }

      if (c.tool) {
        c.tool.render();
      }
    }

    this.baseCanvas.render();
  }
}
