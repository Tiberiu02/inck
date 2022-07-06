export interface Vector2D {
  x: number;
  y: number;
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
