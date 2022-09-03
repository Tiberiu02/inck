import { ActionStack } from "./ActionsStack";
import { CanvasManager } from "../CanvasManager";
import { NetworkConnection } from "../Network/NetworkConnection";
import { RGB } from "../types";
import { StrokeEraser } from "./Eraser";
import { MyPen } from "./Pen/MyPen";
import { MyTool } from "./Tool";
import { MySelection } from "./Selection/MySelection";
import { SerializedGraphic } from "../Drawing/Graphic";

export class ToolManager {
  private tool: MyTool;
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

    window.addEventListener("keydown", e => {
      if (e.code == "KeyV" && e.ctrlKey) {
        console.log("pasting");
        this.paste();
      }
    });
  }

  update(x: number, y: number, pressure: number, timestamp: number) {
    if (this.tool) {
      this.tool.update(x, y, pressure, timestamp);
    }
  }

  async paste() {
    try {
      const raw = await navigator.clipboard.readText();
      const obj = JSON.parse(raw);

      if (obj.inckObject == "selection") {
        this.selectSelection();
        const graphics = (obj.data as SerializedGraphic[]).map(s => ({
          ...s,
          id: Math.random().toString(36).slice(2),
        }));
        (this.tool as MySelection).loadSelection(graphics);
      }
    } catch (e) {}
  }

  selectPen(color: RGB, width: number, zIndex: number) {
    this.isErasing = false;
    if (this.tool) this.tool.release();
    this.tool = new MyPen(color, width, zIndex, this.canvasManager, this.actionStack, this.network);
    this.network.setTool(this.tool.serialize());
    this.getLastTool = () => this.selectPen(color, width, zIndex);
  }

  selectSelection() {
    this.isErasing = false;
    if (this.tool) this.tool.release();
    this.tool = new MySelection(this.canvasManager, this.actionStack, this.network);
    this.network.setTool(this.tool.serialize());
    this.getLastTool = () => this.selectSelection();
  }

  enableEraser() {
    if (!this.isErasing) {
      this.isErasing = true;
      if (this.tool) this.tool.release();
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
