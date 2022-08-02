import { LineSegment, Rectangle, RGB, StrokePoint } from "../types";
import { FillPath } from "../Math/Vectorization";
import { Drawable } from "./Drawable";
import { LineBoundingBox, RectangleIntersectsRectangle } from "../Math/Geometry";

export class Fill implements Drawable {
  color: RGB;
  points: StrokePoint[];
  id: string;
  zIndex: number;
  boundingBox: Rectangle;
  timestamp: number;

  constructor(color: RGB, zIndex: number, timestamp?: number, id?: string) {
    this.color = color;
    this.zIndex = zIndex;
    this.timestamp = timestamp ?? Date.now();
    this.id = id ?? window.userId + "-" + this.timestamp;
    this.points = [];
    this.boundingBox = {
      xMin: Infinity,
      xMax: -Infinity,
      yMin: Infinity,
      yMax: -Infinity,
    };
  }

  vectorize(active: boolean = false): number[] {
    const color = active ? [0.95, 0.95, 0.95, 1] : [1, 1, 1, 1];

    return FillPath(this.points, color);
  }

  push(point: StrokePoint) {
    this.points.push(point);
  }

  intersectsLine(line: LineSegment) {
    const rect = LineBoundingBox(line);

    if (!RectangleIntersectsRectangle(this.boundingBox, rect)) {
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

    return false;
  }

  serialize() {
    return {
      type: "f",
      path: this.points,
    };
  }
}
