import { MutableView } from "../View/View";
import { ObservableNumber } from "../DesignPatterns/Observable";
import { Display } from "./DisplayProps";

enum Direction {
  HORIZONTAL,
  VERTICAL,
}

export class ScrollBars {
  view: MutableView;
  width: any;
  margin: any;
  vertical: HTMLDivElement;
  horizontal: HTMLDivElement;
  yMax: ObservableNumber;
  vAnchor: number;
  vBarHeight: number;

  scrolling: boolean;
  scrollDirection: Direction;
  pointer: { x: number; y: number };
  pointerId: number;

  constructor(view: MutableView, yMax: ObservableNumber) {
    this.view = view;
    this.yMax = yMax;
    this.width = 10;
    this.margin = 0;
    this.scrolling = false;

    const style = {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      position: "absolute",
      width: "0px",
      height: "0px",
      borderRadius: `${this.width / 2}px`,
    };

    this.vertical = document.createElement("div");
    Object.assign(this.vertical.style, style);
    document.body.appendChild(this.vertical);

    this.horizontal = document.createElement("div");
    Object.assign(this.horizontal.style, style);
    document.body.appendChild(this.horizontal);

    view.onUpdate(() => this.updateBars());
    yMax.onUpdate(() => this.updateBars());

    window.addEventListener("resize", () => this.updateBars());

    this.vertical.addEventListener("pointerdown", e => this.handlePointerDown(Direction.VERTICAL, e));
    this.horizontal.addEventListener("pointerdown", e => this.handlePointerDown(Direction.HORIZONTAL, e));
    window.addEventListener("pointermove", e => this.handlePointerMove(e));
    window.addEventListener("pointerup", e => this.handlePointerUp(e));
  }

  handlePointerDown(direction: Direction, e: PointerEvent) {
    if (this.scrolling) return;

    this.scrolling = true;
    this.scrollDirection = direction;
    this.pointer = { x: e.x, y: e.y };
    this.pointerId = e.pointerId;
    this.vAnchor = this.view.getTop();
  }

  handlePointerMove(e: PointerEvent) {
    if (this.scrolling) {
      if (this.pointerId == e.pointerId) {
        const { x: px, y: py } = this.pointer;
        if (this.scrollDirection == Direction.VERTICAL) {
          const pageHeight = Math.max(this.yMax.get() - this.view.getHeight(), this.vAnchor);
          let dy = ((e.y - py) / (innerHeight - 3 * this.margin - this.width - this.vBarHeight)) * pageHeight;
          dy = Math.min(dy, pageHeight - this.view.getTop());
          this.view.applyTranslation(0, dy);
        } else {
          const dx = (e.x - px) / (innerWidth - 3 * this.margin - this.width);
          this.view.applyTranslation(dx, 0);
        }
        this.pointer = { x: e.x, y: e.y };
      }
    }
  }

  handlePointerUp(e: PointerEvent) {
    if (this.scrolling) {
      if (this.pointerId == e.pointerId) {
        this.scrolling = false;
        this.vAnchor = null;
        this.updateBars();
      }
    }
  }

  // handlePointerEvent(e: PointerEvent) {
  //   if (e.target != this.horizontal && e.target != this.vertical && !this.scrolling()) {
  //     return;
  //   }

  //   e.stopPropagation();

  //   let { pointerId, x, y, pressure } = e;

  //   if (pressure) {
  //     e.preventDefault();

  //     if (!this.scrollDirection) this.scrollDirection = e.target == this.horizontal ? "horizontal" : "vertical";

  //     if (this.pointers[pointerId]) {
  //       const p = this.pointers[pointerId];
  //       if (this.scrollDirection == "vertical") {
  //         const dy = ((y - p.y) / (innerHeight - 3 * this.margin - this.width)) * this.yMax.get();
  //         this.view.applyTranslation(0, dy);
  //       } else {
  //         const dx = (x - p.x) / (innerWidth - 3 * this.margin - this.width);
  //         this.view.applyTranslation(dx, 0);
  //       }
  //     }

  //     this.pointers[pointerId] = { x, y };
  //   } else {
  //     this.pointers = [];
  //     delete this.scrollDirection;
  //   }
  // }

  getYMax() {
    return Math.max(this.yMax.get(), this.view.getCanvasCoords(0, innerHeight)[1]);
  }

  private updateBars() {
    const hLen = 1 / this.view.getZoom();
    const hStart = this.view.getLeft();
    const hFullLen = Display.Width() - 3 * this.margin - this.width;

    Object.assign(this.horizontal.style, {
      display: hLen == 1 ? "none" : "",
      bottom: `${this.margin}px`,
      height: `${this.width}px`,
      left: `${this.margin + hStart * hFullLen}px`,
      width: `${hLen * hFullLen}px`,
    });

    const vSize = Math.max(this.getYMax(), (this.vAnchor ?? this.view.getTop()) + this.view.getHeight());
    const vLen = hLen / Display.AspectRatio() / vSize;
    const vStart = this.view.getTop() / vSize;
    let vFullLen = Display.Height() - 2 * this.margin - this.margin - this.width;

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
