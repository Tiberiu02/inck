import { LayeredStrokeContainer } from "../../LayeredStrokeContainer";
import { Display } from "../../DeviceProps";
import {
  PersistentGraphic,
  RemovedGraphic,
  SerializeGraphic,
  Serializers,
  TranslatePersistentGraphic,
} from "../../Drawing/Graphic";
import { UniteRectangles } from "../../Math/Geometry";
import { View } from "../../View/View";
import { ActionStack } from "../ActionsStack";
import { MyTool } from "../Tool";
import { PointerTracker } from "../../UI/PointerTracker";
import { NetworkConnection } from "../../Network/NetworkConnection";
import { V2, Vector2D } from "../../Math/V2";
import { SelectionBase } from "./SelectionBase";
import { EmitterSelection, SelectionController, SerializedSelection } from "./TheirSelection";
import { Icons } from "../../UI/Icons";

const UI_COLOR = [115, 160, 255];
const OUTLINE_WIDTH = 0.05;
const MENU_TOP_MARGIN = 0.15; //in
const PADDING_SIZE = 0.4; // in

export class MySelection extends SelectionBase implements MyTool {
  private actionStack: ActionStack;
  private network: NetworkConnection;
  private ui: HTMLDivElement;

  private remoteController: SelectionController;
  private keyHandler: (e: KeyboardEvent) => void;
  private menu: HTMLElement;
  private padding: number;

  constructor(strokeContainer: LayeredStrokeContainer, actionStack: ActionStack, network: NetworkConnection) {
    super(strokeContainer);

    this.selected = [];
    this.actionStack = actionStack;
    this.network = network;
    this.ui = this.createUI();
    this.padding = PADDING_SIZE;

    this.network.setTool(this.serialize());
    this.remoteController = new EmitterSelection(network);

    this.keyHandler = (e: KeyboardEvent) => {
      console.log(e.code, e);
      if (this.selected.length) {
        if (e.code == "KeyC" && e.ctrlKey) {
          this.copySelection();
        } else if (e.code == "KeyX" && e.ctrlKey) {
          this.cutSelection();
        }
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
        this.selected.forEach((d) => this.strokeContainer.add(RemovedGraphic(d.id)));
      }
    }
  }

  updateSelection(newSelection: PersistentGraphic[]): void {
    super.updateSelection(newSelection);
    this.remoteController.loadSelection(newSelection.map(SerializeGraphic));
  }

  private registerAction(initialSelection: PersistentGraphic[]) {
    const equal = (a: PersistentGraphic[], b: PersistentGraphic[]) =>
      a.map((e) => e.id).join(" ") == b.map((e) => e.id).join(" ");

    const newSelection = this.selected;
    this.actionStack.push({
      undo: () => {
        if (equal(this.selected, newSelection)) {
          this.updateSelection(initialSelection);
          return true;
        } else {
          let success = false;
          for (const e of initialSelection) {
            //this.strokeContainer.add(RemovedGraphic(e.id));
            this.strokeContainer.add(e);
            success = true;
          }
          return success;
        }
      },
      redo: () => {
        if (equal(this.selected, initialSelection)) {
          this.updateSelection(newSelection);
        } else {
          for (const e of newSelection) {
            //if (this.strokeContainer.remove(e.id)) {
            this.strokeContainer.add(e);
            //}
          }
        }
      },
    });
  }

  setTranslation({ x, y }: Vector2D): void {
    super.setTranslation({ x, y });
    this.remoteController.setTranslation({ x, y });
  }

  applyTranslation() {
    const initialSelection = this.selected;

    super.applyTranslation();
    this.remoteController.applyTranslation();

    this.registerAction(initialSelection);
  }

  setRotation(angle: number): void {
    super.setRotation(angle);
    this.remoteController.setRotation(angle);
  }

  applyRotation() {
    const initialSelection = this.selected;

    super.applyRotation();
    this.remoteController.applyRotation();

    this.registerAction(initialSelection);
  }

  setScaling(factor: number): void {
    super.setScaling(factor);
    this.remoteController.setScaling(factor);
  }

  applyScaling() {
    const initialSelection = this.selected;

    this.padding *= this.toScaleBy;
    super.applyScaling();
    this.remoteController.applyScaling();

    this.registerAction(initialSelection);
  }

  render(layerRendered: number): void {
    super.render(layerRendered);

    if (layerRendered == 0) {
      if (this.selected.length) {
        const box = this.selected.map((d) => d.geometry.boundingBox).reduce(UniteRectangles);
        const [sw, sh] = [(box.xMax - box.xMin) / 2, (box.yMax - box.yMin) / 2];
        const [cx, cy] = [box.xMin + sw, box.yMin + sh];
        const { x, y } = this.toTranslateBy;

        const x1 = View.instance.getScreenX(cx - sw * this.toScaleBy + x);
        const y1 = View.instance.getScreenY(cy - sh * this.toScaleBy + y);
        const x2 = View.instance.getScreenX(cx + sw * this.toScaleBy + x);
        const y2 = View.instance.getScreenY(cy + sh * this.toScaleBy + y);
        const w = this.padding * Display.DPI * this.toScaleBy;

        this.ui.style.left = `${x1 - w}px`;
        this.ui.style.top = `${y1 - w}px`;
        this.ui.style.width = `${x2 - x1 + 2 * w}px`;
        this.ui.style.height = `${y2 - y1 + 2 * w}px`;
        this.ui.style.visibility = "visible";
        this.ui.style.transform = `rotate(${this.toRotateBy}rad)`;
      } else {
        this.ui.style.visibility = "hidden";
      }
    }
  }

  release(): void {
    this.deselect();
  }

  clearSelection(): void {
    this.padding = PADDING_SIZE;
    super.clearSelection();
  }

  deselect(): void {
    this.selected.forEach((d) => this.strokeContainer.add(d));
    this.clearSelection();
    this.remoteController.clearSelection();
  }

  deleteSelection(): void {
    const selection = this.selected;
    this.actionStack.push({
      undo: () => {
        selection.forEach((e) => this.strokeContainer.add({ ...e, timestamp: Date.now() }));
        return true;
      },
      redo: () => {
        selection.forEach((e) => this.strokeContainer.add(RemovedGraphic(e.id)));
      },
    });

    this.clearSelection();
    this.remoteController.clearSelection();
  }

  copySelection(delesect: boolean = true): void {
    navigator.clipboard.writeText(
      JSON.stringify({
        inckObject: "selection",
        data: this.selected.map(SerializeGraphic),
      })
    );
    if (delesect) {
      this.deselect();
    }
  }

  cutSelection(): void {
    this.copySelection(false);
    this.deleteSelection();
  }

  translateToCenter() {
    this.setTranslation(V2.sub(View.instance.center, this.selectionCenter));
    this.applyTranslation();
  }

  duplicateSelection() {
    const selected = this.selected;
    this.deselect();
    this.paste(selected);
  }

  paste(selection: PersistentGraphic[]) {
    // Update IDs
    selection = selection.map((s) => ({
      ...s,
      id: Math.random().toString(36).slice(2),
    }));

    this.selected = selection;
    this.computeSelectionCenter();

    const d = V2.sub(View.instance.center, this.selectionCenter);
    selection = selection.map((s) => TranslatePersistentGraphic(s, d.x, d.y));

    this.updateSelection(selection);

    this.actionStack.push({
      undo: () => {
        if (this.selected == selection) {
          this.deleteSelection();
          return true;
        } else {
          selection.forEach((e) => this.strokeContainer.add(RemovedGraphic(e.id)));
          //return selection.map((e) => this.strokeContainer.remove(e.id)).every((s) => s);
          return true;
        }
      },
      redo: () => {
        selection.forEach((e) => this.strokeContainer.add(e));
      },
    });
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
    container.style.visibility = "hidden";
    container.style.outline = `${OUTLINE_WIDTH}in solid rgba(${UI_COLOR})`;
    container.style.borderRadius = "0.02in";
    container.style.cursor = "move";

    // Moving selection
    let pointer: Vector2D;
    let pointerId: number;
    const handlePointerMove = (e: PointerEvent) => {
      if (pointer && e.pointerId == pointerId) {
        const x = View.instance.getCanvasX(e.x);
        const y = View.instance.getCanvasY(e.y);
        const newPointer = new Vector2D(x, y);
        this.setTranslation(V2.sub(newPointer, pointer));
      }
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pointer && e.pointerId == pointerId) {
        pointer = null;
        this.applyTranslation();
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        PointerTracker.instance.unpause();
      }
    };
    container.addEventListener("pointerdown", (e) => {
      const x = View.instance.getCanvasX(e.x);
      const y = View.instance.getCanvasY(e.y);
      pointer = new Vector2D(x, y);
      pointerId = e.pointerId;
      PointerTracker.instance.pause();
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    });
    document.body.appendChild(container);

    return container;
  }

  private createMenu() {
    const menu = document.createElement("div");
    menu.style.display = "flex";
    menu.style.flexDirection = "row";
    menu.style.padding = "0em 0.55em";
    menu.style.backgroundColor = "rgba(255, 255, 255, 1)";
    menu.style.position = "absolute";
    menu.style.overflow = "hidden";
    menu.style.bottom = `-${OUTLINE_WIDTH + MENU_TOP_MARGIN}in`;
    menu.style.left = "50%";
    menu.style.transform = "translate(-50%, 100%)";
    menu.style.borderRadius = "9999em";
    menu.style.boxShadow = "0 2px 13px rgba(0, 0, 0, 0.1), 0 1px 5px rgb(0, 0, 0, 0.25)";
    menu.style.alignItems = "center";

    const createBtn = (cb: Function) => {
      const btn = document.createElement("div");
      btn.style.padding = `0.5em 0.5em`;
      btn.style.cursor = "pointer";
      btn.style.display = "flex";
      menu.appendChild(btn);

      let pressed = false;
      btn.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        btn.style.backgroundColor = "rgba(240, 240, 240, 1)";
        pressed = true;
      });
      btn.addEventListener("pointerout", (e) => {
        btn.style.backgroundColor = "";
        pressed = false;
      });
      btn.addEventListener("pointerup", (e) => {
        btn.style.backgroundColor = "";
        if (pressed) {
          cb();
          pressed = false;
        }
      });
      return btn;
    };

    const duplicate = createBtn(() => this.duplicateSelection());
    duplicate.innerHTML = `${Icons.Duplicate("#388e3c")}`;

    const copyBtn = createBtn(() => this.copySelection());
    copyBtn.innerHTML = `${Icons.Copy("#0288d1")}`;

    const cutBtn = createBtn(() => this.cutSelection());
    cutBtn.innerHTML = `${Icons.Cut("#f9a825")}`;

    const deleteBtn = createBtn(() => this.deleteSelection());
    deleteBtn.innerHTML = `${Icons.Delete("#d32f2f")}`;

    const separator = document.createElement("div");
    separator.style.width = "2px";
    separator.style.borderRadius = "1px";
    separator.style.height = "1.5em";
    separator.style.margin = "0 0.2rem 0 0.4rem";
    separator.style.backgroundColor = "#CCC";
    menu.appendChild(separator);

    const deselectBtn = createBtn(() => this.deselect());
    deselectBtn.innerHTML = `${Icons.Check("#999")}`;

    this.menu = menu;
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

    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      const x = View.instance.getCanvasX(e.x);
      const y = View.instance.getCanvasY(e.y);
      pointer = new Vector2D(x, y);
      pointerId = e.pointerId;
      this.menu.style.visibility = "hidden";
      PointerTracker.instance.pause();
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    });
    const handlePointerMove = (e: PointerEvent) => {
      if (pointer && e.pointerId == pointerId) {
        const x = View.instance.getCanvasX(e.x);
        const y = View.instance.getCanvasY(e.y);
        const newPointer = new Vector2D(x, y);
        const angle = V2.angle(V2.sub(newPointer, this.selectionCenter), V2.sub(pointer, this.selectionCenter));
        this.setRotation(angle);
      }
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pointer && e.pointerId == pointerId) {
        pointer = null;
        this.applyRotation();
        this.menu.style.visibility = "";
        PointerTracker.instance.unpause();
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      }
    };

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

    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      const x = View.instance.getCanvasX(e.x);
      const y = View.instance.getCanvasY(e.y);
      pointer = new Vector2D(x, y);
      pointerId = e.pointerId;
      PointerTracker.instance.pause();
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    });
    const handlePointerMove = (e: PointerEvent) => {
      if (pointer && e.pointerId == pointerId) {
        const x = View.instance.getCanvasX(e.x);
        const y = View.instance.getCanvasY(e.y);
        const newPointer = new Vector2D(x, y);
        const factor = V2.dist(newPointer, this.selectionCenter) / V2.dist(pointer, this.selectionCenter);
        this.setScaling(factor);
      }
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pointer && e.pointerId == pointerId) {
        pointer = null;
        this.applyScaling();
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        PointerTracker.instance.unpause();
      }
    };

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
