import { ELEMENTS_PER_VERTEX } from "../Rendering/GL";
import { Drawable, SerializedDrawable } from "./Drawable";

export interface VectorGraphic extends Drawable {
  readonly zIndex: number;
  readonly timestamp: number;
  readonly vector: number[];
}

export interface SerializedVectorGraphic extends SerializedDrawable {
  readonly zIndex: number;
  readonly timestamp: number;
}

export function TranslateVectorArray(vector: number[], dx: number, dy: number): number[] {
  const newVector = [];
  for (let i = 0; i < vector.length; i += ELEMENTS_PER_VERTEX) {
    const p = vector.slice(i, i + ELEMENTS_PER_VERTEX);
    p[0] += dx;
    p[1] += dy;
    newVector.push(...p);
  }
  return newVector;
}
