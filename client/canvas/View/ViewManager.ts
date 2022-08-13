import { FingerEvent } from "../PointerTracker";
import { Vector2D } from "../types";
import { MutableView, View } from "./View";

export class ViewManager {
  private view: MutableView;
  private mouse: Vector2D;
  private inertia: ScrollInertia;
  private averagePointerPos: Vector2D;
  private averagePointerDist: number;
  private pointers: Vector2D[];

  constructor() {
    this.view = new MutableView();

    this.pointers = [];

    this.mouse = new Vector2D(0, 0);

    this.inertia = new ScrollInertia(this.view);

    this.disableWindowOverscrolling();
  }

  getView(): View {
    return this.view;
  }

  getMutableView(): MutableView {
    return this.view;
  }

  private disableWindowOverscrolling() {
    if (navigator.vendor == "Apple Computer, Inc.") {
      history.pushState(null, null, location.href);
      window.onpopstate = function (event) {
        history.go(1);
      };
    }
    document.body.style.overscrollBehavior = "none";
  }

  private updatePointers(pointers: Vector2D[]) {
    const N = pointers.length;
    this.pointers = pointers;

    if (N > 0) {
      // Compute average position and radius
      let center = new Vector2D(0, 0);
      let radius = 0;

      for (const p of Object.values(pointers)) {
        center = center.add(p);
      }
      center = center.div(N);

      for (const p of Object.values(pointers)) {
        radius += p.dist(center);
      }
      radius /= N;

      this.averagePointerPos = center;
      this.averagePointerDist = N > 1 ? radius : 1;
    }
  }

  handleFingerEvent(e: FingerEvent) {
    e.preventDefault();

    const { fingers, timeStamp } = e;
    const pointers = fingers.map(f => new Vector2D(f.x, f.y));

    //console.log(type);

    if (pointers.length == this.pointers.length && pointers.length > 0) {
      const [x0, y0, r0] = [this.averagePointerPos.x, this.averagePointerPos.y, this.averagePointerDist];
      this.updatePointers(pointers);
      const [x1, y1, r1] = [this.averagePointerPos.x, this.averagePointerPos.y, this.averagePointerDist];

      const [dx, dy] = this.view.getCanvasCoords(x0 - x1, y0 - y1, true);

      this.view.applyTranslation(dx, dy); // scroll
      this.view.applyZoom(x1, y1, r1 / r0); // zoom

      this.inertia.update(dx, dy, timeStamp);
    } else {
      if (fingers.length) {
        this.inertia.reset();
      } else if (this.pointers.length) {
        this.inertia.release();
      }
      this.updatePointers(pointers);
    }
  }

  handleWheelEvent(e: WheelEvent) {
    e.preventDefault();

    let { deltaX, deltaY, deltaMode } = e;

    if (deltaMode == WheelEvent.DOM_DELTA_PIXEL) {
      [deltaX, deltaY] = this.view.getCanvasCoords(deltaX, deltaY, true);
    }

    if (e.ctrlKey) {
      // zoom
      const ZOOM_SPEED = {
        IN: 25,
        OUT: 45,
      };
      const zoomFactor = 1 - deltaY * (deltaY < 0 ? ZOOM_SPEED.IN : ZOOM_SPEED.OUT);
      this.view.applyZoom(this.mouse.x, this.mouse.y, zoomFactor);
    } else {
      // scroll
      if (e.shiftKey && !deltaX) {
        this.view.applyTranslation(deltaY, 0);
      } else {
        this.view.applyTranslation(deltaX, deltaY);
      }
    }
  }

  handleMouseEvent(e: MouseEvent) {
    this.mouse = new Vector2D(e.clientX, e.clientY);
  }
}

const INERTIA_DECAY_RATE = 5;
const INERTIA_DECAY_PER_MS = INERTIA_DECAY_RATE * 0.001;
const SMOOTH_AVG = 0.5;
const MINIMUM_VELOCITY = 0.5; // px

class ScrollInertia {
  private view: MutableView;
  private t: number;
  private interval: number;
  private velocity: Vector2D;

  constructor(view: MutableView) {
    this.view = view;
  }

  update(dx: number, dy: number, t: number) {
    if (this.t && this.t != t) {
      const dt = t - this.t;
      const vx = dx / dt;
      const vy = dy / dt;

      if (!this.velocity) {
        this.velocity = new Vector2D(vx, vy);
      } else
        this.velocity = new Vector2D(
          this.velocity.x * (1 - SMOOTH_AVG) + vx * SMOOTH_AVG,
          this.velocity.y * (1 - SMOOTH_AVG) + vy * SMOOTH_AVG
        );
    }
    this.t = t;
  }

  reset() {
    delete this.velocity;
    delete this.t;
    if (this.interval) {
      clearInterval(this.interval);
      delete this.interval;
    }
  }

  release() {
    this.t = performance.now();
    this.interval = setInterval((() => this.move()) as TimerHandler, 10);
  }

  private move() {
    const t = performance.now();
    const dt = t - this.t;

    if (this.velocity) {
      const [vx, vy] = this.view.getScreenCoords(this.velocity.x, this.velocity.y, true);
      if (Math.sqrt(vx ** 2 + vy ** 2) > MINIMUM_VELOCITY) {
        this.view.applyTranslation(this.velocity.x * dt, this.velocity.y * dt);

        this.velocity = this.velocity.mul(1 - Math.min(1, dt * INERTIA_DECAY_PER_MS));

        this.t = t;
      } else {
        this.reset();
      }
    }
  }
}
