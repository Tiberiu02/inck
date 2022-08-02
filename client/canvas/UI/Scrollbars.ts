import { MutableView } from "../View/View";
import { ObservableNumber } from "../Observable";
import { SimplePointerEvent } from "../types";
import { Display } from "./DisplayProps";

export class ScrollBars {
  view: MutableView;
  width: any;
  margin: any;
  pointers: { x: number; y: number }[];
  vertical: HTMLDivElement;
  horizontal: HTMLDivElement;
  scrollDirection: any;
  yMax: ObservableNumber;
  vBarHeight: number;

  constructor(view: MutableView, yMax: ObservableNumber) {
    this.view = view;
    this.yMax = yMax;
    this.width = 10;
    this.margin = 0;
    this.yMax = yMax;
    this.pointers = [];

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

    view.addListener(() => this.updateBars());
    yMax.addListener(() => this.updateBars());
  }

  handlePointerEvent(e: SimplePointerEvent) {
    if (e.target != this.horizontal && e.target != this.vertical && !this.scrolling()) {
      return;
    }

    let { pointerId, x, y, pressure } = e;

    if (pressure) {
      e.preventDefault();

      if (!this.scrollDirection) this.scrollDirection = e.target == this.horizontal ? "horizontal" : "vertical";

      if (this.pointers[pointerId]) {
        const p = this.pointers[pointerId];
        if (this.scrollDirection == "vertical") {
          const dy = ((y - p.y) / (innerHeight - 3 * this.margin - this.width)) * this.yMax.get();
          this.view.applyTranslation(0, dy);
        } else {
          const dx = (x - p.x) / (innerWidth - 3 * this.margin - this.width);
          this.view.applyTranslation(dx, 0);
        }
      }

      this.pointers[pointerId] = { x, y };
    } else {
      this.pointers = [];
      //delete this.yMax;
      delete this.scrollDirection;
    }
  }

  scrolling(): boolean {
    return this.pointers.length > 0;
  }

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

    const vSize = Math.max(this.getYMax(), this.view.getTop() + 1 / this.view.getZoom() / Display.AspectRatio());
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
