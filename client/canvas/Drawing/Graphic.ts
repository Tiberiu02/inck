import { Geometry } from "../Math/Geometry";
import {
  DeserializeStroke,
  DeserializeStrokeLegacy,
  SerializedStroke,
  SerializeStroke,
  Stroke,
  TranslateStroke,
} from "./Stroke";
import { TranslateVectorGraphic, VectorGraphic } from "./VectorGraphic";

export enum GraphicTypes {
  VECTOR,
  IMAGE,
}

export const Serializers = {
  STROKE: "stroke",
  SELECTION: "selection",
};

export interface Graphic {
  readonly type: GraphicTypes;
  readonly zIndex: number;
}

export interface PersistentGraphic {
  readonly id: string;
  readonly serializer: string;
  readonly geometry: Geometry;
  readonly graphic: Graphic;
}

export interface SerializedGraphic {
  readonly id: string;
  readonly deserializer: string;
}

export function SerializeGraphic(graphic: PersistentGraphic): SerializedGraphic {
  console.log(graphic);
  if (graphic.serializer == Serializers.STROKE) {
    return SerializeStroke(graphic as Stroke);
  }
  return null;
}

export function DeserializeGraphic(data: SerializedGraphic) {
  let graphic = null;
  try {
    if (data.deserializer == Serializers.STROKE) {
      graphic = DeserializeStroke(data as SerializedStroke);
    } else if (!data.deserializer) {
      graphic = DeserializeStrokeLegacy(data);
    }
  } catch {}
  return graphic;
}

export function TranslatePersistentGraphic(graphic: PersistentGraphic, dx: number, dy: number) {
  if (graphic.serializer == Serializers.STROKE) {
    return TranslateStroke(graphic as Stroke, dx, dy);
  } else {
    return graphic;
  }
}

export function TranslateGraphic(graphic: Graphic, dx: number, dy: number) {
  if (graphic.type == GraphicTypes.VECTOR) {
    return TranslateVectorGraphic(graphic as VectorGraphic, dx, dy);
  } else {
    return graphic;
  }
}
