import { V2, Vector2D } from "../Math/V2";
import { ELEMENTS_PER_VERTEX } from "../Rendering/GL";
import { Graphic, PersistentGraphic, SerializedGraphic } from "./Graphic";

export interface VectorGraphic extends Graphic {
  vector: number[];
  glUniforms?: any;
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

function RotateVectorArray(vector: number[], angle: number, center: Vector2D): number[] {
  const newVector = [];
  for (let i = 0; i < vector.length; i += ELEMENTS_PER_VERTEX) {
    const p = vector.slice(i, i + ELEMENTS_PER_VERTEX);
    const r = V2.rot(new Vector2D(p[0], p[1]), angle, center);
    p[0] = r.x;
    p[1] = r.y;
    newVector.push(...p);
  }
  return newVector;
}

function ScaleVectorArray(vector: number[], factor: number, center: Vector2D): number[] {
  const newVector = [];
  for (let i = 0; i < vector.length; i += ELEMENTS_PER_VERTEX) {
    const p = vector.slice(i, i + ELEMENTS_PER_VERTEX);
    const r = V2.scale(new Vector2D(p[0], p[1]), factor, center);
    p[0] = r.x;
    p[1] = r.y;
    newVector.push(...p);
  }
  return newVector;
}

export function TranslateVectorGraphic(graphic: VectorGraphic, dx: number, dy: number): VectorGraphic {
  return { ...graphic, vector: TranslateVectorArray(graphic.vector, dx, dy) };
}

export function RotateVectorGraphic(graphic: VectorGraphic, angle: number, center: Vector2D) {
  return { ...graphic, vector: RotateVectorArray(graphic.vector, angle, center) };
}

export function ScaleVectorGraphic(graphic: VectorGraphic, factor: number, center: Vector2D) {
  return { ...graphic, vector: ScaleVectorArray(graphic.vector, factor, center) };
}
