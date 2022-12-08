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

import { CreateEvent, EventCore, EventTrigger } from "../DesignPatterns/EventDriven";
import { Display } from "../DeviceProps";
import { m4, Matrix4 } from "../Math/M4";
import { Vector2D } from "../Math/V2";

export class View {
  public static instance: View;

  protected top: number;
  protected left: number;
  protected zoom: number;
  private listeners: (() => void)[];
  private mat: Matrix4;
  private matIsUpToDate: boolean;

  constructor() {
    this.top = 0;
    this.left = 0;
    this.zoom = 1;
    this.listeners = [];

    window.addEventListener("resize", this.registerUpdate.bind(this));
  }

  onUpdate(listener: () => void) {
    this.listeners.push(listener);
  }

  protected registerUpdate() {
    this.matIsUpToDate = false;
    for (const listener of this.listeners) {
      listener();
    }
  }

  getTransformMatrix(): Matrix4 {
    if (!this.matIsUpToDate) {
      this.mat = m4.scaling(2, -2, 0, this.mat);
      m4.translate(this.mat, -0.5, -0.5, 0, this.mat);
      m4.scale(this.mat, this.zoom, this.zoom * Display.AspectRatio, 0, this.mat);
      m4.translate(this.mat, -this.left, -this.top, 0, this.mat);
      this.matIsUpToDate = true;
    }
    return this.mat;
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
  getWidth() {
    return 1 / this.zoom;
  }
  getHeight() {
    return 1 / this.zoom / Display.AspectRatio;
  }
  get center(): Vector2D {
    return {
      x: this.left + 0.5 / this.zoom,
      y: this.top + 0.5 / this.zoom / Display.AspectRatio,
    };
  }

  // Map screen coordinates to canvas coordinates
  getCanvasX(x: number): number {
    return x / (Display.Width * this.zoom) + this.left;
  }
  getCanvasY(y: number): number {
    return y / (Display.Width * this.zoom) + this.top;
  }
  getScreenX(x: number): number {
    return (x - this.left) * (Display.Width * this.zoom);
  }
  getScreenY(y: number): number {
    return (y - this.top) * (Display.Width * this.zoom);
  }
  getCanvasDist(d: number): number {
    return d / (Display.Width * this.zoom);
  }
  getScreenDist(d: number): number {
    return d * Display.Width * this.zoom;
  }
}

export class MutableView extends View {
  static instance: MutableView;
  maxWidth: number;
  documentTop: number;

  private clip() {
    this.top = Math.max(this.documentTop || 0, this.top);
    const W = this.maxWidth || 1;
    this.left = Math.max(0.5 - W / 2, Math.min(0.5 + W / 2 - 1 / this.zoom, this.left));
    this.zoom = Math.max(1 / W, Math.min(10, this.zoom));
  }

  applyZoom(centerX: number, centerY: number, zoomFactor: number) {
    const x0 = this.getCanvasX(centerX);
    const y0 = this.getCanvasY(centerY);
    this.zoom *= zoomFactor;
    this.clip();

    const x1 = this.getCanvasX(centerX);
    const y1 = this.getCanvasY(centerY);
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

if (typeof window !== "undefined" && !View.instance) {
  View.instance = MutableView.instance = new MutableView();
}
