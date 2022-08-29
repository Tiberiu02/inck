export class Vector2D {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class V2 {
  static add(v: Vector2D, u: Vector2D): Vector2D {
    return new Vector2D(v.x + u.x, v.y + u.y);
  }

  static sub(v: Vector2D, u: Vector2D): Vector2D {
    return new Vector2D(v.x - u.x, v.y - u.y);
  }

  static mul(v: Vector2D, factor: number): Vector2D {
    return new Vector2D(v.x * factor, v.y * factor);
  }

  static div(v: Vector2D, factor: number): Vector2D {
    return new Vector2D(v.x / factor, v.y / factor);
  }

  static rot(v: Vector2D, angle: number): Vector2D {
    const [sin, cos] = [Math.sin(angle), Math.cos(angle)];
    return new Vector2D(v.x * cos - v.y * sin, v.x * sin + v.y * cos);
  }

  static norm(v: Vector2D): number {
    return Math.sqrt(v.x ** 2 + v.y ** 2);
  }

  static normalize(v: Vector2D): Vector2D {
    const n = this.norm(v);
    return n ? new Vector2D(v.x / n, v.y / n) : new Vector2D(0, 0);
  }

  static dist(v: Vector2D, u: Vector2D): number {
    return Math.sqrt((v.x - u.x) ** 2 + (v.y - u.y) ** 2);
  }

  static equal(v: Vector2D, u: Vector2D): boolean {
    return v.x == u.x && v.y == u.y;
  }

  static zero(v: Vector2D): boolean {
    return !v.x && !v.y;
  }

  static dot(v: Vector2D, u: Vector2D): number {
    return v.x * u.x + v.y * u.y;
  }
}
