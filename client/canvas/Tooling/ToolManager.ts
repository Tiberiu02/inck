import { ActionStack } from "./ActionsStack";
import { CanvasManager } from "../CanvasManager";
import { NetworkConnection } from "../Network/NetworkConnection";
import { NetworkTool } from "../Network/NetworkTool";
import { RGB } from "../types";
import { StrokeEraser } from "./Eraser";
import { MyPen } from "./Pen";
import { Tool } from "./Tool";
import { MySelection } from "./Selection";

export class ToolManager {
  private tool: Tool;
  private canvasManager: CanvasManager;
  private actionStack: ActionStack;
  private network: NetworkConnection;

  public isErasing: boolean;
  private getLastTool: Function;

  constructor(canvasManager: CanvasManager, network: NetworkConnection) {
    this.canvasManager = canvasManager;
    this.network = network;
    this.actionStack = new ActionStack();

    network.on("new collaborator", (id: string) => {
      if (this.tool) {
        network.setTool(this.tool.serialize(), id);
      }
    });
  }

  update(x: number, y: number, pressure: number, timestamp: number) {
    if (this.tool) {
      //this.network.updateInput(x, y, pressure, timestamp);
      this.tool.update(x, y, pressure, timestamp);
    }
  }

  selectPen(color: RGB, width: number, zIndex: number) {
    this.isErasing = false;
    this.tool = new MyPen(color, width, zIndex, this.canvasManager, this.actionStack, this.network);
    this.network.setTool(this.tool.serialize());
    this.getLastTool = () => this.selectPen(color, width, zIndex);
  }

  selectSelection() {
    this.isErasing = false;
    this.tool = new MySelection(this.canvasManager, this.actionStack, this.network);
    this.network.setTool(this.tool.serialize());
    this.getLastTool = () => this.selectSelection();
  }

  enableEraser() {
    if (!this.isErasing) {
      this.isErasing = true;
      this.tool = new StrokeEraser(this.canvasManager, this.actionStack, this.network);
      this.network.setTool(this.tool.serialize());
    }
  }

  disableEraser() {
    if (this.isErasing) {
      this.getLastTool();
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
