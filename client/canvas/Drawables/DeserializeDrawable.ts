import { Drawable } from "./Drawable";
import { Fill } from "./Fill";
import { ELEMENTS_PER_INPUT, OFFSET_INPUT, Stroke } from "./Stroke";

export function DeserializeDrawable(data: any): Drawable {
  if (data.type == "e") {
    return DeserializeEraser(data);
  } else {
    return DeserializeStroke(data);
  }
}

export function DeserializeStroke(data: any): Stroke {
  const color = data.color.slice(0, 3);
  const zIndex = data.type == "h" ? 0 : data.zIndex ?? 1;
  const { width, timestamp, path, id } = data;

  const stroke = new Stroke(color, width, zIndex, timestamp, id);
  for (let i = 0; i < path.length; i += ELEMENTS_PER_INPUT)
    stroke.push({
      x: path[i + OFFSET_INPUT.X],
      y: path[i + OFFSET_INPUT.Y],
      pressure: path[i + OFFSET_INPUT.P],
      timestamp: path[i + OFFSET_INPUT.T],
    });

  return stroke;
}

export function DeserializeEraser({ path }): Fill {
  const fill = new Fill([0, 0, 0], 1);

  for (let i = 0; i < path.length; i += ELEMENTS_PER_INPUT) {
    fill.push({
      x: path[i + OFFSET_INPUT.X],
      y: path[i + OFFSET_INPUT.Y],
      pressure: path[i + OFFSET_INPUT.P],
      timestamp: path[i + OFFSET_INPUT.T],
    });
  }

  return fill;
}
