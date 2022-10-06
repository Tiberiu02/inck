import { MutableView, View } from "../View/View";
import { ObservableProperty } from "../DesignPatterns/Observable";
import { Display } from "../DeviceProps";
import { PointerTracker } from "./PointerTracker";

enum Direction {
  HORIZONTAL,
  VERTICAL,
}

export class ScrollBars {
  private width: any;
  private margin: any;
  private vertical: HTMLDivElement;
  private horizontal: HTMLDivElement;
  private yMax: ObservableProperty<number>;
  private vAnchor: number;
  private vBarHeight: number;

  private scrollDirection: Direction;
  private pointer: { x: number; y: number };
  private pointerId: number;
  private scrolling: boolean;

  constructor(yMax: ObservableProperty<number>) {
    this.yMax = yMax;
    this.width = 10;
    this.margin = 0;
    this.scrolling = false;

    const style = {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      position: "fixed",
      width: "0px",
      height: "0px",
      borderRadius: `${this.width / 2}px`,
      zIndex: "100",
    };

    this.vertical = document.createElement("div");
    Object.assign(this.vertical.style, style);
    document.body.appendChild(this.vertical);

    this.horizontal = document.createElement("div");
    Object.assign(this.horizontal.style, style);
    document.body.appendChild(this.horizontal);

    View.onUpdate(() => this.updateBars());
    yMax.onUpdate(() => this.updateBars());

    window.addEventListener("resize", () => this.updateBars());

    this.vertical.addEventListener("pointerdown", (e) => this.handlePointerDown(Direction.VERTICAL, e));
    this.horizontal.addEventListener("pointerdown", (e) => this.handlePointerDown(Direction.HORIZONTAL, e));
    window.addEventListener("pointermove", (e) => this.handlePointerMove(e));
    window.addEventListener("pointerup", (e) => this.handlePointerUp(e));
  }

  private handlePointerDown(direction: Direction, e: PointerEvent) {
    if (this.scrolling) return;

    this.scrolling = true;
    this.scrollDirection = direction;
    this.pointer = { x: e.x, y: e.y };
    this.pointerId = e.pointerId;
    this.vAnchor = View.getTop();
    PointerTracker.pause();
  }

  private handlePointerMove(e: PointerEvent) {
    if (this.scrolling) {
      if (this.pointerId == e.pointerId) {
        const { x: px, y: py } = this.pointer;
        if (this.scrollDirection == Direction.VERTICAL) {
          const pageHeight = Math.max(this.yMax.get() - View.getHeight(), this.vAnchor);
          let dy = ((e.y - py) / (innerHeight - 3 * this.margin - this.width - this.vBarHeight)) * pageHeight;
          dy = Math.min(dy, pageHeight - View.getTop());
          MutableView.applyTranslation(0, dy);
        } else {
          const dx = (e.x - px) / (innerWidth - 3 * this.margin - this.width);
          MutableView.applyTranslation(dx, 0);
        }
        this.pointer = { x: e.x, y: e.y };
      }
    }
  }

  private handlePointerUp(e: PointerEvent) {
    if (this.scrolling) {
      if (this.pointerId == e.pointerId) {
        this.scrolling = false;
        this.vAnchor = null;
        this.updateBars();
        PointerTracker.unpause();
      }
    }
  }

  private updateBars() {
    const hLen = View.getWidth();
    const hStart = View.getLeft();
    const hFullLen = Display.Width - 3 * this.margin - this.width;

    Object.assign(this.horizontal.style, {
      display: hLen == 1 || MutableView.maxWidth ? "none" : "",
      bottom: `${this.margin}px`,
      height: `${this.width}px`,
      left: `${this.margin + hStart * hFullLen}px`,
      width: `${hLen * hFullLen}px`,
    });

    const vSize = Math.max(this.yMax.get(), (this.vAnchor ?? View.getTop()) + View.getHeight());
    const vLen = hLen / Display.AspectRatio / vSize;
    const vStart = View.getTop() / vSize;
    let vFullLen = Display.Height - 2 * this.margin - this.margin - this.width;

    this.vBarHeight = vLen * vFullLen;
    if (this.vBarHeight < this.width) {
      vFullLen -= this.width - this.vBarHeight;
      this.vBarHeight = this.width;
    }

    Object.assign(this.vertical.style, {
      display: vLen == 1 ? "none" : "",
      right: `${this.margin}px`,
      width: `${this.width}px`,
      top: `${this.margin + vStart * vFullLen}px`,
      height: `${this.vBarHeight}px`,
    });
  }
}
