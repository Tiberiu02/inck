import { StrokePoint } from "../types";
import { V2, Vector2D } from "../Math/V2";

export function RotatePoints(x_points: number[], y_points: number[], alpha: number): [number[], number[]] {
  const x_sum = x_points.reduce((a, b) => a + b, 0);
  const x_avg = x_sum / x_points.length || 0;

  const y_sum = y_points.reduce((a, b) => a + b, 0);
  const y_avg = y_sum / y_points.length || 0;

  const center = new Vector2D(x_avg, y_avg);
  const new_x_points: number[] = [];
  const new_y_points: number[] = [];

  for (let i = 0; i < x_points.length; i++) {
    const new_v = V2.rot(new Vector2D(x_points[i], y_points[i]), alpha, center);
    new_x_points.push(new_v.x);
    new_y_points.push(new_v.y);
  }
  return [new_x_points, new_y_points];
}

/**
 *
 * @param x x coordinates
 * @param y y coordinates
 * @param points original stroke points
 * @returns An array of stroke points from the x and y coordinates while preserving initial stroke properties
 */
export function ArrayToStroke(x: number[], y: number[], points: StrokePoint[]): StrokePoint[] {
  const output: StrokePoint[] = [];
  for (let i = 0; i < x.length; i++) {
    const point: StrokePoint = {
      x: x[i],
      y: y[i],
      pressure: points[i].pressure,
      timestamp: points[i].timestamp,
    };
    output.push(point);
  }
  return output;
}

/**
 *
 * @param n
 * @param m
 * @returns n%m but positive numbers only
 */
export function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}
