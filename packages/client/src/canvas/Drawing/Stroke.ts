import { StrokeBuilder } from "./StrokeBuilder";
import { RGB, StrokePoint, Vector3D } from "../types";
import { RotateVectorGraphic, ScaleVectorGraphic, TranslateVectorGraphic, VectorGraphic } from "./VectorGraphic";
import { PersistentGraphic, SerializedGraphic, Serializers } from "./Graphic";
import { V2, Vector2D } from "../Math/V2";
import { PolyLine } from "../Math/Geometry";
import { GetPointRadius } from "./StrokeVectorizer";

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
  readonly zIndex: number;
  readonly graphic: VectorGraphic;
}

export interface SerializedStroke extends SerializedGraphic {
  readonly color: [number, number, number];
  readonly width: number;
  readonly data: number[];
  readonly zIndex: number;
}

export function SerializeStroke(stroke: Stroke): SerializedStroke {
  const data = [].concat(...stroke.points.map((p) => [p.x, p.y, p.pressure, p.timestamp]));
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
  const builder = new StrokeBuilder(stroke.timestamp, stroke.zIndex, stroke.color, stroke.width);

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

  const builder = new StrokeBuilder(timestamp, zIndex, color, width);
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
    points: stroke.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
  };
}

export function RotateStroke(stroke: Stroke, angle: number, center: Vector2D): Stroke {
  const points = stroke.points.map((p) => ({ ...p, ...V2.rot(p, angle, center) }));
  return {
    ...stroke,
    geometry: new PolyLine(points.map((p) => new Vector3D(p.x, p.y, GetPointRadius(stroke.width, p.pressure)))),
    graphic: RotateVectorGraphic(stroke.graphic, angle, center),
    points: points,
  };
}

export function ScaleStroke(stroke: Stroke, factor: number, center: Vector2D): Stroke {
  const points = stroke.points.map((p) => ({ ...p, ...V2.scale(p, factor, center) }));
  return {
    ...stroke,
    width: stroke.width * factor,
    geometry: new PolyLine(
      points.map((p) => new Vector3D(p.x, p.y, GetPointRadius(stroke.width * factor, p.pressure)))
    ),
    graphic: ScaleVectorGraphic(stroke.graphic, factor, center),
    points: points,
  };
}
