import { DrawableTypes } from "./Drawable";
import { PathPoint, RGB, StrokePoint, Vector3D } from "../types";
import { PolyLine } from "../Math/Geometry";
import { Stroke } from "./Stroke";

const D_T = 5;
const STIFFNESS = 0.005;
const STIFFNESS_P = STIFFNESS * 0.05;
const DRAG = 0.1;
const A_STEP_DENSITY = 0.05; // rounded tip angular distance between vertices

const GetStrokeRadius = (width: number, p: number): number => (width * (p + 1)) / 3;

export class StrokeBuilder {
  private id: string;
  private timestamp: number;
  private zIndex: number;

  private width: number;
  private color: RGB;
  private points: StrokePoint[];

  private path: PathPoint[];
  private array: number[];
  private mass?: {
    x: number;
    y: number;
    p: number;
    t: number;
    vx: number;
    vy: number;
    vp: number;
  };

  constructor(id: string, timestamp: number, zIndex: number, color: RGB, width: number, points: StrokePoint[] = []) {
    this.id = id;
    this.timestamp = timestamp;
    this.zIndex = zIndex;

    this.width = width;
    this.color = color;
    this.points = [];

    this.path = [];
    this.array = [];

    for (const p of points) {
      this.push(p);
    }
  }

  getStroke(): Stroke {
    return {
      id: this.id,
      type: DrawableTypes.VECTOR,
      color: this.color,
      width: this.width,
      points: [...this.points],
      timestamp: this.timestamp,
      zIndex: this.zIndex,
      vector: this.getArray(),
      serializer: "stroke",
      geometry: new PolyLine(this.points.map(p => new Vector3D(p.x, p.y, (this.width * (p.pressure + 1)) / 3))),
    };
  }

  private getMassPathPoint({ x, y, p, vx, vy, t }): PathPoint {
    const v = Math.sqrt(vx * vx + vy * vy);
    const nx = -vy / v;
    const ny = vx / v;

    const r = GetStrokeRadius(this.width, p);
    const angleStep = A_STEP_DENSITY / (2 * Math.PI * r) ** 0.5;

    return { x, y, t, nx, ny, r, angleStep };
  }

  private getArray() {
    if (!this.path.length) {
      if (!this.points.length) return [];

      const p = this.points[0];
      const { r, angleStep } = this.getMassPathPoint({ x: p.x, y: p.y, p: p.pressure, vx: 1, vy: 1, t: p.timestamp });

      let array = [];
      for (let a = 0; a < Math.PI; a += angleStep) {
        const [sin, cos] = [Math.sin(a), Math.cos(a)];
        array.push(p.x + r * cos, p.y + r * sin, ...this.color, 1);
        array.push(p.x + r * cos, p.y - r * sin, ...this.color, 1);
      }
      array.push(p.x - r, p.y, ...this.color, 1);
      array.push(p.x - r, p.y, ...this.color, 1);
      return array;
    }

    const dt = 1;
    const p0 = this.points[this.points.length - 1];

    let { x, y, p, vx, vy, vp, t } = this.mass;
    let lastPathPoint: PathPoint = this.getMassPathPoint(this.mass);

    // Extend path to last input point
    let array = [];

    let dist = Math.sqrt((p0.x - x) ** 2 + (p0.y - y) ** 2);
    while (dist > 0) {
      const v = Math.sqrt(vx * vx + vy * vy);
      dist -= v;

      if (v) {
        const [path, arr] = this.computeUpdate(this.getMassPathPoint({ x, y, p, vx, vy, t }), lastPathPoint);
        lastPathPoint = path[path.length - 1];
        array.push(...arr);
      }

      const ax = (p0.x - x) * STIFFNESS - vx * DRAG;
      const ay = (p0.y - y) * STIFFNESS - vy * DRAG;
      const ap = (p0.pressure - p) * STIFFNESS_P - vp * DRAG;

      x += vx * dt;
      y += vy * dt;
      p += vp * dt;
      vx += ax * dt;
      vy += ay * dt;
      vp += ap * dt;
      t += dt;
    }

    // Round tip at the begining
    let arrayPrefix = [];
    {
      let { x, y, nx, ny, r, angleStep } = this.path[0];
      const ix = -ny;
      const iy = nx;
      arrayPrefix.push(x + r * ix, y + r * iy, ...this.color, 1);
      for (let a = 0; a < Math.PI / 2; a += angleStep) {
        const [sin, cos] = [Math.sin(a), Math.cos(a)];
        arrayPrefix.push(x + r * ix * cos + r * nx * sin, y + r * iy * cos + r * ny * sin, ...this.color, 1);
        arrayPrefix.push(x + r * ix * cos - r * nx * sin, y + r * iy * cos - r * ny * sin, ...this.color, 1);
      }
    }

    // Round tip at the end
    let arraySuffix = [];
    {
      let { x, y, nx, ny, r, angleStep } = lastPathPoint;
      const ix = ny;
      const iy = -nx;
      const steps = Math.floor(Math.PI / 2 / angleStep);
      for (let i = steps; i >= 0; i--) {
        const a = i * angleStep;
        const [sin, cos] = [Math.sin(a), Math.cos(a)];
        arraySuffix.push(x + r * ix * cos + r * nx * sin, y + r * iy * cos + r * ny * sin, ...this.color, 1);
        arraySuffix.push(x + r * ix * cos - r * nx * sin, y + r * iy * cos - r * ny * sin, ...this.color, 1);
      }
    }

    return [...arrayPrefix, ...this.array, ...array, ...arraySuffix];
  }

  push(p: StrokePoint) {
    if (!this.mass) {
      this.mass = {
        x: p.x,
        y: p.y,
        p: p.pressure,
        t: p.timestamp,
        vx: 0,
        vy: 0,
        vp: 0,
      };
    } else {
      const p0 = this.points[this.points.length - 1];

      while (this.mass.t < p.timestamp) {
        const k = (this.mass.t - p0.timestamp) / (p.timestamp - p0.timestamp);
        const X = p0.x * (1 - k) + p.x * k;
        const Y = p0.y * (1 - k) + p.y * k;
        const P = p0.pressure * (1 - k) + p.pressure * k;

        if (this.mass.vx || this.mass.vy) {
          this.addPathPoint(this.getMassPathPoint(this.mass));
        }

        const ax = (X - this.mass.x) * STIFFNESS - this.mass.vx * DRAG;
        const ay = (Y - this.mass.y) * STIFFNESS - this.mass.vy * DRAG;
        const ap = (P - this.mass.p) * STIFFNESS_P - this.mass.vp * DRAG;

        this.mass.x += this.mass.vx * D_T;
        this.mass.y += this.mass.vy * D_T;
        this.mass.p += this.mass.vp * D_T;
        this.mass.vx += ax * D_T;
        this.mass.vy += ay * D_T;
        this.mass.vp += ap * D_T;
        this.mass.t += D_T;
      }
    }

    this.points.push(p);
  }

  private addPathPoint(p: PathPoint) {
    const [path, array] = this.computeUpdate(p);
    this.path.push(...path);
    this.array.push(...array);
  }

  private computeUpdate(p: PathPoint, p0?: PathPoint): [PathPoint[], number[]] {
    if (!p0 && !this.path.length) {
      return [[p], []];
    }

    let path: PathPoint[];
    let array: number[];

    p0 = p0 ?? this.path[this.path.length - 1];

    const angle = Math.acos(p0.nx * p.nx + p0.ny * p.ny);
    const angleStep = (p0.angleStep + p.angleStep) / 2;

    if (angle > angleStep * 1.5) {
      const x = (p0.x + p.x) / 2;
      const y = (p0.y + p.y) / 2;
      const r = (p0.r + p.r) / 2;
      const t = (p0.t + p.t) / 2;
      let nx = (p0.nx + p.nx) / 2;
      let ny = (p0.ny + p.ny) / 2;
      const n = Math.sqrt(nx ** 2 + ny ** 2);
      if (n > 0) {
        nx /= n;
        ny /= n;
      } else {
        nx = p0.ny;
        ny = -p0.nx;
      }
      const mid = { x, y, t, nx, ny, r, angleStep };
      const [p1, a1] = this.computeUpdate(mid, p0);
      const [p2, a2] = this.computeUpdate(p, mid);
      path = p1.concat(p2);
      array = a1.concat(a2);
    } else {
      path = [p];

      array = [];
      array.push(p.x + p.nx * p.r, p.y + p.ny * p.r, ...this.color, 1);
      array.push(p.x - p.nx * p.r, p.y - p.ny * p.r, ...this.color, 1);
    }

    return [path, array];
  }
}