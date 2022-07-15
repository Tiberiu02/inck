import { CanvasManager } from "../CanvasManager";
import { ViewManager } from "../Gestures";
import { NetworkConnection } from "./NetworkConnection";
import { Tool } from "../Tools";

// input: h as an angle in [0,360] and s,l in [0,1] - output: r,g,b in [0,1]
function hsl2rgb(h, s, l) {
  let a = s * Math.min(l, 1 - l);
  let f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  return [f(0), f(8), f(4)];
}

export class NetworkCanvasManager extends CanvasManager {
  private network: NetworkConnection;
  private collabsContainer: HTMLDivElement;

  constructor(canvas: HTMLCanvasElement, view: ViewManager, network: NetworkConnection) {
    super(canvas, view);

    this.network = network;

    const wloc = window.location.pathname.match(/\/note\/([\w\d_]+)/);
    const docId = (wloc && wloc[1]) || "";

    network.emit("request document", docId);

    network.on("load strokes", (data: object[], userId: string) => {
      console.log("loaded strokes", data, userId);

      window.userId = userId;

      for (let s of data) {
        if (!s) continue;

        const stroke = Tool.deserialize(s);
        if (stroke) {
          super.addStroke(stroke);
        }
      }

      this.render();
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
  }

  addStroke(stroke: any): void {
    super.addStroke(stroke);
    this.network.emit("new stroke", stroke.serialize());
  }

  removeStroke(id: string): boolean {
    this.network.emit("remove stroke", id);
    return super.removeStroke(id);
  }

  render(): void {
    for (let c of this.network.getCollaborators()) {
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
        const x = (c.pointer.x - this.view.left) * this.view.zoom * innerWidth;
        const y = (c.pointer.y - this.view.top) * this.view.zoom * innerWidth;

        if (x >= 0 && x < innerWidth - 15 && y >= 0 && y < innerHeight - 21)
          Object.assign(c.el.style, {
            top: `${y}px`,
            left: `${x}px`,
            display: "block",
          });
      }

      if (c.activeStroke) {
        super.addActiveStroke(c.activeStroke);
      }
    }

    super.render();
  }
}
