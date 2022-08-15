import { StrokeBuilder } from "./StrokeBuilder";
import { RGB, StrokePoint } from "../types";
import { SerializedVectorGraphic, VectorGraphic } from "./VectorGraphic";

export const ELEMENTS_PER_INPUT = 4;
export const OFFSET_INPUT = {
  X: 0,
  Y: 1,
  P: 2,
  T: 3,
};

export interface Stroke extends VectorGraphic {
  readonly color: RGB;
  readonly width: number;
  readonly points: StrokePoint[];

  readonly timestamp: number;
}

export interface SerializedStroke extends SerializedVectorGraphic {
  readonly color: [number, number, number];
  readonly width: number;
  readonly data: number[];
}

export function SerializeStroke(stroke: Stroke): SerializedStroke {
  const data = [].concat(...stroke.points.map(p => [p.x, p.y, p.pressure, p.timestamp]));
  return {
    id: stroke.id,
    deserializer: "stroke",
    zIndex: stroke.zIndex,
    width: stroke.width,
    color: stroke.color,
    data: data,
    timestamp: stroke.timestamp,
  };
}

export function DeserializeStroke(stroke: SerializedStroke): Stroke {
  const builder = new StrokeBuilder(stroke.id, stroke.timestamp, stroke.zIndex, stroke.color, stroke.width);

  for (let i = 0; i < stroke.data.length; i += ELEMENTS_PER_INPUT)
    builder.push({
      x: stroke.data[i + OFFSET_INPUT.X],
      y: stroke.data[i + OFFSET_INPUT.Y],
      pressure: stroke.data[i + OFFSET_INPUT.P],
      timestamp: stroke.data[i + OFFSET_INPUT.T],
    });

  return builder.getStroke();
}

export function DeserializeStrokeLegacy(data: any): Stroke {
  const color = data.color && Array.isArray(data.color) ? data.color.slice(0, 3) : [0, 0, 0];
  const zIndex = data.type == "h" ? 0 : data.zIndex ?? 1;
  const { width, timestamp, path, id } = data;

  const builder = new StrokeBuilder(id, timestamp, zIndex, color, width);
  for (let i = 0; i < path.length; i += ELEMENTS_PER_INPUT)
    builder.push({
      x: path[i + OFFSET_INPUT.X],
      y: path[i + OFFSET_INPUT.Y],
      pressure: path[i + OFFSET_INPUT.P],
      timestamp: path[i + OFFSET_INPUT.T],
    });

  return builder.getStroke();
}