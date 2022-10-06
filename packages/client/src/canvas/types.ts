export class Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

export interface Rectangle {
  readonly xMin: number;
  readonly yMin: number;
  readonly xMax: number;
  readonly yMax: number;
}

export interface PathPoint {
  x: number;
  y: number;
  t: number;
  nx: number;
  ny: number;
  r: number;
  angleStep: number;
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface StrokePoint {
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
  readonly timestamp: number;
}

export type Background = {
  render: Function;
};

export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];
