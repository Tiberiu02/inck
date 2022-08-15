export class Vector2D {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(other: Vector2D): Vector2D {
    return new Vector2D(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector2D): Vector2D {
    return new Vector2D(this.x - other.x, this.y - other.y);
  }

  mul(factor: number): Vector2D {
    return new Vector2D(this.x * factor, this.y * factor);
  }

  div(factor: number): Vector2D {
    return new Vector2D(this.x / factor, this.y / factor);
  }

  rot(angle: number): Vector2D {
    const [sin, cos] = [Math.sin(angle), Math.cos(angle)];
    return new Vector2D(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  norm(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  dist(other: Vector2D): number {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
  }
}

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

export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];
