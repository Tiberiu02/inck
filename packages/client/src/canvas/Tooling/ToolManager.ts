import { ActionStack } from "./ActionsStack";
import { LayeredStrokeContainer } from "../LayeredStrokeContainer";
import { NetworkConnection } from "../Network/NetworkConnection";
import { RGB } from "../types";
import { StrokeEraser } from "./Eraser";
import { MyPen } from "./Pen/MyPen";
import { MyTool } from "./Tool";
import { MySelection } from "./Selection/MySelection";
import { DeserializeGraphic, SerializedGraphic, TranslatePersistentGraphic } from "../Drawing/Graphic";
import { PenEvent, PointerTracker } from "../UI/PointerTracker";
import { View } from "../View/View";
import { RenderLoop } from "../Rendering/RenderLoop";

export class ToolManager {
  tool: MyTool;
  strokeContainer: LayeredStrokeContainer;
  actionStack: ActionStack;
  network: NetworkConnection;

  pen: MyPen;
  eraser: StrokeEraser;
  selection: MySelection;

  constructor(strokeContainer: LayeredStrokeContainer, network: NetworkConnection) {
    this.strokeContainer = strokeContainer;
    this.network = network;
    this.actionStack = new ActionStack();

    network.on("new collaborator", (id: string) => {
      if (this.tool) {
        network.setTool(this.tool.serialize(), id);
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.code == "KeyV" && e.ctrlKey) {
        this.paste();
      } else if (e.code == "KeyZ" && e.ctrlKey && !e.shiftKey) {
        this.actionStack.undo();
      } else if ((e.code == "KeyZ" && e.ctrlKey && e.shiftKey) || (e.code == "KeyY" && e.ctrlKey)) {
        this.actionStack.redo();
      }
    });

    this.pen = new MyPen(this.strokeContainer, this.actionStack, this.network);
    this.eraser = new StrokeEraser(this.strokeContainer, this.actionStack, this.network);
    this.selection = new MySelection(this.strokeContainer, this.actionStack, this.network);

    PointerTracker.instance.onPenEvent(this.update.bind(this));
  }

  update(e: PenEvent) {
    const x = View.instance.getCanvasX(e.x);
    const y = View.instance.getCanvasY(e.y);

    if (this.tool) {
      this.tool.update(x, y, e.pressure, e.timeStamp);
    }
  }

  async paste() {
    try {
      const raw = await navigator.clipboard.readText();
      const obj = JSON.parse(raw);

      if (obj.inckObject == "selection") {
        this.selectSelection();
        const graphics = (obj.data as SerializedGraphic[]).map(DeserializeGraphic);
        (this.tool as MySelection).paste(graphics);
      }
    } catch (e) {}
  }

  selectPen(color: RGB, width: number, zIndex: number) {
    if (this.tool) this.tool.release();
    this.pen.options(color, width, zIndex);
    this.tool = this.pen;
    this.network.setTool(this.tool.serialize());
  }

  selectSelection() {
    if (this.tool) this.tool.release();
    this.tool = this.selection;
    this.network.setTool(this.tool.serialize());
  }

  selectEraser() {
    if (this.tool) this.tool.release();
    this.tool = this.eraser;
    this.network.setTool(this.tool.serialize());
  }

  render(layerIndex: number) {
    if (this.tool) {
      this.tool.render(layerIndex);
    }
  }

  hasLayer(layerIndex: number) {
    return this.tool && (this.tool == this.selection || (this.tool == this.pen && this.pen.zIndex == layerIndex));
  }
}
