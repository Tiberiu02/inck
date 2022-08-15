import { ActionStack } from "./ActionsStack";
import { CanvasManager } from "../CanvasManager";
import { DeserializeStroke, SerializedStroke, SerializeStroke } from "../Drawing/Stroke";
import { StrokeBuilder } from "../Drawing/StrokeBuilder";
import { RGB } from "../types";
import { SerializedTool, Tool } from "./Tool";
import { View } from "../View/View";
import { Display } from "../DeviceProps";

export interface SerializedPen extends SerializedTool {
  readonly color: RGB;
  readonly width: number;
  readonly zIndex: number;
  readonly stroke: SerializedStroke;
}

export class Pen implements Tool {
  private color: RGB;
  private width: number;
  private zIndex: number;

  private canvasManager: CanvasManager;
  private actionStack: ActionStack;

  private strokeBuilder: StrokeBuilder;

  constructor(color: RGB, width: number, zIndex: number, canvasManager: CanvasManager, actionStack?: ActionStack) {
    this.color = color;
    this.width = width;
    this.zIndex = zIndex;

    this.canvasManager = canvasManager;
    this.actionStack = actionStack;
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    if (pressure) {
      if (!this.strokeBuilder) {
        const id = window.userId + "-" + Date.now();
        const width = View.getCanvasCoords(Display.DPI() * this.width, 0, true)[0];
        this.strokeBuilder = new StrokeBuilder(id, timestamp, this.zIndex, this.color, width);
      }

      this.strokeBuilder.push({ x, y, pressure, timestamp });
    } else {
      if (this.strokeBuilder) {
        if (this.actionStack) {
          const stroke = this.strokeBuilder.getStroke();
          this.canvasManager.add(stroke);
          this.actionStack.push({
            undo: (): boolean => this.canvasManager.remove(stroke.id),
            redo: () => this.canvasManager.add(stroke),
          });
        }

        this.strokeBuilder = null;
      }
    }
  }

  render(): void {
    if (this.strokeBuilder) {
      this.canvasManager.addForNextRender(this.strokeBuilder.getStroke());
    }
  }

  serialize(): SerializedPen {
    return {
      deserializer: "pen",
      color: this.color,
      width: this.width,
      zIndex: this.zIndex,
      stroke: this.strokeBuilder ? SerializeStroke(this.strokeBuilder.getStroke()) : null,
    };
  }

  static deserialize(data: SerializedPen, canvasManager: CanvasManager, actionStack?: ActionStack): Pen {
    const pen = new Pen(data.color, data.width, data.zIndex, canvasManager, actionStack);

    if (data.stroke) {
      const stroke = DeserializeStroke(data.stroke);
      for (const p of stroke.points) {
        pen.update(p.x, p.y, p.pressure, p.timestamp);
      }
    }

    return pen;
  }
}
