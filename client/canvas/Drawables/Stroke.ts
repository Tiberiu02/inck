import { DistanceSq, LineBoundingBox, RectangleIntersectsRectangle } from "../Math/Geometry";
import { LineSegment, Rectangle, RGB, StrokePoint } from "../types";
import { DynamicStroke } from "../Math/Vectorization";
import { Drawable } from "./Drawable";

export const GetStrokeRadius = (width: number, p: number): number => (width * (p + 1)) / 3;

export const ELEMENTS_PER_INPUT = 4;
export const OFFSET_INPUT = {
  X: 0,
  Y: 1,
  P: 2,
  T: 3,
};

export class Stroke implements Drawable {
  color: RGB;
  width: number;
  zIndex: number;

  timestamp: number;
  id: string;

  points: StrokePoint[];
  boundingBox: Rectangle;

  private vectorizer: DynamicStroke;

  constructor(color: RGB, width: number, zIndex: number, timestamp?: number, id?: string) {
    this.color = color;
    this.width = width;
    this.zIndex = zIndex;
    this.timestamp = timestamp ?? Date.now();
    this.id = id ?? window.userId + "-" + this.timestamp;
    this.points = [];
    this.vectorizer = new DynamicStroke(width, [...color, 1]);
    this.boundingBox = {
      xMin: Infinity,
      xMax: -Infinity,
      yMin: Infinity,
      yMax: -Infinity,
    };
  }

  push(p: StrokePoint): void {
    this.points.push(p);
    this.vectorizer.push(p);

    this.boundingBox = {
      xMin: Math.min(this.boundingBox.xMin, p.x - this.width),
      xMax: Math.max(this.boundingBox.xMax, p.x + this.width),
      yMin: Math.min(this.boundingBox.yMin, p.y - this.width),
      yMax: Math.max(this.boundingBox.yMax, p.y + this.width),
    };
  }

  vectorize(): number[] {
    return this.vectorizer.getArray();
  }

  intersectsLine(line: LineSegment) {
    const rect = LineBoundingBox(line);

    if (!RectangleIntersectsRectangle(this.boundingBox, rect, this.width)) {
      return false;
    }

    for (let i = 1; i < this.points.length; i++) {
      const line: LineSegment = {
        x1: this.points[i].x,
        y1: this.points[i].y,
        x2: this.points[i - 1].x,
        y2: this.points[i - 1].y,
      };

      if (RectangleIntersectsRectangle(rect, LineBoundingBox(line))) {
        return true;
      }
    }

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const R_Sq = GetStrokeRadius(this.width, p.pressure) ** 2;

      if (DistanceSq(p.x, p.y, line.x1, line.y1) < R_Sq || DistanceSq(p.x, p.y, line.x2, line.y2) < R_Sq) {
        return true;
      }
    }

    return false;
  }

  serialize(): any {
    const path = [].concat(...this.points.map(p => [p.x, p.y, p.pressure, p.timestamp]));
    return {
      type: "p",
      width: this.width,
      color: this.color,
      path: path,
      timestamp: this.timestamp,
      zIndex: this.zIndex,
      id: this.id,
    };
  }
}
