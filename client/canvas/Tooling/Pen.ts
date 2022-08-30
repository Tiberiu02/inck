import { ActionStack } from "./ActionsStack";
import { CanvasManager } from "../CanvasManager";
import { DeserializeStroke, SerializedStroke, SerializeStroke } from "../Drawing/Stroke";
import { StrokeBuilder } from "../Drawing/StrokeBuilder";
import { RGB } from "../types";
import { SerializedTool, Tool } from "./Tool";
import { View } from "../View/View";
import { Display } from "../DeviceProps";
import { NetworkConnection } from "../Network/NetworkConnection";

export interface SerializedPen extends SerializedTool {
  readonly color: RGB;
  readonly width: number;
  readonly zIndex: number;
  readonly stroke: SerializedStroke;
}

export class PenInterface {
  update(x: number, y: number, pressure: number, timestamp: number): void {}
  setWidth(width: number) {}
}

export class CollabPen implements PenInterface {
  private color: RGB;
  private width: number;
  private zIndex: number;

  private canvasManager: CanvasManager;

  private drawing: boolean;
  private strokeBuilder: StrokeBuilder;

  constructor(color: RGB, width: number, zIndex: number, canvasManager: CanvasManager) {
    this.color = color;
    this.width = width;
    this.zIndex = zIndex;

    this.canvasManager = canvasManager;
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    if (pressure) {
      if (!this.drawing) {
        this.strokeBuilder = new StrokeBuilder(timestamp, this.zIndex, this.color, this.width);
        this.drawing = true;
      }

      this.strokeBuilder.push({ x, y, pressure, timestamp });
    } else {
      if (this.drawing) {
        this.strokeBuilder = null;
        this.drawing = false;
      }
    }
  }

  setWidth(width: number) {
    this.width = width;
  }

  render(): void {
    if (this.strokeBuilder) {
      this.canvasManager.addForNextRender(this.strokeBuilder.getGraphic());
    }
  }

  static deserialize(data: SerializedPen, canvasManager: CanvasManager): CollabPen {
    const pen = new CollabPen(data.color, data.width, data.zIndex, canvasManager);

    if (data.stroke) {
      const stroke = DeserializeStroke(data.stroke);
      for (const p of stroke.points) {
        pen.update(p.x, p.y, p.pressure, p.timestamp);
      }
    }

    return pen;
  }
}

export class EmitterPen implements PenInterface {
  private network: NetworkConnection;

  constructor(network: NetworkConnection, baseTool: SerializedTool) {
    this.network = network;
    network.setTool(baseTool);
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    this.network.updateTool("update", x, y, pressure, timestamp);
  }

  setWidth(width: number) {
    this.network.updateTool("setWidth", width);
  }
}

export class MyPen implements Tool {
  private color: RGB;
  private width: number;
  private zIndex: number;

  private canvasManager: CanvasManager;
  private actionStack: ActionStack;
  private network: NetworkConnection;

  private drawing: boolean;
  private strokeBuilder: StrokeBuilder;
  private remoteController: PenInterface;

  constructor(
    color: RGB,
    width: number,
    zIndex: number,
    canvasManager: CanvasManager,
    actionStack: ActionStack,
    network: NetworkConnection
  ) {
    this.color = color;
    this.width = width;
    this.zIndex = zIndex;

    this.canvasManager = canvasManager;
    this.actionStack = actionStack;
    this.network = network;

    this.remoteController = new EmitterPen(network, this.serialize());
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    if (pressure) {
      if (!this.drawing) {
        const width = View.getCanvasCoords(Display.DPI() * this.width, 0, true)[0];
        this.remoteController.setWidth(width);
        this.strokeBuilder = new StrokeBuilder(timestamp, this.zIndex, this.color, width);
        this.drawing = true;
      }

      this.strokeBuilder.push({ x, y, pressure, timestamp });
    } else {
      if (this.drawing) {
        this.release();
      }
    }
    this.remoteController.update(x, y, pressure, timestamp);
  }

  render(): void {
    if (this.strokeBuilder) {
      this.canvasManager.addForNextRender(this.strokeBuilder.getGraphic());
    }
  }

  serialize(): SerializedPen {
    return {
      deserializer: "pen",
      color: this.color,
      width: this.width,
      zIndex: this.zIndex,
      stroke: this.strokeBuilder ? SerializeStroke(this.strokeBuilder.getStroke(null)) : null,
    };
  }

  release() {
    if (this.drawing) {
      if (this.actionStack) {
        const id = window.userId + "-" + Date.now();
        const stroke = this.strokeBuilder.getStroke(id);
        this.canvasManager.add(stroke);
        this.actionStack.push({
          undo: (): boolean => this.canvasManager.remove(stroke.id),
          redo: () => this.canvasManager.add(stroke),
        });
      }

      this.strokeBuilder = null;
      this.drawing = false;
    }
  }
}
