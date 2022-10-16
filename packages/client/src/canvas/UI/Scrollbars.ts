import { MutableView, View } from "../View/View";
import { ObservableProperty } from "../DesignPatterns/Observable";
import { PointerTracker } from "./PointerTracker";

const MARGIN = 40;
const HANDLE_SIZE = 60;
const HANDLE_TIME_VISIBLE = 1000;
const FADE_DURATION = "0.3s";

export class ScrollBars {
  private vertical: HTMLDivElement;
  private yMax: ObservableProperty<number>;
  private vAnchor: number;
  private hideHandleTimeout: number;

  private pointer: { x: number; y: number };
  private pointerId: number;
  private scrolling: boolean;

  constructor(yMax: ObservableProperty<number>) {
    this.yMax = yMax;
    this.scrolling = false;

    this.vertical = document.createElement("div");
    this.vertical.style.backgroundColor = "#fff";
    this.vertical.style.height = `${HANDLE_SIZE}px`;
    this.vertical.style.width = `${HANDLE_SIZE}px`;
    this.vertical.style.left = `${-HANDLE_SIZE / 6}px`;
    this.vertical.style.position = "absolute";
    this.vertical.style.zIndex = "100";
    this.vertical.style.borderRadius = "9999px";
    this.vertical.style.cursor = "pointer";
    this.vertical.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.25), 0px 10px 30px rgba(0, 0, 0, 0.05)";
    this.vertical.style.display = "flex";
    this.vertical.style.alignItems = "center";
    this.vertical.style.justifyContent = "center";
    this.vertical.style.paddingLeft = `${-HANDLE_SIZE / 10}px`;
    this.vertical.style.opacity = "0%";
    this.vertical.style.transition = `visibility ${FADE_DURATION} linear, opacity ${FADE_DURATION} linear`;
    this.vertical.style.transform = "translate(0, -50%)";
    this.vertical.style.visibility = "hidden";
    this.vertical.innerHTML = `
      <span class="material-symbols-outlined" style="font-size: ${Math.floor(HANDLE_SIZE * 0.6)}px; color: #ddd">
      drag_indicator
      </span>
    `;
    document.body.appendChild(this.vertical);

    View.onUpdate(() => this.showHandle());
    View.onUpdate(() => this.updateHandle());
    yMax.onUpdate(() => this.updateHandle());

    window.addEventListener("resize", () => this.updateHandle());

    this.vertical.addEventListener("pointerdown", (e) => this.handlePointerDown(e));
    window.addEventListener("pointermove", (e) => this.handlePointerMove(e));
    window.addEventListener("pointerup", (e) => this.handlePointerUp(e));
  }

  private handlePointerDown(e: PointerEvent) {
    if (this.scrolling) return;

    this.scrolling = true;
    this.pointer = { x: e.x, y: e.y };
    this.pointerId = e.pointerId;
    this.vAnchor = View.getTop();
    PointerTracker.instance.pause();
  }

  private handlePointerMove(e: PointerEvent) {
    if (this.scrolling) {
      if (this.pointerId == e.pointerId) {
        const { x: px, y: py } = this.pointer;
        const pageHeight = Math.max(this.yMax.get() - View.getHeight(), this.vAnchor);
        let dy = ((e.y - py) / (innerHeight - 2 * MARGIN)) * pageHeight;
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
        this.vAnchor = null;
        this.updateHandle();
        PointerTracker.instance.unpause();
      }
    }
  }

  private updateHandle() {
    const pageSize = Math.max(this.yMax.get() - View.getHeight(), this.vAnchor ?? View.getTop());
    const barPos = View.getTop() / pageSize;
    const barRange = innerHeight - 2 * MARGIN;

    this.vertical.style.top = `${MARGIN + barPos * barRange}px`;
  }

  private showHandle() {
    this.vertical.style.visibility = "visible";
    this.vertical.style.opacity = "80%";

    if (this.hideHandleTimeout) {
      window.clearTimeout(this.hideHandleTimeout);
    }

    const handleTimeout = () => {
      if (!this.scrolling) {
        this.vertical.style.visibility = "hidden";
        this.vertical.style.opacity = "0%";
        this.hideHandleTimeout = null;
      } else {
        this.hideHandleTimeout = window.setTimeout(handleTimeout, HANDLE_TIME_VISIBLE);
      }
    };

    this.hideHandleTimeout = window.setTimeout(handleTimeout, HANDLE_TIME_VISIBLE);
  }
}
