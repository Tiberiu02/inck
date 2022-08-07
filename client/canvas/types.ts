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

export interface Rectangle {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
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
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface SimplePointerEvent {
  pointerId: number;
  type: string;
  x: number;
  y: number;
  pressure: number;
  timeStamp: number;
  target: EventTarget;
  pointerType: string;
  preventDefault: () => void;
}

export interface iosTouch extends Touch {
  touchType: string;
}

export type RGB = [number, number, number];
