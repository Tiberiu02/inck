/**
 * EXPLANATION OF THE VIEW GEOMETRY
 *
 *
 *        0                        1
 *        +------------------------+----------> x
 *        |                        |
 *        |                        |
 *        |                        |
 *        |    +--------+          |
 *        |    |        |          |
 *        |    |        |          |
 *        |    +--------+  VIEW    |
 *        |                        |
 *        |                        |
 *        |                        |
 *        |                        |
 *        |                        |
 *        +------------------------+  CANVAS
 *        |
 *        |
 *        V
 *        y
 *
 * The canvas is a rectangle of width=1 and variable height.
 * Top-left corner is mapped to the origin: (x=0, y=0).
 * Top-right corner is mapped to (x=1, y=0).
 * Everything else has 0 <= x <= 1 and y >= 0.
 *
 * The view is a rectangle comletely included in the canvas rectangle.
 * The view is determined by its top-left corner, which is located at (x=this.left, y=this.top).
 * The view width is equal to 1.0/this.zoom.
 * The view has the same aspect ratio as the screen.
 */

import { Display } from "../DeviceProps";

export class View {
  protected static top: number;
  protected static left: number;
  protected static zoom: number;
  private static listeners: (() => void)[];

  protected static ensureInstance() {
    if (!this.listeners) {
      this.top = 0;
      this.left = 0;
      this.zoom = 1;
      this.listeners = [];
    }
  }

  static onUpdate(listener: () => void) {
    this.ensureInstance();
    this.listeners.push(listener);
  }

  protected static registerUpdate() {
    this.ensureInstance();
    for (const listener of this.listeners) {
      listener();
    }
  }

  static getTop() {
    this.ensureInstance();
    return this.top;
  }
  static getLeft() {
    this.ensureInstance();
    return this.left;
  }
  static getZoom() {
    this.ensureInstance();
    return this.zoom;
  }
  static getWidth() {
    this.ensureInstance();
    return 1 / this.zoom;
  }
  static getHeight() {
    this.ensureInstance();
    return 1 / this.zoom / Display.AspectRatio();
  }

  // Map screen coordinates to canvas coordinates
  static getCanvasCoords(x: number, y: number, isDistance: boolean = false): [number, number] {
    this.ensureInstance();

    x /= Display.Width() * this.zoom;
    y /= Display.Width() * this.zoom;
    if (!isDistance) {
      x += this.left;
      y += this.top;
    }
    return [x, y];
  }

  static getScreenCoords(x: number, y: number, isDistance: boolean = false): [number, number] {
    this.ensureInstance();

    if (!isDistance) {
      x -= this.left;
      y -= this.top;
    }
    x *= Display.Width() * this.zoom;
    y *= Display.Width() * this.zoom;
    return [x, y];
  }
}

export class MutableView extends View {
  static maxWidth: number;

  private static clip() {
    View.top = Math.max(0, View.top);
    const W = this.maxWidth || 1;
    View.left = Math.max(0.5 - W / 2, Math.min(0.5 + W / 2 - 1 / View.zoom, View.left));
    View.zoom = Math.max(1 / W, Math.min(10, View.zoom));
  }

  static applyZoom(centerX: number, centerY: number, zoomFactor: number) {
    View.ensureInstance();

    const [x0, y0] = View.getCanvasCoords(centerX, centerY);
    View.zoom *= zoomFactor;
    this.clip();

    const [x1, y1] = View.getCanvasCoords(centerX, centerY);
    View.left -= x1 - x0;
    View.top -= y1 - y0;
    this.clip();

    View.registerUpdate();
  }

  static applyTranslation(deltaX: number, deltaY: number) {
    View.ensureInstance();

    View.top += deltaY;
    View.left += deltaX;
    this.clip();

    View.registerUpdate();
  }
}
