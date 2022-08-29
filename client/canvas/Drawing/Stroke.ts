import { SmoothStrokeBuilder } from "./SmoothStrokeBuilder";
import { RGB, StrokePoint } from "../types";
import { TranslateVectorGraphic, VectorGraphic } from "./VectorGraphic";
import { PersistentGraphic, SerializedGraphic, Serializers } from "./Graphic";

export const ELEMENTS_PER_INPUT = 4;
export const OFFSET_INPUT = {
  X: 0,
  Y: 1,
  P: 2,
  T: 3,
};

export interface Stroke extends PersistentGraphic {
  readonly color: RGB;
  readonly width: number;
  readonly points: StrokePoint[];
  readonly timestamp: number;
  readonly zIndex: number;
  readonly graphic: VectorGraphic;
}

export interface SerializedStroke extends SerializedGraphic {
  readonly color: [number, number, number];
  readonly width: number;
  readonly data: number[];
  readonly timestamp: number;
  readonly zIndex: number;
}

export function SerializeStroke(stroke: Stroke): SerializedStroke {
  const data = [].concat(...stroke.points.map(p => [p.x, p.y, p.pressure, p.timestamp]));
  return {
    id: stroke.id,
    deserializer: Serializers.STROKE,
    zIndex: stroke.zIndex,
    width: stroke.width,
    color: stroke.color,
    data: data,
    timestamp: stroke.timestamp,
  };
}

export function DeserializeStroke(stroke: SerializedStroke): Stroke {
  const builder = new SmoothStrokeBuilder(stroke.timestamp, stroke.zIndex, stroke.color, stroke.width);

  for (let i = 0; i < stroke.data.length; i += ELEMENTS_PER_INPUT)
    builder.push({
      x: stroke.data[i + OFFSET_INPUT.X],
      y: stroke.data[i + OFFSET_INPUT.Y],
      pressure: stroke.data[i + OFFSET_INPUT.P],
      timestamp: stroke.data[i + OFFSET_INPUT.T],
    });

  return builder.getStroke(stroke.id);
}

export function DeserializeStrokeLegacy(data: any): Stroke {
  const color = data.color && Array.isArray(data.color) ? data.color.slice(0, 3) : [0, 0, 0];
  const zIndex = data.type == "h" ? 0 : data.zIndex ?? 1;
  const { width, timestamp, path, id } = data;

  const builder = new SmoothStrokeBuilder(timestamp, zIndex, color, width);
  for (let i = 0; i < path.length; i += ELEMENTS_PER_INPUT)
    builder.push({
      x: path[i + OFFSET_INPUT.X],
      y: path[i + OFFSET_INPUT.Y],
      pressure: path[i + OFFSET_INPUT.P],
      timestamp: path[i + OFFSET_INPUT.T],
    });

  return builder.getStroke(id);
}

export function TranslateStroke(stroke: Stroke, dx: number, dy: number): Stroke {
  return {
    ...stroke,
    geometry: stroke.geometry.translate(dx, dy),
    graphic: TranslateVectorGraphic(stroke.graphic, dx, dy),
    points: stroke.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })),
  };
}
