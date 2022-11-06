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
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const x = v.x - center.x;
    const y = v.y - center.y;
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

  static get Ox() {
    return new Vector2D(1, 0);
  }

  static get Oy() {
    return new Vector2D(0, 1);
  }
}

let aux = new Float32Array(2);

type Vector2Df = Float32Array;

export class V2f {
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

  static rot(x: number, y: number, angle: number, cx: number = 0, cy: number = 0): Vector2Df {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    x -= cx;
    y -= cy;
    aux[0] = x * cos - y * sin + cx;
    aux[1] = x * sin + y * cos + cy;
    return aux;
  }

  static scale(v: Vector2D, factor: number, center: Vector2D = new Vector2D(0, 0)): Vector2D {
    return V2.add(V2.mul(V2.sub(v, center), factor), center);
  }

  static norm(x: number, y: number): number {
    return Math.sqrt(x ** 2 + y ** 2);
  }

  static normalize(x: number, y: number): Vector2Df {
    const n = this.norm(x, y);
    if (n) {
      aux[0] = x / n;
      aux[1] = y / n;
    } else {
      aux[0] = 0;
      aux[1] = 0;
    }
    return aux;
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

  static dot(vx: number, vy: number, ux: number, uy: number): number {
    return vx * ux + vy * uy;
  }

  static cross(vx: number, vy: number, ux: number, uy: number): number {
    return vx * uy - vy * ux;
  }

  static angle(v: Vector2D, u: Vector2D): number {
    const a = Math.acos(V2.dot(V2.normalize(u), V2.normalize(v)));
    return V2.cross(u, v) > 0 ? a : -a;
  }

  static get Ox() {
    return new Vector2D(1, 0);
  }

  static get Oy() {
    return new Vector2D(0, 1);
  }
}
