import { LineSegment, Rectangle } from "../types";

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
