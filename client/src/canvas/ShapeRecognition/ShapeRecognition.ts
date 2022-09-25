import { DetectPolyline3 } from "./Polyline";
import { CreateEquilateral, CreateRightAngle, DetectTriangleRightAngle } from "./Triangle";
import { V2, Vector2D } from "../Math/V2";
import { StrokePoint } from "../types";
import { Thresholds } from "./Thresholds";
import { AlignRectangleToAxis, CreateRectangle, DetectRectangle, RectangleToSquare } from "./Rectangle";
import { DetectEllipse } from "./Ellipse";
/**

This function receives a series of points and performs shape recognition.

INPUT ENCODING:
- The stroke drawn by the user as a series of N points
- Each point has 4 floating point values: x coordinate, y coordinate, pressure, and timestamp.

OUTPUT:
- The recognized shape as a series of N points (same as input), maybe a few more or less if that makes the implementation easier
- Each point has the same structure as the input
- Average velocity (distance / timestamp difference) between consecutive points as close to average velocity of the intial stroke
- For smooth shapes, the points should be sampled uniformly from the converted shape (i.e., at roughly equal distance from each other)
- If converted shape is a closed loop (usually the case), then first and last points should have the same coordinates
- All points have the same pressure, equal to the average pressure of the input points
- First and last output points should have the same timestamp as the first/last input points

The function should be able to detect the following shapes (in order of priority):
- Rectangle with sides parallel to the axis
- Circle
- Oval / Ellipse
- Line
- Triangle
- Square with sides parallel to axis
- Right angle triangle
- Rectangle at any angle
- Square at any angle

 */

export function DetectShape(inputs: StrokePoint[]): StrokePoint[] {
  if (inputs.length == 1) return inputs;

  const polyline = DetectPolyline3(inputs);
  const sides = polyline.length - 1;

  const [ellipse_points, isEllipse] = DetectEllipse(inputs);

  if (sides > 8 && isEllipse) {
    return ellipse_points;
  }

  // Polygon (closed loop)
  if (V2.equal(polyline[0], polyline.at(-1) as StrokePoint)) {
    if (sides == 3) {
      const right_angle_index = DetectTriangleRightAngle(polyline);
      if (right_angle_index !== -1) {
        return CreateRightAngle(polyline, right_angle_index);
        //} else if (DetectEqualSides(polyline)) {
        //  return CreateEquilateral(polyline);
      } else {
        return polyline;
      }
    } else if (sides == 4) {
      if (DetectRectangle(polyline)) {
        let rectangle = CreateRectangle(polyline);
        if (DetectEqualSides(polyline)) {
          rectangle = RectangleToSquare(rectangle);
        }
        rectangle = AlignRectangleToAxis(rectangle);
        return rectangle;
      } else {
        return polyline;
      }
    }
  }

  return polyline;
}

function DetectEqualSides(points: StrokePoint[]): boolean {
  const lengths: number[] = [];
  //Compute the array of side lenghts
  for (let i = 0; i < points.length - 1; i++) {
    const v1 = new Vector2D(points[i].x, points[i].y);
    const v2 = new Vector2D(points[i + 1].x, points[i + 1].y);
    lengths.push(V2.dist(v1, v2));
  }
  //Check that these lenghts are almost equal
  return Math.max(...lengths) / Math.min(...lengths) < Thresholds.EQUAL_SIDE_RATIO_THRESHOLD;
}
