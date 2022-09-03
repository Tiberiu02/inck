import { ActionStack } from "../ActionsStack";
import { CanvasManager } from "../../CanvasManager";
import { SerializeStroke } from "../../Drawing/Stroke";
import { StrokeBuilder } from "../../Drawing/StrokeBuilder";
import { RGB } from "../../types";
import { MyTool } from "../Tool";
import { View } from "../../View/View";
import { Display } from "../../DeviceProps";
import { NetworkConnection } from "../../Network/NetworkConnection";
import { RenderLoop } from "../../Rendering/RenderLoop";
import { EmitterPen, PenController, SerializedPen } from "./TheirPen";

export class MyPen implements MyTool {
  private color: RGB;
  private width: number;
  private zIndex: number;

  private canvasManager: CanvasManager;
  private actionStack: ActionStack;
  private network: NetworkConnection;

  private drawing: boolean;
  private strokeBuilder: StrokeBuilder;
  private remoteController: PenController;

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

    this.network.setTool(this.serialize());
    this.remoteController = new EmitterPen(network);
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    if (pressure) {
      if (!this.drawing) {
        const width = View.getCanvasCoords(Display.DPI * this.width, 0, true)[0];
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

    // Render
    RenderLoop.supportsFastRender ? RenderLoop.render() : RenderLoop.scheduleRender();
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
