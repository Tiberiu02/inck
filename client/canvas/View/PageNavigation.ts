import { FingerEvent } from "../UI/PointerTracker";
import { V2, Vector2D } from "../Math/V2";
import { MutableView, View } from "./View";

export class PageNavigation {
  private mouse: Vector2D;
  private inertia: ScrollInertia;
  private averagePointerPos: Vector2D;
  private averagePointerDist: number;
  private detectVerticalScroll: DetectVerticalScroll;
  private pointers: Vector2D[];

  constructor() {
    this.pointers = [];

    this.mouse = new Vector2D(0, 0);

    this.inertia = new ScrollInertia();

    this.disableWindowOverscrolling();

    window.addEventListener("wheel", e => this.handleWheelEvent(e), { passive: false });
    window.addEventListener("mousemove", e => this.handleMouseEvent(e));
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
        center = V2.add(center, p);
      }
      center = V2.div(center, N);

      for (const p of Object.values(pointers)) {
        radius += V2.dist(p, center);
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

    if (pointers.length == this.pointers.length && pointers.length > 0) {
      const [x0, y0, r0] = [this.averagePointerPos.x, this.averagePointerPos.y, this.averagePointerDist];
      this.updatePointers(pointers);
      const [x1, y1, r1] = [this.averagePointerPos.x, this.averagePointerPos.y, this.averagePointerDist];

      let [dx, dy] = View.getCanvasCoords(x0 - x1, y0 - y1, true);

      // Forced vertical scroll
      if (fingers.length == 1) {
        this.detectVerticalScroll.update(x1, y1, timeStamp);
        if (this.detectVerticalScroll.get()) {
          dx = 0;
        }
      }

      MutableView.applyTranslation(dx, dy); // scroll
      MutableView.applyZoom(x1, y1, r1 / r0); // zoom

      this.inertia.update(dx, dy, timeStamp);
    } else {
      if (fingers.length) {
        this.inertia.reset();
        if (fingers.length == 1) {
          const { x, y } = fingers[0];
          this.detectVerticalScroll = new DetectVerticalScroll(x, y, timeStamp);
        }
      } else if (this.pointers.length) {
        this.inertia.release();
      }
      this.updatePointers(pointers);
    }
  }

  private handleWheelEvent(e: WheelEvent) {
    e.preventDefault();

    let { deltaX, deltaY, deltaMode } = e;

    if (deltaMode == WheelEvent.DOM_DELTA_PIXEL) {
      [deltaX, deltaY] = View.getCanvasCoords(deltaX, deltaY, true);
    }

    if (e.ctrlKey) {
      // zoom
      const ZOOM_SPEED = {
        IN: 25,
        OUT: 45,
      };
      const zoomFactor = 1 - deltaY * (deltaY < 0 ? ZOOM_SPEED.IN : ZOOM_SPEED.OUT);
      MutableView.applyZoom(this.mouse.x, this.mouse.y, zoomFactor);
    } else {
      // scroll
      if (e.shiftKey && !deltaX) {
        MutableView.applyTranslation(deltaY, 0);
      } else {
        MutableView.applyTranslation(deltaX, deltaY);
      }
    }
  }

  private handleMouseEvent(e: MouseEvent) {
    this.mouse = new Vector2D(e.clientX, e.clientY);
  }
}

const INERTIA_DECAY_RATE = 5;
const INERTIA_DECAY_PER_MS = INERTIA_DECAY_RATE * 0.001;
const SMOOTH_AVG = 0.5;
const MINIMUM_VELOCITY = 0.5; // px

class ScrollInertia {
  private t: number;
  private interval: number;
  private velocity: Vector2D;

  constructor() {}

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
      const [vx, vy] = View.getScreenCoords(this.velocity.x, this.velocity.y, true);
      if (Math.sqrt(vx ** 2 + vy ** 2) > MINIMUM_VELOCITY) {
        MutableView.applyTranslation(this.velocity.x * dt, this.velocity.y * dt);

        this.velocity = V2.mul(this.velocity, 1 - Math.min(1, dt * INERTIA_DECAY_PER_MS));

        this.t = t;
      } else {
        this.reset();
      }
    }
  }
}

const TIME_WINDOW = 500;

class DetectVerticalScroll {
  private points: { x: number; y: number; timestamp: number }[];
  private vertical: boolean;

  constructor(x: number, y: number, timestamp: number) {
    this.points = [{ x, y, timestamp }];
    this.vertical = true;
  }

  update(x: number, y: number, timestamp: number) {
    this.points.push({ x, y, timestamp });
    while (timestamp - this.points[0].timestamp > TIME_WINDOW) {
      this.points.shift();
    }

    const p0 = this.points[0];
    const dx = x - p0.x;
    const dy = y - p0.y;
    if (Math.abs(dy) < Math.abs(dx)) {
      this.vertical = false;
    }
  }

  get(): boolean {
    return this.vertical;
  }
}
