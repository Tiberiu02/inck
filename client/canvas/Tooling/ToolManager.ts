import { ActionStack } from "./ActionsStack";
import { CanvasManager } from "../CanvasManager";
import { NetworkConnection } from "../Network/NetworkConnection";
import { NetworkTool } from "../Network/NetworkTool";
import { RGB } from "../types";
import { StrokeEraser } from "./Eraser";
import { Pen } from "./Pen";
import { Tool } from "./Tool";

export class ToolManager {
  private tool: NetworkTool;
  private canvasManager: CanvasManager;
  private actionStack: ActionStack;
  private network: NetworkConnection;

  public isErasing: boolean;
  private secondTool: Tool;

  constructor(canvasManager: CanvasManager, network: NetworkConnection) {
    this.canvasManager = canvasManager;
    this.network = network;
    this.actionStack = new ActionStack();
    this.tool = new NetworkTool(network);
  }

  update(x: number, y: number, pressure: number, timestamp: number) {
    if (this.tool) {
      this.network.updateInput(x, y, pressure, timestamp);
      this.tool.update(x, y, pressure, timestamp);
    }
  }

  selectPen(color: RGB, width: number, zIndex: number) {
    this.isErasing = false;
    this.tool.setTool(new Pen(color, width, zIndex, this.canvasManager, this.actionStack));
  }

  enableEraser() {
    if (!this.isErasing) {
      this.isErasing = true;
      this.secondTool = this.tool.getTool();
      this.tool.setTool(new StrokeEraser(this.canvasManager, this.actionStack));
    }
  }

  disableEraser() {
    if (this.isErasing) {
      this.isErasing = false;
      this.tool.setTool(this.secondTool);
    }
  }

  undo() {
    this.actionStack.undo();
  }

  redo() {
    this.actionStack.redo();
  }

  render() {
    if (this.tool) {
      this.tool.render();
    }
  }
}
