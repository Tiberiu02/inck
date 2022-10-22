import { MutableView, View } from "../View/View";
import { ObservableProperty } from "../DesignPatterns/Observable";
import { PointerTracker } from "./PointerTracker";
import { RenderLoop } from "../Rendering/RenderLoop";

const MARGIN = 40;
const HANDLE_SIZE = 60;
const HANDLE_TIME_VISIBLE = 1000;
const FADE_DURATION = 300;

export class ScrollBars {
  private handle: HTMLDivElement;
  private yMax: ObservableProperty<number>;
  private pageSize: number;
  private lastUpdate: number;

  private pointer: { x: number; y: number };
  private pointerId: number;
  private scrolling: boolean;

  constructor(yMax: ObservableProperty<number>) {
    this.yMax = yMax;
    this.scrolling = false;
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

    View.onUpdate(() => this.showHandle());
    yMax.onUpdate(() => this.updateHandle());
    RenderLoop.onRender(() => this.updateHandle());

    window.addEventListener("resize", () => this.updateHandle());

    this.handle.addEventListener("pointerdown", (e) => this.handlePointerDown(e));
    window.addEventListener("pointermove", (e) => this.handlePointerMove(e));
    window.addEventListener("pointerup", (e) => this.handlePointerUp(e));
  }

  private handlePointerDown(e: PointerEvent) {
    if (this.scrolling) return;

    this.scrolling = true;
    this.pointer = { x: e.x, y: e.y };
    this.pointerId = e.pointerId;
    this.pageSize = View.getTop();
    PointerTracker.instance.pause();
  }

  private handlePointerMove(e: PointerEvent) {
    if (this.scrolling) {
      if (this.pointerId == e.pointerId) {
        const pageHeight = Math.max(this.yMax.get() - View.getHeight(), this.pageSize);

        let dy = e.y - this.pointer.y;
        dy = (dy / (innerHeight - 2 * MARGIN)) * pageHeight;
        dy = Math.min(dy, pageHeight - View.getTop());
        MutableView.applyTranslation(0, dy);

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
      }
    }
  }

  private updateHandle() {
    const pageSize = Math.max(this.yMax.get() - View.getHeight(), this.pageSize ?? View.getTop());
    const barPos = View.getTop() / pageSize;
    const barRange = innerHeight - 2 * MARGIN;

    this.handle.style.top = `${MARGIN + barPos * barRange}px`;

    const opacity = 1 - (Date.now() - this.lastUpdate - HANDLE_TIME_VISIBLE) / FADE_DURATION;
    if (opacity > 0) {
      this.handle.style.visibility = "visible";
      this.handle.style.opacity = `${Math.min(1, opacity) * 80}%`;
      window.requestAnimationFrame(this.updateHandle.bind(this));
    } else {
      this.handle.style.visibility = "hidden";
    }
  }

  private showHandle() {
    this.lastUpdate = Date.now();
  }
}
