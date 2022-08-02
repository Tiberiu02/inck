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

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface SimplePointerEvent {
  pointerId: number;
  type: string;
  x: number;
  y: number;
  pressure: number;
  timeStamp: number;
  target: EventTarget;
  pointerType: string;
  preventDefault: () => void;
}

export interface iosTouch extends Touch {
  touchType: string;
}

export type RGB = [number, number, number];
