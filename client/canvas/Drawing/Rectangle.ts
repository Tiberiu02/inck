import { RGB } from "../types";
import { GraphicTypes } from "./Graphic";
import { VectorGraphic } from "./VectorGraphic";

export function CreateRectangleGraphic(
  x: number,
  y: number,
  w: number,
  h: number,
  color: RGB,
  zIndex: number
): VectorGraphic {
  const vector = [];
  vector.push(x, y, ...color, 1);
  vector.push(x, y, ...color, 1);
  vector.push(x + w, y, ...color, 1);
  vector.push(x, y + h, ...color, 1);
  vector.push(x + w, y + h, ...color, 1);
  vector.push(x + w, y + h, ...color, 1);
  return {
    type: GraphicTypes.VECTOR,
    zIndex,
    vector,
  };
}
