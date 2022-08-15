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
