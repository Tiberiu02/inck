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

  static rot(v: Vector2D, angle: number, center: Vector2D = new Vector2D(0, 0)): Vector2D {
    const [sin, cos] = [Math.sin(angle), Math.cos(angle)];
    const [x, y] = [v.x - center.x, v.y - center.y];
    return new Vector2D(x * cos - y * sin + center.x, x * sin + y * cos + center.y);
  }

  static scale(v: Vector2D, factor: number, center: Vector2D = new Vector2D(0, 0)): Vector2D {
    return V2.add(V2.mul(V2.sub(v, center), factor), center);
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

  static cross(v: Vector2D, u: Vector2D): number {
    return v.x * u.y - v.y * u.x;
  }

  static angle(v: Vector2D, u: Vector2D): number {
    const a = Math.acos(V2.dot(V2.normalize(u), V2.normalize(v)));
    return V2.cross(u, v) > 0 ? a : -a;
  }
}
