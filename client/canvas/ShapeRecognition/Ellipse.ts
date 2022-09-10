import { mod } from "./Util";
import { StrokePoint } from "../types";
import { matrix, transpose, multiply, inv, add, eigs, column, concat, flatten, MathCollection, norm } from "mathjs";
import { Thresholds } from "./Thresholds";
import { V2, Vector2D } from "../Math/V2";

type Ellipse = {
  center: Vector2D;
  rx: number;
  ry: number;
  angle: number;
};

const WOBBLINESS_THRESHOLD = 0.001;

export function DetectEllipse(inputs: StrokePoint[]): [StrokePoint[], boolean] {
  // Try fitting the ellipse
  let ellipse: Ellipse;
  try {
    ellipse = FitEllipse(inputs);
  } catch (error) {
    return [inputs, false];
  }

  // See how well the ellipse fits the points
  const wobbliness = ComputeWobbliness(ellipse, inputs);
  if (wobbliness > WOBBLINESS_THRESHOLD) {
    return [inputs, false];
  }

  // Approximate to circle if close
  if (ellipse.rx / ellipse.ry < Thresholds.ELLIPSE_TO_CIRCLE_THRESHOLD) {
    ellipse.rx = ellipse.ry = Math.sqrt(ellipse.rx * ellipse.ry);
  }

  const points = GetEllipsePoints(ellipse, inputs);

  return [points, true];
}

function ComputeWobbliness(ellipse: Ellipse, points: Vector2D[]): number {
  let sum = 0;
  for (const p of points) {
    sum += ComputeDistanceToEllipse(ellipse, p) ** 2;
  }
  return sum / (points.length * ellipse.rx * ellipse.ry * (Math.PI * 2) ** 2);
}

function ComputeDistanceToEllipse(e: Ellipse, p: Vector2D): number {
  p = V2.sub(p, e.center);
  p = V2.rot(p, -e.angle);
  const phi = V2.angle({ x: p.x / e.rx, y: p.y / e.ry }, V2.Ox);

  let p_ellipse = new Vector2D(e.rx * Math.cos(phi), e.ry * Math.sin(phi));

  return V2.dist(p, p_ellipse);
}

function FitEllipse(points: Vector2D[]): Ellipse {
  // Using direct least squares method as described here:
  // https://scipython.com/blog/direct-linear-least-squares-fitting-of-an-ellipse/

  const cart = FitCartesianCone(points);
  const params = CartToPol(cart);

  return {
    center: new Vector2D(params[0], params[1]),
    rx: params[2],
    ry: params[3],
    angle: params[4],
  };
}

function FitCartesianCone(points: Vector2D[]): number[] {
  const x = points.map(p => p.x);
  const y = points.map(p => p.y);
  const x_squared = points.map(p => p.x * p.x);
  const y_squared = points.map(p => p.y * p.y);
  const x_y = points.map(p => p.x * p.y);
  const ones = points.map(_ => 1);

  const D1_T = matrix([x_squared, x_y, y_squared]);
  const D1 = transpose(D1_T);

  const D2_T = matrix([x, y, ones]);
  const D2 = transpose(D2_T);

  const S1 = multiply(D1_T, D1);
  const S2 = multiply(D1_T, D2);
  const S3 = multiply(D2_T, D2);

  const T = multiply(multiply(-1, inv(S3)), transpose(S2));
  const M_1 = add(S1, multiply(S2, T));

  const C = matrix([
    [0, 0, 2],
    [0, -1, 0],
    [2, 0, 0],
  ]);
  const M = multiply(inv(C), M_1);
  const ans = eigs(M);
  const eigvec = NormalizeColumns(ans.vectors);

  const con: number[] = [];
  for (let i = 0; i < eigvec[0].length; i++) {
    con.push(4 * eigvec[0][i] * eigvec[2][i] - eigvec[1][i] * eigvec[1][i]);
  }

  let ak: any = matrix([[], [], []]);
  for (let i = 0; i < eigvec[0].length; i++) {
    if (con[i] > 0) {
      ak = concat(ak, column(eigvec, i));
    }
  }

  const ak_mul = multiply(T, ak);
  const result: any = flatten(concat(ak, ak_mul, 0));

  return result._data;
}

function NormalizeColumns(v: MathCollection): number[][] {
  let result: any = matrix([[], [], []]);

  for (let i = 0; i < 3; i++) {
    let col = column(v, i);
    const n = norm(flatten(col)) as number;
    col = multiply(1 / n, col) as MathCollection;

    result = concat(result, col);
  }

  return result._data;
}

function CartToPol(coeffs: number[]): number[] {
  // We use the formulas from https://mathworld.wolfram.com/Ellipse.html
  // which assumes a cartesian form ax^2 + 2bxy + cy^2 + 2dx + 2fy + g = 0.
  // Therefore, rename and scale b, d and f appropriately.

  const a = coeffs[0];
  const b = coeffs[1] / 2;
  const c = coeffs[2];
  const d = coeffs[3] / 2;
  const f = coeffs[4] / 2;
  const g = coeffs[5];

  const den = b ** 2 - a * c;
  if (den > 0) {
    console.error("coeffs do not represent an ellipse: b^2 - 4ac must be negative!");
  }

  // The location of the ellipse centre.
  const x0 = (c * d - b * f) / den;
  const y0 = (a * f - b * d) / den;

  const num = 2 * (a * f ** 2 + c * d ** 2 + g * b ** 2 - 2 * b * d * f - a * c * g);
  const fac = Math.sqrt((a - c) ** 2 + 4 * b ** 2);

  // The semi-major and semi-minor axis lengths (these are not sorted).
  let ap = Math.sqrt(num / den / (fac - a - c));
  let bp = Math.sqrt(num / den / (-fac - a - c));

  // Sort the semi-major and semi-minor axis lengths but keep track of
  // the original relative magnitudes of width and height.
  let width_gt_height = true;
  if (ap < bp) {
    width_gt_height = false;
    [ap, bp] = [bp, ap];
  }

  // The eccentricity.
  let r = (bp / ap) ** 2;
  if (r > 1) {
    r = 1 / r;
  }

  // The angle of anticlockwise rotation of the major-axis from x-axis.
  let phi;
  if (b == 0) {
    phi = a < c ? 0 : Math.PI / 2;
  } else {
    phi = Math.atan((2 * b) / (a - c)) / 2;
    if (a > c) {
      phi += Math.PI / 2;
    }
  }

  //Ensure that phi is the angle to rotate to the semi-major axis.
  if (!width_gt_height) {
    phi += Math.PI / 2;
  }
  phi = mod(phi, Math.PI);

  return [x0, y0, ap, bp, phi];
}

function GetEllipsePoints(e: Ellipse, points: StrokePoint[]): StrokePoint[] {
  const N = points.length;
  const pressure = points.reduce((sum, p) => sum + p.pressure, 0) / N;

  const ellipsePoints: StrokePoint[] = [];

  for (let i = 0; i < N; i++) {
    const timestamp = (points[0].timestamp * (N - i) + points[N - 1].timestamp * i) / N;

    const angle = (Math.PI * 2 * i) / (N - 1);
    let p = new Vector2D(e.rx * Math.cos(angle), e.ry * Math.sin(angle));
    p = V2.rot(p, e.angle);
    p = V2.add(p, e.center);

    ellipsePoints.push({
      x: p.x,
      y: p.y,
      pressure,
      timestamp,
    });
  }

  return ellipsePoints;
}
