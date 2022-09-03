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

  constructor(timestamp: number, zIndex: number, color: RGB, width: number, points: StrokePoint[] = []) {
    this.timestamp = timestamp;
    this.zIndex = zIndex;

    this.width = width;
    this.color = color;
    this.points = [];

    this.vectorizer = new StrokeVectorizer(color, width);

    for (const p of points) {
      this.push(p);
    }
  }

  getStroke(id: string): Stroke {
    return {
      id: id,
      color: this.color,
      width: this.width,
      points: [...this.points],
      timestamp: this.timestamp,
      zIndex: this.zIndex,
      serializer: Serializers.STROKE,
      geometry: new PolyLine(this.points.map(p => new Vector3D(p.x, p.y, GetPointRadius(this.width, p.pressure)))),
      graphic: this.getGraphic(),
    };
  }

  getGraphic(): VectorGraphic {
    return this.vectorizer.getGraphic(this.zIndex, this.extendToLastPoint());
  }

  private extendToLastPoint(): StrokePoint[] {
    const dt = 1;
    const p0 = this.points[this.points.length - 1];

    let { x, y, p, vx, vy, vp, t } = this.mass;

    let extraPoints: StrokePoint[] = [];

    let dist = Math.sqrt((p0.x - x) ** 2 + (p0.y - y) ** 2);
    while (dist > 0) {
      const v = Math.sqrt(vx * vx + vy * vy);
      dist -= v * dt;

      if (v) {
        extraPoints.push(this.getMassStrokePoint({ x, y, p, vx, vy, vp, t }));
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

    return extraPoints;
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
        this.vectorizer.push(this.getMassStrokePoint());

        const k = (this.mass.t - p0.timestamp) / (p.timestamp - p0.timestamp);
        const X = p0.x * (1 - k) + p.x * k;
        const Y = p0.y * (1 - k) + p.y * k;
        const P = p0.pressure * (1 - k) + p.pressure * k;

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

  private getMassStrokePoint(mass?: MassPoint): StrokePoint {
    mass = mass ?? this.mass;
    return {
      x: mass.x,
      y: mass.y,
      pressure: mass.p,
      timestamp: mass.t,
    };
  }
}
