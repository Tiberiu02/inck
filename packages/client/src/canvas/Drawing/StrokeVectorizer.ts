import { PolyLine } from "../Math/Geometry";
import { V2 } from "../Math/V2";
import { PathPoint, RGB, StrokePoint, Vector3D } from "../types";
import { GraphicTypes, Serializers } from "./Graphic";
import { Stroke } from "./Stroke";
import { VectorGraphic } from "./VectorGraphic";

const STROKE_ROUGHNESS = 0.05;

export function GetPointRadius(strokeWidth: number, pressure: number) {
  return (strokeWidth * (pressure + 1)) / 3;
}

export class StrokeVectorizer {
  private color: RGB;
  private width: number;
  private points: StrokePoint[];

  private array: number[];

  constructor(color: RGB, width: number, points: StrokePoint[] = []) {
    this.width = width;
    this.color = color;
    this.points = points;

    this.array = [];
  }

  getGraphic(zIndex: number, extraPoints: StrokePoint[] = []): VectorGraphic {
    return {
      type: GraphicTypes.VECTOR,
      zIndex: zIndex,
      vector: this.getArray(extraPoints),
    };
  }

  private GetRadius(p: StrokePoint): number {
    return GetPointRadius(this.width, p.pressure);
  }
  private GetAngleStep(p: StrokePoint): number {
    return STROKE_ROUGHNESS / (2 * Math.PI * this.GetRadius(p)) ** 0.5;
  }

  private getArray(extraPoints: StrokePoint[] = []) {
    if (!this.points.length && !extraPoints.length) return [];

    // Store old array for backup & add extra points
    const oldArray = this.array.slice();
    const oldPoints = this.points.slice();
    for (const p of extraPoints) {
      this.push(p);
    }

    const firstPoint = this.points[0];
    const lastPoint = this.points.at(-1);

    if (this.points.length == 1) {
      const p = firstPoint;
      const r = this.GetRadius(p);
      const angleStep = this.GetAngleStep(p);

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

    // Round tip at the begining
    let arrayPrefix = [];
    {
      const p = firstPoint;
      const r = this.GetRadius(p);
      const angleStep = this.GetAngleStep(p);
      const i = V2.normalize(V2.sub(p, this.points[1]));
      const n = V2.rot(i, Math.PI / 2);
      arrayPrefix.push(p.x + r * i.x, p.y + r * i.y, ...this.color, 1);
      for (let a = 0; a < Math.PI / 2; a += angleStep) {
        const [sin, cos] = [Math.sin(a), Math.cos(a)];
        arrayPrefix.push(p.x + r * i.x * cos - r * n.x * sin, p.y + r * i.y * cos - r * n.y * sin, ...this.color, 1);
        arrayPrefix.push(p.x + r * i.x * cos + r * n.x * sin, p.y + r * i.y * cos + r * n.y * sin, ...this.color, 1);
      }
    }

    // Round tip at the end
    let arraySuffix = [];
    {
      const p = lastPoint;
      const r = this.GetRadius(p);
      const angleStep = this.GetAngleStep(p);
      const i = V2.normalize(V2.sub(this.points[this.points.length - 1], this.points[this.points.length - 2]));
      const n = V2.rot(i, Math.PI / 2);
      const steps = Math.floor(Math.PI / 2 / angleStep);
      for (let step = steps; step >= 0; step--) {
        const a = step * angleStep;
        const [sin, cos] = [Math.sin(a), Math.cos(a)];
        arraySuffix.push(p.x + r * i.x * cos + r * n.x * sin, p.y + r * i.y * cos + r * n.y * sin, ...this.color, 1);
        arraySuffix.push(p.x + r * i.x * cos - r * n.x * sin, p.y + r * i.y * cos - r * n.y * sin, ...this.color, 1);
      }
    }

    // Revert to old array
    const newArray = this.array;
    this.array = oldArray;
    this.points = oldPoints;

    return [...arrayPrefix, ...newArray, ...arraySuffix];
  }

  push(p: StrokePoint) {
    if (this.points.length) {
      const p0 = this.points[this.points.length - 1];

      if (V2.equal(p, p0)) return;

      const n1 = V2.rot(V2.normalize(V2.sub(p, p0)), Math.PI / 2);
      const r1 = this.GetRadius(p);

      if (this.points.length >= 2) {
        // Round off sharp turns
        const q = this.points[this.points.length - 2];
        const n0 = V2.rot(V2.normalize(V2.sub(p0, q)), Math.PI / 2);

        const sign = V2.cross(n0, n1) > 0 ? -1 : +1;
        const angle = Math.acos(V2.dot(n0, n1));
        const angleStep = (this.GetAngleStep(p0) + this.GetAngleStep(p)) / 2;

        const r0 = this.GetRadius(p0);

        for (let a = angleStep; a < angle; a += angleStep) {
          const r = (a * r1 + (angle - a) * r0) / angle;
          const n = V2.mul(V2.rot(n0, a * -sign), r);
          this.array.push(p0.x + n.x, p0.y + n.y, ...this.color, 1);
          this.array.push(p0.x - n.x, p0.y - n.y, ...this.color, 1);
        }
      } else {
        // First point
        this.array.push(p0.x + n1.x * r1, p0.y + n1.y * r1, ...this.color, 1);
        this.array.push(p0.x - n1.x * r1, p0.y - n1.y * r1, ...this.color, 1);
      }

      this.array.push(p.x + n1.x * r1, p.y + n1.y * r1, ...this.color, 1);
      this.array.push(p.x - n1.x * r1, p.y - n1.y * r1, ...this.color, 1);
    }

    this.points.push(p);
  }
}
