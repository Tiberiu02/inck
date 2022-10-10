import { LineSegment, Rectangle, Vector3D } from "../types";
import { Vector2D } from "./V2";

export function RectContains(r: Rectangle, p: Vector2D) {
  return r.xMin <= p.x && p.x <= this.xMax && r.yMin <= p.y && p.y <= this.yMax;
}

export function RectangleIntersectsRectangle(a: Rectangle, b: Rectangle, padding: number = 0): boolean {
  return (
    Math.max(a.xMin, b.xMin) <= Math.min(a.xMax, b.xMax) + padding &&
    Math.max(a.yMin, b.yMin) <= Math.min(a.yMax, b.yMax) + padding
  );
}

export function LineBoundingBox(seg: LineSegment): Rectangle {
  return {
    xMin: Math.min(seg.x1, seg.x2),
    xMax: Math.max(seg.x1, seg.x2),
    yMin: Math.min(seg.y1, seg.y2),
    yMax: Math.max(seg.y1, seg.y2),
  };
}

export function Distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

export function DistanceSq(x1: number, y1: number, x2: number, y2: number) {
  return (x1 - x2) ** 2 + (y1 - y2) ** 2;
}

export function UniteRectangles(a: Rectangle, b: Rectangle): Rectangle {
  return {
    xMin: Math.min(a.xMin, b.xMin),
    xMax: Math.max(a.xMax, b.xMax),
    yMin: Math.min(a.yMin, b.yMin),
    yMax: Math.max(a.yMax, b.yMax),
  };
}

export function TranslateRectangle(rec: Rectangle, dx: number, dy: number) {
  return {
    xMin: rec.xMin + dx,
    xMax: rec.xMax + dx,
    yMin: rec.yMin + dy,
    yMax: rec.yMax + dy,
  };
}

export interface Geometry {
  readonly boundingBox: Rectangle;

  translate(dx: number, dy: number): Geometry;
  intersectsLine(line: LineSegment): boolean;
  overlapsPoly(poly: PolyLine): boolean;
}

export class PolyLine implements Geometry {
  readonly points: Vector3D[];
  readonly boundingBox: Rectangle;

  constructor(points: Vector3D[]) {
    this.points = points;

    this.boundingBox = {
      xMin: Infinity,
      xMax: -Infinity,
      yMin: Infinity,
      yMax: -Infinity,
    };

    for (const p of points) {
      this.boundingBox = {
        xMin: Math.min(this.boundingBox.xMin, p.x - p.z),
        xMax: Math.max(this.boundingBox.xMax, p.x + p.z),
        yMin: Math.min(this.boundingBox.yMin, p.y - p.z),
        yMax: Math.max(this.boundingBox.yMax, p.y + p.z),
      };
    }
  }

  translate(dx: number, dy: number): PolyLine {
    return new PolyLine(this.points.map((p) => new Vector3D(p.x + dx, p.y + dy, p.z)));
  }

  intersectsLine(line: LineSegment): boolean {
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

      // TODO: Replace by line intersects line
      if (RectangleIntersectsRectangle(rect, LineBoundingBox(line))) {
        return true;
      }
    }

    for (const p of this.points) {
      if (DistanceSq(p.x, p.y, line.x1, line.y1) < p.z ** 2 || DistanceSq(p.x, p.y, line.x2, line.y2) < p.z ** 2) {
        return true;
      }
    }

    return false;
  }

  contains(p: Vector2D): boolean {
    let a = this.points[this.points.length - 1];
    let contained = false;
    for (const b of this.points) {
      if (
        (a.x <= p.x && p.x < b.x && b.y * (p.x - a.x) + a.y * (b.x - p.x) <= p.y * (b.x - a.x)) ||
        (b.x <= p.x && p.x < a.x && a.y * (p.x - b.x) + b.y * (a.x - p.x) <= p.y * (a.x - b.x))
      )
        contained = !contained;

      a = b;
    }

    return contained;
  }

  overlapsPoly(poly: PolyLine): boolean {
    if (!RectangleIntersectsRectangle(this.boundingBox, poly.boundingBox)) {
      return false;
    }

    for (const p of this.points) {
      if (poly.contains(p)) {
        return true;
      }
    }

    for (let i = 1; i < this.points.length; i++) {
      const line = {
        x1: this.points[i].x,
        y1: this.points[i].y,
        x2: this.points[i - 1].x,
        y2: this.points[i - 1].y,
      };
      if (poly.intersectsLine(line)) {
        return true;
      }
    }

    return false;
  }
}

export class VoidGeometry implements Geometry {
  readonly boundingBox: Rectangle;

  constructor() {
    this.boundingBox = {
      xMin: Infinity,
      xMax: -Infinity,
      yMin: Infinity,
      yMax: -Infinity,
    };
  }

  translate(dx: number, dy: number): VoidGeometry {
    return this;
  }

  intersectsLine(line: LineSegment): boolean {
    return false;
  }

  contains(p: Vector2D): boolean {
    return false;
  }

  overlapsPoly(poly: PolyLine): boolean {
    return false;
  }
}
