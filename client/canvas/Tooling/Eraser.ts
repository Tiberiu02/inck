import { ActionStack } from "./ActionsStack";
import { CanvasManager } from "../CanvasManager";
import { Tool } from "./Tool";

export class StrokeEraser implements Tool {
  private x: number;
  private y: number;
  private canvasManager: CanvasManager;
  private actionStack: ActionStack;

  constructor(canvasManager: CanvasManager, actionStack: ActionStack) {
    this.canvasManager = canvasManager;
    this.actionStack = actionStack;
  }

  update(x: number, y: number, pressure: number, timeStamp: number): void {
    if (pressure) {
      const x2 = this.x ?? x;
      const y2 = this.y ?? y;

      this.x = x;
      this.y = y;

      const line = { x1: x, y1: y, x2, y2 };
      this.canvasManager
        .getAll()
        .filter(s => s && s.geometry.intersectsLine(line))
        .forEach(s => {
          this.canvasManager.remove(s.id);
          this.actionStack.push({
            undo: () => {
              // TODO: Add stroke at the same index as before
              this.canvasManager.add((s = { ...s, id: window.userId + "-" + Date.now() }));
              return true;
            },
            redo: () => this.canvasManager.remove(s.id),
          });
        });
    } else {
      this.x = null;
      this.y = null;
    }
  }

  render(): void {}

  release(): void {}

  serialize() {
    return null;
  }
}
