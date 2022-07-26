import { Drawable } from "./Drawable";
import { FreeShape } from "./FreeShape";
import { Stroke } from "./Stroke";

export function DeserializeDrawable(data: any): Drawable {
  if (data.type == "e") {
    return FreeShape.deserialize(data);
  } else {
    return Stroke.deserialize(data);
  }
}
