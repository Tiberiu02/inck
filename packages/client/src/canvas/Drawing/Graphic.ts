import { Geometry, VoidGeometry } from "../Math/Geometry";
import { Vector2D } from "../Math/V2";
import {
  DeserializeStroke,
  DeserializeStrokeLegacy,
  RotateStroke,
  ScaleStroke,
  SerializedStroke,
  SerializeStroke,
  Stroke,
  TranslateStroke,
} from "./Stroke";
import { RotateVectorGraphic, ScaleVectorGraphic, TranslateVectorGraphic, VectorGraphic } from "./VectorGraphic";

export enum GraphicTypes {
  VECTOR,
  IMAGE,
  REMOVED,
}

export enum Serializers {
  REMOVED = "removed",
  STROKE = "stroke",
  SELECTION = "selection",
}

export interface Graphic {
  readonly type: GraphicTypes;
  readonly zIndex: number;
}

export interface PersistentGraphic {
  readonly id: string;
  readonly serializer: Serializers;
  readonly geometry: Geometry;
  readonly graphic: Graphic;
  readonly timestamp: number;
}

export interface SerializedGraphic {
  readonly id: string;
  readonly timestamp: number;
  readonly deserializer: Serializers;
}

export function RemovedGraphic(id: string, timestamp?: number): PersistentGraphic {
  return {
    id,
    timestamp: timestamp || Date.now(),
    serializer: Serializers.REMOVED,
    geometry: new VoidGeometry(),
    graphic: {
      type: GraphicTypes.REMOVED,
      zIndex: 0,
    },
  };
}

function SerializeRemoved(g: PersistentGraphic): SerializedGraphic {
  return {
    id: g.id,
    timestamp: g.timestamp,
    deserializer: g.serializer,
  };
}

export function SerializeGraphic(graphic: PersistentGraphic): SerializedGraphic {
  if (graphic.serializer == Serializers.STROKE) {
    return SerializeStroke(graphic as Stroke);
  } else if (graphic.serializer == Serializers.REMOVED) {
    return SerializeRemoved(graphic);
  }
  return null;
}

export function DeserializeGraphic(data: SerializedGraphic): PersistentGraphic {
  let graphic = null;
  try {
    if (data.deserializer == Serializers.STROKE) {
      graphic = DeserializeStroke(data as SerializedStroke);
    } else if (data.deserializer == Serializers.REMOVED) {
      graphic = RemovedGraphic(data.id, data.timestamp);
    } else if (!data.deserializer) {
      graphic = DeserializeStrokeLegacy(data);
    }
  } catch {}
  return graphic;
}

export function TranslateGraphic(graphic: Graphic, dx: number, dy: number) {
  if (graphic.type == GraphicTypes.VECTOR) {
    return TranslateVectorGraphic(graphic as VectorGraphic, dx, dy);
  } else {
    return graphic;
  }
}

export function TranslatePersistentGraphic(graphic: PersistentGraphic, dx: number, dy: number) {
  if (graphic.serializer == Serializers.STROKE) {
    return TranslateStroke(graphic as Stroke, dx, dy);
  } else {
    return graphic;
  }
}

export function RotateGraphic(graphic: Graphic, angle: number, center: Vector2D) {
  if (graphic.type == GraphicTypes.VECTOR) {
    return RotateVectorGraphic(graphic as VectorGraphic, angle, center);
  } else {
    return graphic;
  }
}

export function RotatePersistentGraphic(graphic: PersistentGraphic, angle: number, center: Vector2D) {
  if (graphic.serializer == Serializers.STROKE) {
    return RotateStroke(graphic as Stroke, angle, center);
  } else {
    return graphic;
  }
}

export function ScaleGraphic(graphic: Graphic, factor: number, center: Vector2D) {
  if (graphic.type == GraphicTypes.VECTOR) {
    return ScaleVectorGraphic(graphic as VectorGraphic, factor, center);
  } else {
    return graphic;
  }
}

export function ScalePersistentGraphic(graphic: PersistentGraphic, factor: number, center: Vector2D) {
  if (graphic.serializer == Serializers.STROKE) {
    return ScaleStroke(graphic as Stroke, factor, center);
  } else {
    return graphic;
  }
}
