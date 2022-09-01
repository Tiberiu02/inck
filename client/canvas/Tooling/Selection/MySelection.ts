import { CanvasManager } from "../../CanvasManager";
import { Display } from "../../DeviceProps";
import { DeserializeGraphic, SerializedGraphic, SerializeGraphic, Serializers } from "../../Drawing/Graphic";
import { UniteRectangles } from "../../Math/Geometry";
import { View } from "../../View/View";
import { ActionStack } from "../ActionsStack";
import { MyTool } from "../Tool";
import { PointerTracker } from "../../UI/PointerTracker";
import { NetworkConnection } from "../../Network/NetworkConnection";
import { V2, Vector2D } from "../../Math/V2";
import { LASSO_COLOR, SelectionBase, SHADOW_SIZE } from "./SelectionBase";
import { EmitterSelection, SelectionController, SerializedSelection } from "./TheirSelection";
import { SelectionUI } from "../../UI/SelectionUI";
import { V3 } from "../../Math/V3";

const UI_COLOR = [115, 160, 255];
const OUTLINE_WIDTH = 0.05;

export class MySelection extends SelectionBase implements MyTool {
  private actionStack: ActionStack;
  private network: NetworkConnection;
  private ui: HTMLDivElement;

  private remoteController: SelectionController;
  private keyHandler: (e: KeyboardEvent) => void;
  private menu: HTMLElement;

  constructor(canvasManager: CanvasManager, actionStack: ActionStack, network: NetworkConnection) {
    super(canvasManager);

    this.selected = [];
    this.actionStack = actionStack;
    this.network = network;
    this.ui = this.createUI();

    this.network.setTool(this.serialize());
    this.remoteController = new EmitterSelection(network);

    this.keyHandler = (e: KeyboardEvent) => {
      console.log(e.code, e);
      if (e.code == "KeyC" && e.ctrlKey) {
        this.copySelection();
      } else if (e.code == "KeyX" && e.ctrlKey) {
        this.cutSelection();
      }
    };
    window.addEventListener("keydown", this.keyHandler);
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    if (pressure) {
      if (!this.selecting) {
        this.deselect();
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

  setTranslation({ x, y }: Vector2D): void {
    super.setTranslation({ x, y });
    this.remoteController.setTranslation({ x, y });
  }

  applyTranslation() {
    super.applyTranslation();
    this.remoteController.applyTranslation();
  }

  setRotation(angle: number): void {
    super.setRotation(angle);
    this.remoteController.setRotation(angle);
  }

  applyRotation() {
    super.applyRotation();
    this.remoteController.applyRotation();
  }

  setScaling(factor: number): void {
    super.setScaling(factor);
    this.remoteController.setScaling(factor);
  }

  applyScaling() {
    super.applyScaling();
    this.remoteController.applyScaling();
  }

  render(): void {
    super.render();

    if (this.selected.length) {
      const box = this.selected.map(d => d.geometry.boundingBox).reduce(UniteRectangles);
      const [sw, sh] = [(box.xMax - box.xMin) / 2, (box.yMax - box.yMin) / 2];
      const [cx, cy] = [box.xMin + sw, box.yMin + sh];
      const { x, y } = this.toTranslateBy;

      const [x1, y1] = View.getScreenCoords(cx - sw * this.toScaleBy + x, cy - sh * this.toScaleBy + y);
      const [x2, y2] = View.getScreenCoords(cx + sw * this.toScaleBy + x, cy + sh * this.toScaleBy + y);
      const w = SHADOW_SIZE * Display.DPI * 2;

      this.ui.style.left = `${x1 - w}px`;
      this.ui.style.top = `${y1 - w}px`;
      this.ui.style.width = `${x2 - x1 + 2 * w}px`;
      this.ui.style.height = `${y2 - y1 + 2 * w}px`;
      this.ui.style.display = "";
      this.ui.style.transform = `rotate(${this.toRotateBy}rad)`;
    } else {
      this.ui.style.display = "none";
    }
  }

  release(): void {
    this.deselect();
    window.removeEventListener("keydown", this.keyHandler);
    this.ui.style.display = "none";
  }

  deselect(): void {
    this.selected.forEach(d => this.canvasManager.add(d));
    super.clearSelection();
    this.remoteController.clearSelection();
  }

  deleteSelection(): void {
    super.clearSelection();
    this.remoteController.clearSelection();
  }

  copySelection(): void {
    navigator.clipboard.writeText(
      JSON.stringify({
        inckObject: "selection",
        data: this.selected.map(SerializeGraphic),
      })
    );
  }

  cutSelection(): void {
    this.copySelection();
    this.deleteSelection();
  }

  loadSelection(selected: SerializedGraphic[]) {
    super.loadSelection(selected);
    this.remoteController.loadSelection(selected);
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

  private createUI(): HTMLDivElement {
    const container = this.createContainer();

    // Rotating selection
    container.appendChild(this.createRotateButton());

    // Scaling selection
    container.appendChild(this.createScaleButton());

    // Options menu
    this.menu = this.createMenu();
    container.appendChild(this.menu);

    return container;
  }

  private createContainer() {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.display = "none";
    container.style.outline = `${OUTLINE_WIDTH}in solid rgba(${UI_COLOR})`;
    container.style.borderRadius = "0.02in";
    container.style.cursor = "move";

    // Moving selection
    let pointer: Vector2D;
    let pointerId: number;
    container.addEventListener("pointerdown", e => {
      pointer = new Vector2D(e.x, e.y);
      pointerId = e.pointerId;
      container.setPointerCapture(e.pointerId);
      PointerTracker.pause();
    });
    container.addEventListener("pointermove", e => {
      if (pointer && e.pointerId == pointerId) {
        const newPointer = new Vector2D(e.x, e.y);
        this.setTranslation(V2.sub(newPointer, pointer));
      }
    });
    container.addEventListener("pointerup", e => {
      if (pointer && e.pointerId == pointerId) {
        pointer = null;
        this.applyTranslation();
        PointerTracker.unpause();
      }
    });
    document.body.appendChild(container);

    return container;
  }

  private createMenu() {
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

    const deselectBtn = createBtn(true, false, () => this.deselect());
    deselectBtn.innerHTML = "❌&nbsp;Deselect";

    const copyBtn = createBtn(false, false, () => this.copySelection());
    copyBtn.innerHTML = "📋&nbsp;Copy";

    const cutBtn = createBtn(false, false, () => this.cutSelection());
    cutBtn.innerHTML = "✂️&nbsp;Cut";

    const deleteBtn = createBtn(false, false, () => this.deleteSelection());
    deleteBtn.innerHTML = "🗑️&nbsp;Delete";

    return menu;
  }

  private createRotateButton() {
    const btn = document.createElement("button");
    btn.innerHTML = "R";
    btn.style.backgroundColor = `rgb(${UI_COLOR})`;
    btn.style.color = "#fff";
    btn.style.borderRadius = "9999em";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.padding = "0.08in";
    btn.style.position = "absolute";
    btn.style.top = "50%";
    btn.style.right = `-${OUTLINE_WIDTH / 2}in`;
    btn.style.transform = "translate(50%, -50%)";
    btn.innerHTML = this.rotateIcon();

    let pointer: Vector2D;
    let pointerId: number;

    btn.addEventListener("pointerdown", e => {
      e.stopPropagation();
      pointer = new Vector2D(...View.getCanvasCoords(e.x, e.y));
      pointerId = e.pointerId;
      this.menu.style.visibility = "hidden";
      btn.setPointerCapture(e.pointerId);
      PointerTracker.pause();
    });
    btn.addEventListener("pointermove", e => {
      if (pointer && e.pointerId == pointerId) {
        const newPointer = new Vector2D(...View.getCanvasCoords(e.x, e.y));
        const angle = V2.angle(V2.sub(newPointer, this.selectionCenter), V2.sub(pointer, this.selectionCenter));
        this.setRotation(angle);
      }
    });
    btn.addEventListener("pointerup", e => {
      if (pointer && e.pointerId == pointerId) {
        pointer = null;
        this.applyRotation();
        this.menu.style.visibility = "visible";
        PointerTracker.unpause();
      }
    });

    return btn;
  }

  private createScaleButton() {
    const btn = document.createElement("button");
    btn.innerHTML = "S";
    btn.style.backgroundColor = `rgb(${UI_COLOR})`;
    btn.style.color = "#fff";
    btn.style.borderRadius = "9999em";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.padding = "0.08in";
    //btn.style.width = btn.style.height = "0.3in";
    btn.style.position = "absolute";
    btn.style.top = `-${OUTLINE_WIDTH / 2}in`;
    btn.style.right = `-${OUTLINE_WIDTH / 2}in`;
    btn.style.transform = "translate(50%, -50%)";
    btn.innerHTML = this.scaleIcon();

    let pointer: Vector2D;
    let pointerId: number;

    btn.addEventListener("pointerdown", e => {
      e.stopPropagation();
      pointer = new Vector2D(...View.getCanvasCoords(e.x, e.y));
      pointerId = e.pointerId;
      btn.setPointerCapture(e.pointerId);
      PointerTracker.pause();
    });
    btn.addEventListener("pointermove", e => {
      if (pointer && e.pointerId == pointerId) {
        const newPointer = new Vector2D(...View.getCanvasCoords(e.x, e.y));
        const factor = V2.dist(newPointer, this.selectionCenter) / V2.dist(pointer, this.selectionCenter);
        this.setScaling(factor);
      }
    });
    btn.addEventListener("pointerup", e => {
      if (pointer && e.pointerId == pointerId) {
        pointer = null;
        this.applyScaling();
        PointerTracker.unpause();
      }
    });

    return btn;
  }

  private scaleIcon() {
    return `
      <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="0.25in" width="0.25in" xmlns="http://www.w3.org/2000/svg">
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="3" y1="21" x2="21" y2="3"></line>
      </svg>
    `;
  }

  private rotateIcon() {
    return `
      <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="0.25in" width="0.25in" xmlns="http://www.w3.org/2000/svg">
        <polyline points="1 4 1 10 7 10"></polyline>
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
      </svg>
    `;
  }
}
