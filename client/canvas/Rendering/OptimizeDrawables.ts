import { Graphic, GraphicTypes } from "../Drawing/Graphic";
import { VectorGraphic } from "../Drawing/VectorGraphic";
import { BUFFER_SIZE } from "./BaseStrokeContainer";

export function OptimizeDrawables(drawables: Graphic[]): Graphic[] {
  const vectors: VectorGraphic[] = drawables.filter(d => d.type == GraphicTypes.VECTOR) as VectorGraphic[];
  const nonVectors = drawables.filter(d => d.type != GraphicTypes.VECTOR);

  const layers = new Set(drawables.map(d => d.zIndex));

  const optimized = [];
  for (const layer of layers) {
    const v = vectors.filter(g => g.zIndex == layer);
    if (v.length) {
      let compounded = v[0];
      for (let i = 1; i < v.length; i++) {
        if (compounded.vector.length + v[i].vector.length < BUFFER_SIZE)
          compounded = {
            ...compounded,
            vector: compounded.vector.concat(v[i].vector),
          };
        else {
          optimized.push(compounded);
          compounded = v[i];
        }
      }
      optimized.push(compounded);
    }
  }

  return optimized.concat(nonVectors);
}
