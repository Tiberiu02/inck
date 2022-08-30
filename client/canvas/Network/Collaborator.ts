import { CanvasManager } from "../CanvasManager";
import { RenderLoop } from "../Rendering/RenderLoop";
import { SerializedTool, TheirTool } from "../Tooling/Tool";
import { View } from "../View/View";
import { Vector2D } from "../Math/V2";
import { RGB } from "../types";
import { TheirPen, SerializedPen } from "../Tooling/Pen/TheirPen";
import { TheirSelection, SerializedSelection } from "../Tooling/Selection/TheirSelection";
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
  private tool: TheirTool;
  private protectedTool: any;
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

  setPointer(pointer: Vector2D) {
    this.pointer = pointer;
    RenderLoop.scheduleRender();
  }

  setTool(data: SerializedTool) {
    if (!data) return;

    if (data.deserializer == "pen") {
      this.tool = TheirPen.deserialize(data as SerializedPen, this.canvasManager);
    } else if (data.deserializer == "selection") {
      this.tool = TheirSelection.deserialize(data as SerializedSelection, this.canvasManager, this);
    }

    if (this.tool) {
      this.protectedTool = this.tool.protected();
    }
  }

  updateTool(methodName: string, ...args: any[]) {
    if (this.protectedTool && this.protectedTool[methodName]) {
      this.protectedTool[methodName](...args);
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

  remove() {
    this.el.remove();
  }
}
