import { Geometry } from "../Math/Geometry";
import {
  DeserializeStroke,
  DeserializeStrokeLegacy,
  SerializedStroke,
  SerializeStroke,
  Stroke,
  TranslateStroke,
} from "./Stroke";

export enum DrawableTypes {
  VECTOR,
}

export interface Drawable {
  readonly id: string;
  readonly serializer: string;
  readonly type: DrawableTypes;
  readonly geometry: Geometry;
  readonly glUniforms?: any;
}

export interface SerializedDrawable {
  readonly id: string;
  readonly deserializer: string;
}

export function SerializeDrawable(drawable: Drawable): SerializedDrawable {
  console.log(drawable);
  if (drawable.serializer == "stroke") {
    return SerializeStroke(drawable as Stroke);
  }
  return null;
}

export function DeserializeDrawable(data: SerializedDrawable) {
  let drawable = null;
  try {
    if (data.deserializer == "stroke") {
      drawable = DeserializeStroke(data as SerializedStroke);
    } else if (!data.deserializer) {
      drawable = DeserializeStrokeLegacy(data);
    }
  } catch {}
  return drawable;
}

export function TranslateDrawable(drawable: Drawable, dx: number, dy: number) {
  if (drawable.serializer == "stroke") {
    return TranslateStroke(drawable as Stroke, dx, dy);
  } else {
    return drawable;
  }
}
