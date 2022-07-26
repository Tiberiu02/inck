import { ActionStack } from "../ActionsStack";
import { CanvasManager } from "../CanvasManager";
import { Tool } from "./Tool";

export class StrokeEraser extends Tool {
  private x: number;
  private y: number;

  constructor(canvasManager: CanvasManager, actionStack: ActionStack) {
    super(canvasManager, actionStack);
  }

  update(x: number, y: number, pressure: number, timeStamp: number): void {
    super.update(x, y, pressure, timeStamp);

    const x2 = this.x ?? x;
    const y2 = this.y ?? y;

    this.x = x;
    this.y = y;

    const line = { x1: x, y1: y, x2, y2 };
    this.canvasManager
      .getStrokes()
      .filter(s => s && s.intersectsLine(line))
      .forEach(s => {
        this.canvasManager.removeStroke(s.id);
        this.actionStack.push({
          undo: () => {
            // TODO: Add stroke at the same position as before
            this.canvasManager.addStroke(s);
            return true;
          },
          redo: () => this.canvasManager.removeStroke(s.id),
        });
      });
  }
}
