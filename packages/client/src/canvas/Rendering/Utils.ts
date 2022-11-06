import { Display } from "../DeviceProps";
import { RGB } from "../types";
import { View } from "../View/View";

// Aligns rectangle to pixel grid
// Should be done at every render, not just at initialization
// can be done with custom shaders
function ClampPx(x: number, offset = 0) {
  const pxSize = View.instance.getWidth() / Display.Width / window.devicePixelRatio;
  return Math.ceil((x - offset) / pxSize) * pxSize + offset;
}

export function CreateRectangleVector(
  x: number,
  y: number,
  w: number,
  h: number,
  color: RGB,
  joinable: boolean = false
): number[] {
  x = ClampPx(x, View.instance.getTop());
  y = ClampPx(y, View.instance.getLeft());
  w = ClampPx(w);
  h = ClampPx(h);

  const vector = [];

  if (joinable) {
    vector.push(x, y, ...color, 1);
    vector.push(x, y, ...color, 1);
  }
  vector.push(x, y, ...color, 1);
  vector.push(x + w, y, ...color, 1);
  vector.push(x, y + h, ...color, 1);
  vector.push(x + w, y + h, ...color, 1);
  if (joinable) {
    vector.push(x + w, y + h, ...color, 1);
    vector.push(x + w, y + h, ...color, 1);
  }

  return vector;
}
