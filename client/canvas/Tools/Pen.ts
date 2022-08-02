import { ActionStack } from "../ActionsStack";
import { CanvasManager } from "../CanvasManager";
import { DeserializeStroke } from "../Drawables/DeserializeDrawable";
import { Stroke } from "../Drawables/Stroke";
import { RGB } from "../types";
import { Tool } from "./Tool";

export class Pen extends Tool {
  stroke: Stroke;

  constructor(width: number, color: RGB, zIndex: number, canvasManager: CanvasManager, actionStack?: ActionStack) {
    super(canvasManager, actionStack);
    this.stroke = new Stroke(color, width, zIndex);
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    super.update(x, y, pressure, timestamp);
    this.stroke.push({ x, y, pressure, timestamp });
  }

  render(): void {
    this.canvasManager.addActiveStroke(this.stroke);
  }

  release(): void {
    super.release();

    this.canvasManager.addStroke(this.stroke);
    if (this.actionStack) {
      this.actionStack.push({
        undo: (): boolean => this.canvasManager.removeStroke(this.stroke.id),
        redo: () => this.canvasManager.addStroke(this.stroke),
      });
    }
  }

  serialize(): any {
    return this.stroke.serialize();
  }

  static deserialize(data: any, canvasManager: CanvasManager, actionStack?: ActionStack): Pen {
    const stroke = DeserializeStroke(data);
    const pen = new Pen(stroke.width, stroke.color, stroke.zIndex, canvasManager, actionStack);
    pen.stroke = stroke;
    return pen;
  }
}
