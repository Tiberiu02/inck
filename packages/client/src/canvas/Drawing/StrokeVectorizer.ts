import { V2, V2f } from "../Math/V2";
import { RGB, StrokePoint } from "../types";

const STROKE_ROUGHNESS = 0.05;

export function GetPointRadius(strokeWidth: number, pressure: number) {
  return (strokeWidth * (pressure + 1)) / 3;
}

export class StrokeVectorizer {
  private color: RGB;
  private width: number;
  private points: StrokePoint[];

  private array: number[];
  private apos: number[];
  private lazyPop: number;

  private objPool: StrokePoint[];

  constructor(objPool: StrokePoint[]) {
    this.points = [];
    this.array = [];
    this.apos = [];
    this.objPool = objPool;
  }

  newStroke(color: RGB, width: number) {
    this.width = width;
    this.color = color;

    this.objPool.push(...this.points);
    this.points.splice(0);
    this.array.splice(0);
    this.apos.splice(0);
    this.lazyPop = 0;
  }

  private GetRadius(p: StrokePoint): number {
    return GetPointRadius(this.width, p.pressure);
  }
  private GetAngleStep(p: StrokePoint): number {
    return STROKE_ROUGHNESS / Math.sqrt(2 * Math.PI * this.GetRadius(p));
  }

  getArray(extraPoints: StrokePoint[] = null) {
    if (this.lazyPop) {
      const popCnt = this.lazyPop;
      this.lazyPop = 0;
      this.pop(popCnt);
    }

    if (extraPoints) {
      for (const p of extraPoints) {
        this.push(p);
      }
      this.lazyPop = extraPoints.length;
    }

    return this.array;
  }

  pop(n: number) {
    const remainingPoints = this.points.length - n;
    if (remainingPoints == 0) {
      // Pop everything
      this.objPool.push(...this.points);
      this.points.splice(0);
      this.array.splice(0);
      this.apos.splice(0);
    } else {
      // Pop one more point and push it back
      const lastRemaningPoint = this.points[remainingPoints - 1];

      this.objPool.push(...this.points.splice(remainingPoints));
      //this.points.splice(remainingPoints);

      this.points.pop();

      this.array.splice(remainingPoints == 1 ? 0 : this.apos[remainingPoints - 2]);
      this.apos.splice(remainingPoints - 1);

      this.push(lastRemaningPoint);
    }
  }

  push(p: StrokePoint) {
    if (this.lazyPop) {
      const popCnt = this.lazyPop;
      this.lazyPop = 0;
      this.pop(popCnt);
    }

    // ES6 array deconstruction is EXTREMELY slow
    const R = this.color[0];
    const G = this.color[1];
    const B = this.color[2];

    if (this.points.length) {
      const p0 = this.points[this.points.length - 1];

      if (V2.equal(p, p0)) return;

      let n1 = V2f.normalize(p.x - p0.x, p.y - p0.y);
      n1 = V2f.rot(n1[0], n1[1], Math.PI / 2);
      const n1x = n1[0];
      const n1y = n1[1];

      const r1 = this.GetRadius(p);

      if (this.points.length >= 2) {
        // At least three points
        // Round off sharp turns

        this.array.splice(this.apos.at(-1)); // Remove old rounded tip at the end

        const q = this.points[this.points.length - 2];

        let n0 = V2f.normalize(p0.x - q.x, p0.y - q.y);
        n0 = V2f.rot(n0[0], n0[1], Math.PI / 2);
        const n0x = n0[0];
        const n0y = n0[1];

        const sign = V2f.cross(n0x, n0y, n1x, n1y) > 0 ? -1 : +1;
        const angle = Math.acos(V2f.dot(n0x, n0y, n1x, n1y));
        const angleStep = (this.GetAngleStep(p0) + this.GetAngleStep(p)) / 2;

        const r0 = this.GetRadius(p0);

        for (let a = angleStep; a < angle; a += angleStep) {
          const ra = (a * r1 + (angle - a) * r0) / angle;
          const n = V2f.rot(n0x, n0y, a * -sign);
          this.array.push(p0.x + n[0] * ra, p0.y + n[1] * ra, R, G, B, 1);
          this.array.push(p0.x - n[0] * ra, p0.y - n[1] * ra, R, G, B, 1);
        }
      } else {
        // Two points points
        // Add round tip at the begining

        this.array.splice(0);

        const r = this.GetRadius(p0);
        const angleStep = this.GetAngleStep(p0);

        const i = V2f.normalize(p0.x - p.x, p0.y - p.y);
        const ix = i[0];
        const iy = i[1];

        const n = V2f.rot(ix, iy, Math.PI / 2);
        const nx = n[0];
        const ny = n[1];

        this.array.push(p0.x + r * ix, p0.y + r * iy, R, G, B, 1);

        for (let a = 0; a < Math.PI / 2; a += angleStep) {
          const sin = Math.sin(a);
          const cos = Math.cos(a);
          this.array.push(p0.x + r * ix * cos - r * nx * sin, p0.y + r * iy * cos - r * ny * sin, R, G, B, 1);
          this.array.push(p0.x + r * ix * cos + r * nx * sin, p0.y + r * iy * cos + r * ny * sin, R, G, B, 1);
        }

        this.array.push(p0.x + n1x * r1, p0.y + n1y * r1, R, G, B, 1);
        this.array.push(p0.x - n1x * r1, p0.y - n1y * r1, R, G, B, 1);
        this.apos[0] = this.array.length;
      }

      // Extend to last point
      this.array.push(p.x + n1x * r1, p.y + n1y * r1, R, G, B, 1);
      this.array.push(p.x - n1x * r1, p.y - n1y * r1, R, G, B, 1);
      this.apos.push(this.array.length);

      // Round tip at the end
      const r = this.GetRadius(p);
      const angleStep = this.GetAngleStep(p);

      const i = V2f.normalize(p.x - p0.x, p.y - p0.y);
      const ix = i[0];
      const iy = i[1];

      const n = V2f.rot(ix, iy, Math.PI / 2);
      const nx = n[0];
      const ny = n[1];

      const steps = Math.floor(Math.PI / 2 / angleStep);
      for (let step = steps; step >= 0; step--) {
        const a = step * angleStep;
        const sin = Math.sin(a);
        const cos = Math.cos(a);
        this.array.push(p.x + r * ix * cos + r * nx * sin, p.y + r * iy * cos + r * ny * sin, R, G, B, 1);
        this.array.push(p.x + r * ix * cos - r * nx * sin, p.y + r * iy * cos - r * ny * sin, R, G, B, 1);
      }
    } else {
      // Only one point
      // graphic = dot

      this.array.splice(0);

      const r = this.GetRadius(p);
      const angleStep = this.GetAngleStep(p);

      for (let a = 0; a < Math.PI; a += angleStep) {
        const sin = Math.sin(a);
        const cos = Math.cos(a);
        this.array.push(p.x + r * cos, p.y + r * sin, R, G, B, 1);
        this.array.push(p.x + r * cos, p.y - r * sin, R, G, B, 1);
      }
      this.array.push(p.x - r, p.y, R, G, B, 1);
      this.array.push(p.x - r, p.y, R, G, B, 1);

      this.apos.push(this.array.length);
    }

    this.points.push(p);
  }
}
