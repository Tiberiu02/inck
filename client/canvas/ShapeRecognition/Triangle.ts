import { StrokePoint } from "../types";
import { mod } from "./Util";
import { V2, Vector2D } from "../Math/V2";
import { Thresholds } from "./Thresholds";
/**
 *
 * @param points The points of the triangle
 * @returns The index of the right angle, -1 if none is
 */
export function DetectTriangleRightAngle(points: StrokePoint[]): number {
  const N = points.length - 1;
  const right_angles: number[] = [];

  // Compute right angles
  for (let i = 0; i < 3; i++) {
    const p1 = points[(i + N - 1) % N];
    const p2 = points[i];
    const p3 = points[(i + 1) % N];
    const angle = Math.abs(V2.angle(V2.sub(p1, p2), V2.sub(p3, p2)));

    if (angle < Thresholds.RIGHT_ANGLE_MAX_THRESHOLD_TRI && angle > Thresholds.RIGHT_ANGLE_MIN_THRESHOLD_TRI) {
      right_angles.push(i);
    }
  }

  // Avoid classifing elongated isosceles triangles
  return right_angles.length == 1 ? right_angles[0] : -1;
}

/**
 *
 * @param points The points of the triangle
 * @param right_index The index of the angle close to 90 degrees
 * @returns The closest right angled triangle to the original one
 */
export function CreateRightAngle(points: StrokePoint[], right_index: number): StrokePoint[] {
  const x_points: number[] = points.map(point => point.x);
  const y_points: number[] = points.map(point => point.y);

  //https://www.dummies.com/article/academics-the-arts/math/geometry/find-right-angle-two-points-230069/
  //https://math.stackexchange.com/questions/127613/closest-point-on-circle-edge-from-point-outside-inside-the-circle
  //The idea is to find the closest point between:
  //1)The point that is close to 90 degrees
  //2)The circle created by the other two points

  const index1 = mod(right_index - 1, 3);
  const index2 = mod(right_index + 1, 3);

  //Create vectors for the triangle's 3 points
  const right_point = new Vector2D(x_points[right_index], y_points[right_index]);
  const other_point1 = new Vector2D(x_points[index1], y_points[index1]);
  const other_point2 = new Vector2D(x_points[index2], y_points[index2]);

  //Get the radius of the circle formed by the other 2 points
  const r = V2.dist(other_point1, other_point2) / 2;
  //Get the center of that circle
  const circle_center = new Vector2D(
    (x_points[index1] + x_points[index2]) / 2,
    (y_points[index1] + y_points[index2]) / 2
  );

  //Create a normalized vector pointing from the center of the circle to the right point and scale it by r
  let direction_to_point = V2.sub(right_point, circle_center);
  direction_to_point = V2.normalize(direction_to_point);
  direction_to_point = V2.mul(direction_to_point, r);

  //Add this direction to the center of the circle to get the desired point
  const new_right_point = V2.add(circle_center, direction_to_point);

  //Modify the points accordingly
  points[right_index] = {
    x: new_right_point.x,
    y: new_right_point.y,
    pressure: points[right_index].pressure,
    timestamp: points[right_index].timestamp,
  };

  if (right_index == 0) {
    points[3] = points[0];
  }

  return points;
}

/**
 *
 * @param points Points of the triangle
 * @returns Points forming a relatively close equilateral triangle
 */
export function CreateEquilateral(points: StrokePoint[]): StrokePoint[] {
  const x_points: number[] = points.map(point => point.x);
  const y_points: number[] = points.map(point => point.y);

  //The idea is to get the average length and start with the first edge and keep rotating to create the triangle
  let v0 = new Vector2D(x_points[0], y_points[0]);
  let v1 = new Vector2D(x_points[1], y_points[1]);
  let v2 = new Vector2D(x_points[2], y_points[2]);
  const l1 = V2.dist(v0, v1);
  const l2 = V2.dist(v0, v2);
  const l3 = V2.dist(v1, v2);

  const length = (l1 + l2 + l3) / 3;

  //The first direction (of the first side) is going from point 0 to 1
  let curr_direction = V2.sub(v1, v0);
  curr_direction = V2.normalize(curr_direction);
  curr_direction = V2.mul(curr_direction, length);

  //Point 1 is moved to be exactly "lenght" away from point 0
  v1 = V2.add(v0, curr_direction);

  //Rotate 120 or -120 degrees to have an inner angle of 60 degrees
  const direction_left = V2.rot(curr_direction, (2 * Math.PI) / 3);
  const direction_right = V2.rot(curr_direction, (-2 * Math.PI) / 3);

  //Try both orientations and pick the closest to point 2
  const left_v2 = V2.add(v1, direction_left);
  const right_v2 = V2.add(v1, direction_right);

  v2 = V2.dist(left_v2, v2) < V2.dist(right_v2, v2) ? left_v2 : right_v2;

  //Update strokes
  points[1] = {
    x: v1.x,
    y: v1.y,
    pressure: points[1].pressure,
    timestamp: points[1].timestamp,
  };
  points[2] = {
    x: v2.x,
    y: v2.y,
    pressure: points[2].pressure,
    timestamp: points[2].timestamp,
  };

  return points;
}
