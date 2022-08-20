import { ELEMENTS_PER_VERTEX } from "../Rendering/GL";
import { Graphic, PersistentGraphic, SerializedGraphic } from "./Graphic";

export interface VectorGraphic extends Graphic {
  readonly vector: number[];
  readonly glUniforms?: any;
}

export interface PersistentVectorGraphic extends PersistentGraphic {
  readonly zIndex: number;
  readonly graphic: VectorGraphic;
}

function TranslateVectorArray(vector: number[], dx: number, dy: number): number[] {
  const newVector = [];
  for (let i = 0; i < vector.length; i += ELEMENTS_PER_VERTEX) {
    const p = vector.slice(i, i + ELEMENTS_PER_VERTEX);
    p[0] += dx;
    p[1] += dy;
    newVector.push(...p);
  }
  return newVector;
}

export function TranslateVectorGraphic(graphic: VectorGraphic, dx: number, dy: number): VectorGraphic {
  return { ...graphic, vector: TranslateVectorArray(graphic.vector, dx, dy) };
}
