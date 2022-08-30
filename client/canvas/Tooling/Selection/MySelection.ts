import { CanvasManager } from "../../CanvasManager";
import { Display } from "../../DeviceProps";
import { SerializeGraphic, Serializers } from "../../Drawing/Graphic";
import { UniteRectangles } from "../../Math/Geometry";
import { View } from "../../View/View";
import { ActionStack } from "../ActionsStack";
import { MyTool } from "../Tool";
import { PointerTracker } from "../../UI/PointerTracker";
import { NetworkConnection } from "../../Network/NetworkConnection";
import { V2, Vector2D } from "../../Math/V2";
import { LASSO_COLOR, SelectionBase, SHADOW_SIZE } from "./SelectionBase";
import { EmitterSelection, SelectionController, SerializedSelection } from "./TheirSelection";

export class MySelection extends SelectionBase implements MyTool {
  private actionStack: ActionStack;
  private network: NetworkConnection;
  private ui: HTMLDivElement;

  private remoteController: SelectionController;

  constructor(canvasManager: CanvasManager, actionStack: ActionStack, network: NetworkConnection) {
    super(canvasManager);

    this.actionStack = actionStack;
    this.network = network;
    this.ui = this.createUI();

    this.network.setTool(this.serialize());
    this.remoteController = new EmitterSelection(network);
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    if (pressure) {
      if (!this.selecting) {
        this.release();
      }

      super.updateLasso(x, y, pressure, timestamp);
      this.remoteController.updateLasso(x, y, pressure, timestamp);
    } else {
      if (this.selecting) {
        super.releaseLasso();
        this.remoteController.releaseLasso();

        if (this.actionStack) {
          this.selected.forEach(d => this.canvasManager.remove(d.id));
        }
      }
    }
  }

  translateSelection({ x, y }: Vector2D): void {
    super.translateSelection({ x, y });
    this.remoteController.translateSelection({ x, y });
  }

  applyTranslation() {
    super.applyTranslation();
    this.remoteController.applyTranslation();
  }

  private createUI(): HTMLDivElement {
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.display = "none";
    div.style.outline = `0.05in solid rgba(${LASSO_COLOR.map(c => c * 256)}, 0.8)`;
    div.style.borderRadius = "0.02in";
    div.style.cursor = "move";

    // Moving selection
    let pointer: Vector2D;
    let pointerId: number;
    div.addEventListener("pointerdown", e => {
      pointer = new Vector2D(e.x, e.y);
      pointerId = e.pointerId;
      PointerTracker.pause();
    });
    window.addEventListener("pointermove", e => {
      if (pointer && e.pointerId == pointerId) {
        const newPointer = new Vector2D(e.x, e.y);
        this.translateSelection(V2.sub(newPointer, pointer));
        pointer = newPointer;
      }
    });
    window.addEventListener("pointerup", e => {
      if (pointer && e.pointerId == pointerId) {
        pointer = null;
        this.applyTranslation();
        PointerTracker.unpause();
      }
    });
    document.body.appendChild(div);

    const menu = document.createElement("div");
    menu.style.display = "flex";
    menu.style.flexDirection = "row";
    menu.style.backgroundColor = "rgba(255, 255, 255, 1)";
    menu.style.position = "absolute";
    menu.style.overflow = "hidden";
    menu.style.bottom = "0px";
    menu.style.left = "50%";
    menu.style.transform = "translate(-50%, 50%)";
    menu.style.borderRadius = "9999em";
    menu.style.filter = "drop-shadow(0 2px 13px rgb(0 0 0 / 0.1)) drop-shadow(0 1px 5px rgb(0 0 0 / 0.25))";
    div.appendChild(menu);

    const createBtn = (first: boolean, last: boolean, cb: Function) => {
      const btn = document.createElement("div");
      btn.style.padding = `0.5em ${last ? "1em" : "0.7em"} 0.5em ${first ? "1em" : "0.7em"}`;
      btn.style.cursor = "pointer";
      if (!first) {
        btn.style.borderLeft = "1px solid #aaa";
      }
      menu.appendChild(btn);

      let pressed = false;
      btn.addEventListener("pointerdown", e => {
        e.stopPropagation();
        btn.style.backgroundColor = "rgba(240, 240, 240, 1)";
        pressed = true;
      });
      btn.addEventListener("pointerout", e => {
        btn.style.backgroundColor = "";
        pressed = false;
      });
      btn.addEventListener("pointerup", e => {
        btn.style.backgroundColor = "";
        if (pressed) {
          cb();
          pressed = false;
        }
      });
      return btn;
    };

    const deleteBtn = createBtn(true, false, () => this.deleteSelection());
    deleteBtn.innerHTML = "🗑️&nbsp;Delete";

    const deselectBtn = createBtn(false, true, () => this.release());
    deselectBtn.innerHTML = "❌&nbsp;Deselect";

    return div;
  }

  render(): void {
    super.render();

    if (this.selected.length) {
      const { x, y } = this.toTranslateBy;
      const box = this.selected.map(d => d.geometry.boundingBox).reduce(UniteRectangles);
      const [x1, y1] = View.getScreenCoords(box.xMin + x, box.yMin + y);
      const [x2, y2] = View.getScreenCoords(box.xMax + x, box.yMax + y);
      const w = SHADOW_SIZE * Display.DPI() * 2;

      this.ui.style.left = `${x1 - w}px`;
      this.ui.style.top = `${y1 - w}px`;
      this.ui.style.width = `${x2 - x1 + 2 * w}px`;
      this.ui.style.height = `${y2 - y1 + 2 * w}px`;
      this.ui.style.display = "";
    } else {
      this.ui.style.display = "none";
    }
  }

  release(): void {
    this.selected.forEach(d => this.canvasManager.add(d));
    super.clearSelection();
    this.remoteController.clearSelection();

    this.ui.style.display = "none";
  }

  deleteSelection(): void {
    super.clearSelection();
    this.remoteController.clearSelection();
  }

  serialize(): SerializedSelection {
    return {
      deserializer: Serializers.SELECTION,
      selecting: this.selecting,
      selected: this.selected.map(SerializeGraphic),
      points: this.points,
      toTranslateBy: { x: this.toTranslateBy.x, y: this.toTranslateBy.y },
    };
  }
}
