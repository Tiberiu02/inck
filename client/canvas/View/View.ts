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

import { Observable } from "../Observable";
import { Display } from "../UI/DisplayProps";

export class View extends Observable {
  protected top: number;
  protected left: number;
  protected zoom: number;

  constructor() {
    super();

    this.top = 0;
    this.left = 0;
    this.zoom = 1;
  }

  getTop() {
    return this.top;
  }
  getLeft() {
    return this.left;
  }
  getZoom() {
    return this.zoom;
  }

  // Map screen coordinates to canvas coordinates
  getCanvasCoords(x: number, y: number, isDistance: boolean = false): [number, number] {
    x /= Display.Width() * this.zoom;
    y /= Display.Width() * this.zoom;
    if (!isDistance) {
      x += this.left;
      y += this.top;
    }
    return [x, y];
  }

  getScreenCoords(x: number, y: number, isDistance: boolean = false): [number, number] {
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
  private clip() {
    this.top = Math.max(0, this.top);
    this.left = Math.max(0, Math.min(1 - 1 / this.zoom, this.left));
    this.zoom = Math.max(1, Math.min(10, this.zoom));
  }

  applyZoom(centerX: number, centerY: number, zoomFactor: number) {
    const [x0, y0] = this.getCanvasCoords(centerX, centerY);
    this.zoom = Math.max(1, Math.min(10, this.zoom * zoomFactor));
    const [x1, y1] = this.getCanvasCoords(centerX, centerY);
    this.left -= x1 - x0;
    this.top -= y1 - y0;
    this.clip();

    this.registerUpdate();
  }

  applyTranslation(deltaX: number, deltaY: number) {
    this.top += deltaY;
    this.left += deltaX;
    this.clip();

    this.registerUpdate();
  }
}
