import { GraphicTypes, Serializers } from "./Graphic";
import { RGB, StrokePoint, Vector3D } from "../types";
import { PolyLine } from "../Math/Geometry";
import { Stroke } from "./Stroke";
import { VectorGraphic } from "./VectorGraphic";
import { GetPointRadius, StrokeVectorizer } from "./StrokeVectorizer";

const D_T = 5;
const STIFFNESS = 0.005;
const STIFFNESS_P = STIFFNESS * 0.05;
const DRAG = 0.1;

type MassPoint = {
  x: number;
  y: number;
  p: number;
  t: number;
  vx: number;
  vy: number;
  vp: number;
};

export class StrokeBuilder {
  private timestamp: number;
  private zIndex: number;

  private width: number;
  private color: RGB;
  private points: StrokePoint[];

  private vectorizer: StrokeVectorizer;

  private mass?: MassPoint;

  // Use object pooling to reduce garbage collection
  private objPool: StrokePoint[];
  private extraPoints: StrokePoint[];

  constructor() {
    this.points = [];
    this.extraPoints = [];
    this.objPool = [];
    this.mass = { x: 0, y: 0, p: 0, t: 0, vx: 0, vy: 0, vp: 0 };
    this.vectorizer = new StrokeVectorizer(this.objPool);
  }

  newStroke(timestamp: number, zIndex: number, color: RGB, width: number) {
    this.timestamp = timestamp;
    this.zIndex = zIndex;

    this.width = width;
    this.color = color;
    this.objPool.push(...this.points);
    this.points.splice(0);
    this.extraPoints.splice(0);

    this.vectorizer.newStroke(color, width);
  }

  getStroke(id: string): Stroke {
    const polyLinePoints = [];
    for (const p of this.points) {
      polyLinePoints.push(new Vector3D(p.x, p.y, GetPointRadius(this.width, 0.5)));
    }
    return {
      id: id,
      color: this.color,
      width: this.width,
      points: this.points.slice(),
      timestamp: this.timestamp,
      zIndex: this.zIndex,
      serializer: Serializers.STROKE,
      geometry: new PolyLine(polyLinePoints),
      graphic: {
        type: GraphicTypes.VECTOR,
        zIndex: this.zIndex,
        vector: this.getVector().slice(),
      },
    };
  }

  getVector() {
    return this.vectorizer.getArray(this.extendToLastPoint());
  }

  getPoints() {
    return this.points;
  }

  private extendToLastPoint(): StrokePoint[] {
    this.extraPoints.splice(0); // Extra points are added to object pool by Vectorizer

    if (this.points.length == 0) {
      return this.extraPoints;
    }

    const dt = 1;
    const p0 = this.getLastPoint();

    if (this.points.length == 1) {
      this.extraPoints.push(p0);
      return this.extraPoints;
    }

    const { x, y, p, vx, vy, vp, t } = this.mass;

    let dist = Math.sqrt((p0.x - this.mass.x) ** 2 + (p0.y - this.mass.y) ** 2);
    while (dist > 0) {
      const v = Math.sqrt(this.mass.vx * this.mass.vx + this.mass.vy * this.mass.vy);
      dist -= v * dt;

      if (v) {
        this.extraPoints.push(this.getMassStrokePoint());
      }

      const ax = (p0.x - this.mass.x) * STIFFNESS - this.mass.vx * DRAG;
      const ay = (p0.y - this.mass.y) * STIFFNESS - this.mass.vy * DRAG;
      const ap = (p0.pressure - this.mass.p) * STIFFNESS_P - this.mass.vp * DRAG;

      this.mass.x += this.mass.vx * dt;
      this.mass.y += this.mass.vy * dt;
      this.mass.p += this.mass.vp * dt;
      this.mass.vx += ax * dt;
      this.mass.vy += ay * dt;
      this.mass.vp += ap * dt;
      this.mass.t += dt;
    }

    // Revert initial values
    this.mass.x = x;
    this.mass.y = y;
    this.mass.p = p;
    this.mass.vx = vx;
    this.mass.vy = vy;
    this.mass.vp = vp;
    this.mass.t = t;

    this.objPool.push(p0);

    return this.extraPoints;
  }

  private getLastPoint(): StrokePoint {
    const p = this.points[this.points.length - 1];
    return this.newStrokePoint(p.x, p.y, this.zIndex ? p.pressure : 0.5, p.timestamp);
  }

  push(x: number, y: number, pressure: number, timestamp: number) {
    if (!this.points.length) {
      this.mass.x = x;
      this.mass.y = y;
      this.mass.p = this.zIndex ? pressure : 0.5;
      this.mass.t = timestamp;
      this.mass.vx = 0;
      this.mass.vy = 0;
      this.mass.vp = 0;
    } else {
      const p0 = this.getLastPoint();

      while (this.mass.t < timestamp) {
        this.vectorizer.push(this.getMassStrokePoint());

        const k = (this.mass.t - p0.timestamp) / (timestamp - p0.timestamp);
        const X = p0.x * (1 - k) + x * k;
        const Y = p0.y * (1 - k) + y * k;
        const P = p0.pressure * (1 - k) + pressure * k;

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

      this.objPool.push(p0);
    }

    this.points.push(this.newStrokePoint(x, y, pressure, timestamp));
  }

  private getMassStrokePoint(): StrokePoint {
    return this.newStrokePoint(this.mass.x, this.mass.y, this.mass.p, this.mass.t);
  }

  private newStrokePoint(x: number, y: number, pressure: number, timestamp: number): StrokePoint {
    const dst = this.objPool.pop();

    if (dst) {
      dst.x = x;
      dst.y = y;
      dst.pressure = pressure;
      dst.timestamp = timestamp;
      return dst;
    } else {
      return {
        x,
        y,
        pressure,
        timestamp,
      };
    }
  }
}
