import { ELEMENTS_PER_VERTEX } from "./GL";
import { OFFSET_INPUT, ELEMENTS_PER_INPUT } from "./Tools";
import { PathPoint } from "./types";

const D_T = 5;
const STIFFNESS = 0.005;
const STIFFNESS_P = STIFFNESS * 0.05;
const DRAG = 0.1;
const A_STEP_DENSITY = 0.05; // rounded tip angular distance between vertices

export class DynamicStroke {
  protected inputs: number[];
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
  width: number;
  color: number[];

  constructor(width: number, color: number[], inputs: number[] = []) {
    this.inputs = [];
    this.path = [];
    this.array = [];
    this.width = width;
    this.color = color;

    for (let i = 0; i < inputs.length; i += 4) {
      this.addInput(inputs[i], inputs[i + 1], inputs[i + 2], inputs[i + 3]);
    }
  }

  private getMassPathPoint({ x, y, p, vx, vy, t }): PathPoint {
    const v = Math.sqrt(vx * vx + vy * vy);
    const nx = -vy / v;
    const ny = vx / v;

    const r = (this.width * (p + 1)) / 3;
    const angleStep = A_STEP_DENSITY / (2 * Math.PI * r) ** 0.5;

    return { x, y, t, nx, ny, r, angleStep };
  }

  getArray() {
    if (!this.path.length) return [];

    const dt = 1;
    const X = this.inputs[this.inputs.length - ELEMENTS_PER_INPUT + OFFSET_INPUT.X];
    const Y = this.inputs[this.inputs.length - ELEMENTS_PER_INPUT + OFFSET_INPUT.Y];
    const P = this.inputs[this.inputs.length - ELEMENTS_PER_INPUT + OFFSET_INPUT.P];

    let { x, y, p, vx, vy, vp, t } = this.mass;
    let lastPathPoint: PathPoint;

    // Extend path to last input point
    let array = [];

    let dist = Math.sqrt((X - x) ** 2 + (Y - y) ** 2);
    while (dist > 0) {
      const v = Math.sqrt(vx * vx + vy * vy);
      dist -= v;

      if (v) {
        const [path, arr] = this.computeUpdate(this.getMassPathPoint({ x, y, p, vx, vy, t }), lastPathPoint);
        lastPathPoint = path[path.length - 1];
        array.push(...arr);
      }

      const ax = (X - x) * STIFFNESS - vx * DRAG;
      const ay = (Y - y) * STIFFNESS - vy * DRAG;
      const ap = (P - p) * STIFFNESS_P - vp * DRAG;

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
      arrayPrefix.push(x + r * ix, y + r * iy, ...this.color);
      for (let a = 0; a < Math.PI / 2; a += angleStep) {
        const [sin, cos] = [Math.sin(a), Math.cos(a)];
        arrayPrefix.push(x + r * ix * cos + r * nx * sin, y + r * iy * cos + r * ny * sin, ...this.color);
        arrayPrefix.push(x + r * ix * cos - r * nx * sin, y + r * iy * cos - r * ny * sin, ...this.color);
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
        arraySuffix.push(x + r * ix * cos + r * nx * sin, y + r * iy * cos + r * ny * sin, ...this.color);
        arraySuffix.push(x + r * ix * cos - r * nx * sin, y + r * iy * cos - r * ny * sin, ...this.color);
      }
    }

    return [...arrayPrefix, ...this.array, ...array, ...arraySuffix];
  }

  addInput(x: number, y: number, p: number, t: number) {
    this.inputs.push(x, y, p, t);

    if (!this.mass) {
      this.mass = {
        x,
        y,
        p,
        t,
        vx: 0,
        vy: 0,
        vp: 0,
      };
      return;
    }

    const [x0, y0, p0, t0] = this.inputs.slice(-8, -4);
    while (this.mass.t < t) {
      const k = (t - t0) / (t - t0);
      const X = x0 * (1 - k) + x * k;
      const Y = y0 * (1 - k) + y * k;
      const P = p0 * (1 - k) + p * k;

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
      array.push(p.x + p.nx * p.r, p.y + p.ny * p.r, ...this.color);
      array.push(p.x - p.nx * p.r, p.y - p.ny * p.r, ...this.color);
    }

    return [path, array];
  }
}

export function FillPath(path: number[], color: number[]): number[] {
  if (!path.length) {
    return [];
  }

  let vertices = [];
  let i = 0;
  let j = 0;
  let turnJ = true;
  do {
    if (turnJ) {
      vertices.push(path[j], path[j + 1], ...color);
      j = (j - 2 + path.length) % path.length;
    } else {
      vertices.push(path[i], path[i + 1], ...color);
      i += 2;
    }
    turnJ = !turnJ;
  } while (i <= j);

  vertices.push(...vertices.slice(-ELEMENTS_PER_VERTEX));

  return vertices;
}
