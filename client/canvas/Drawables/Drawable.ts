import { LineSegment } from "../types";

export interface Drawable {
  vectorize(): number[];
  intersectsLine(line: LineSegment): boolean;
  serialize(): any;
}
