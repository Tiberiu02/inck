import { StrokePoint } from "../types";
import { ArrayToStroke, RotatePoints } from "./Util";
import { V2, Vector2D } from "../Math/V2";
import { Thresholds } from "./Thresholds";

export function DetectRectangle(points: StrokePoint[]): boolean {
  let isRectangle = true;

  for (let i = 0; i < 4; i++) {
    const p1 = points[(i + 3) % 4];
    const p2 = points[i];
    const p3 = points[(i + 1) % 4];
    const angle = Math.abs(V2.angle(V2.sub(p1, p2), V2.sub(p3, p2)));

    isRectangle =
      isRectangle &&
      angle < Thresholds.RIGHT_ANGLE_MAX_THRESHOLD_RECT &&
      angle > Thresholds.RIGHT_ANGLE_MIN_THRESHOLD_RECT;
  }

  return isRectangle;
}

export function CreateRectangle(points: StrokePoint[]): StrokePoint[] {
  const p: Vector2D[] = [...points];

  // Align centers of diagonals
  const diagCenter: Vector2D[] = [];
  diagCenter[0] = V2.div(V2.add(p[0], p[2]), 2);
  diagCenter[1] = V2.div(V2.add(p[1], p[3]), 2);
  const center = V2.div(V2.add(diagCenter[0], diagCenter[1]), 2);
  for (let i = 0; i < 5; i++) {
    p[i] = V2.add(V2.sub(p[i], diagCenter[i % 2]), center);
  }

  // Make diagonals equal in length
  const diagLen: number[] = [];
  diagLen[0] = V2.dist(p[0], p[2]);
  diagLen[1] = V2.dist(p[1], p[3]);
  const len = Math.sqrt(diagLen[0] * diagLen[1]);
  for (let i = 0; i < 5; i++) {
    p[i] = V2.add(V2.mul(V2.sub(p[i], center), len / diagLen[i % 2]), center);
  }

  return points.map((pi, i) => ({ ...pi, ...p[i] }));
}

export function RectangleToSquare(points: StrokePoint[]): StrokePoint[] {
  const x_points: number[] = points.map(point => point.x);
  const y_points: number[] = points.map(point => point.y);

  //The idea is to Get average length and enlarge/shrink points to fit that lenght
  let v0 = new Vector2D(x_points[0], y_points[0]);
  let v1 = new Vector2D(x_points[1], y_points[1]);
  let v2 = new Vector2D(x_points[2], y_points[2]);
  let v3 = new Vector2D(x_points[3], y_points[3]);

  //Get average length
  const l1 = V2.dist(v0, v1);
  const l2 = V2.dist(v0, v3);
  const length = Math.sqrt(l1 * l2);

  //And the difference between each length and the average (divided by 2)
  const diff1 = (length - l1) / 2;
  const diff2 = (length - l2) / 2;

  //Get the 2 directions of the rectangle and scale by how much it needs to enlarge/shrink
  //Axis 1
  let dir_axis_1 = V2.sub(v1, v0);
  dir_axis_1 = V2.normalize(dir_axis_1);
  dir_axis_1 = V2.mul(dir_axis_1, diff1);
  //Axis 2
  let dir_axis_2 = V2.sub(v3, v0);
  dir_axis_2 = V2.normalize(dir_axis_2);
  dir_axis_2 = V2.mul(dir_axis_2, diff2);

  //Move each point according to the axis (need to imaine geometrically to understand why sub or add)
  v0 = V2.sub(v0, dir_axis_1);
  v1 = V2.add(v1, dir_axis_1);
  v2 = V2.add(v2, dir_axis_1);
  v3 = V2.sub(v3, dir_axis_1);

  v0 = V2.sub(v0, dir_axis_2);
  v1 = V2.sub(v1, dir_axis_2);
  v2 = V2.add(v2, dir_axis_2);
  v3 = V2.add(v3, dir_axis_2);

  //Update strokes
  const vectors: Vector2D[] = [v0, v1, v2, v3];
  for (let i = 0; i < 4; i++) {
    points[i] = {
      x: vectors[i].x,
      y: vectors[i].y,
      pressure: points[i].pressure,
      timestamp: points[i].timestamp,
    };
  }
  points[4] = points[0];

  return points;
}

export function AlignRectangleToAxis(points: StrokePoint[]): StrokePoint[] {
  const x_points: number[] = points.map(point => point.x);
  const y_points: number[] = points.map(point => point.y);

  //Get the angle between the polygon and the closest axis
  let angle = V2.angle(V2.sub(points[0], points[1]), new Vector2D(1, 0)) % (Math.PI / 2);
  angle = (angle + Math.PI / 2) % (Math.PI / 2);
  angle = ((angle + Math.PI / 4) % (Math.PI / 2)) - Math.PI / 4;

  //If the shape is too far from the axis don't adjust it
  if (Math.abs(angle) > Thresholds.ALIGNED_AXIS_THRESHOLD) {
    return points;
  } else {
    const [rotatedx, rotatedy] = RotatePoints(x_points, y_points, -angle);
    return ArrayToStroke(rotatedx, rotatedy, points);
  }
}
