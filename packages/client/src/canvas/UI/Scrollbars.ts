import { MutableView, View } from "../View/View";
import { ObservableProperty } from "../DesignPatterns/Observable";
import { PointerTracker } from "./PointerTracker";
import { RenderLoop } from "../Rendering/RenderLoop";
import { Display } from "../DeviceProps";

const MARGIN = 40;
const HANDLE_SIZE = 60;
const HANDLE_TIME_VISIBLE = 1000;
const FADE_DURATION = 300;
const HANDLE_OPACITY = 80; // %

enum States {
  VISIBLE,
  FADING_OUT,
  HIDDEN,
}

export class ScrollBars {
  private handle: HTMLDivElement;
  private yMax: ObservableProperty<number>;
  private pageSize: number;
  private lastUpdate: number;
  private state: States;

  private pointer: { x: number; y: number };
  private pointerId: number;
  private scrolling: boolean;

  constructor(yMax: ObservableProperty<number>) {
    this.yMax = yMax;
    this.scrolling = false;
    this.state = States.HIDDEN;
    this.lastUpdate = 0;

    this.handle = document.createElement("div");
    this.handle.style.backgroundColor = "#fff";
    this.handle.style.height = `${HANDLE_SIZE}px`;
    this.handle.style.width = `${HANDLE_SIZE}px`;
    this.handle.style.left = `${-HANDLE_SIZE / 6}px`;
    this.handle.style.position = "absolute";
    this.handle.style.zIndex = "100";
    this.handle.style.borderRadius = "9999px";
    this.handle.style.cursor = "pointer";
    this.handle.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.25), 0px 10px 30px rgba(0, 0, 0, 0.05)";
    this.handle.style.display = "flex";
    this.handle.style.alignItems = "center";
    this.handle.style.justifyContent = "center";
    this.handle.style.paddingLeft = `${-HANDLE_SIZE / 10}px`;
    this.handle.style.opacity = "0%";
    this.handle.style.transition = `visibility ${FADE_DURATION} linear, opacity ${FADE_DURATION} linear`;
    this.handle.style.transform = "translate(0, -50%)";
    this.handle.style.visibility = "hidden";
    this.handle.innerHTML = `
      <span class="material-symbols-outlined" style="font-size: ${Math.floor(HANDLE_SIZE * 0.6)}px; color: #ddd">
      drag_indicator
      </span>
    `;
    document.body.appendChild(this.handle);

    View.instance.onUpdate(() => this.showHandle());
    // RenderLoop.onRender(this.updateHandle.bind(this), false);

    this.handle.addEventListener("pointerdown", (e) => this.handlePointerDown(e));
  }

  private handlePointerDown(e: PointerEvent) {
    if (this.scrolling) return;

    this.scrolling = true;
    this.pointer = { x: e.x, y: e.y };
    this.pointerId = e.pointerId;
    this.pageSize = View.instance.getTop();
    PointerTracker.instance.pause();

    window.addEventListener("pointermove", this.handlePointerMove.bind(this));
    window.addEventListener("pointerup", this.handlePointerUp.bind(this));
  }

  private handlePointerMove(e: PointerEvent) {
    if (this.scrolling) {
      if (this.pointerId == e.pointerId) {
        const pageHeight = Math.max(this.yMax.get() - View.instance.getHeight(), this.pageSize);

        let dy = e.y - this.pointer.y;
        dy = (dy / (innerHeight - 2 * MARGIN)) * pageHeight;
        dy = Math.min(dy, pageHeight - View.instance.getTop());
        MutableView.instance.applyTranslation(0, dy);

        this.pointer = { x: e.x, y: e.y };
      }
    }
  }

  private handlePointerUp(e: PointerEvent) {
    if (this.scrolling) {
      if (this.pointerId == e.pointerId) {
        this.scrolling = false;
        this.pageSize = null;
        this.updateHandle();
        PointerTracker.instance.unpause();

        window.removeEventListener("pointermove", this.handlePointerMove.bind(this));
        window.removeEventListener("pointerup", this.handlePointerUp.bind(this));
      }
    }
  }

  private updateHandle() {
    const opacityF = 1 - (Date.now() - this.lastUpdate - HANDLE_TIME_VISIBLE) / FADE_DURATION;
    const opacity = Math.max(0, Math.min(1, opacityF));

    if (this.state == States.VISIBLE) {
      const pageSize = Math.max(this.yMax.get() - View.instance.getHeight(), this.pageSize ?? View.instance.getTop());
      const barPos = View.instance.getTop() / pageSize;
      const barRange = Display.Height - 2 * MARGIN;

      this.handle.style.top = `${MARGIN + barPos * barRange}px`;

      if (opacity < 1) {
        this.state = States.FADING_OUT;
      }
    } else if (this.state == States.FADING_OUT) {
      this.handle.style.opacity = `${Math.min(1, opacity) * HANDLE_OPACITY}%`;

      if (opacity >= 1) {
        this.state = States.VISIBLE;
      } else if (opacity == 0) {
        this.state = States.HIDDEN;
        this.handle.style.visibility = "hidden";
      }
    } else if (this.state == States.HIDDEN) {
      if (opacity > 0) {
        this.handle.style.visibility = "visible";
        this.handle.style.opacity = `${Math.min(1, opacity) * HANDLE_OPACITY}%`;
        this.state = States.VISIBLE;
      }
    }
  }

  private showHandle() {
    this.lastUpdate = Date.now();
  }
}
