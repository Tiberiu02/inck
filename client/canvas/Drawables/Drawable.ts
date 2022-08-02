import { LineSegment, Rectangle } from "../types";

export interface Drawable {
  id: string;
  zIndex: number;
  boundingBox: Rectangle;
  timestamp: number;

  vectorize(): number[];
  intersectsLine(line: LineSegment): boolean;
  serialize(): any;
}
