export type Vector3D = [number, number, number];

export class V3 {
  static add(a: Vector3D, b: Vector3D): Vector3D {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  static mul(a: Vector3D, factor: number): Vector3D {
    return [a[0] * factor, a[1] * factor, a[2] * factor];
  }
}
