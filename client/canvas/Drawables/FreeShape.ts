import { RGB } from "../types";
import { FillPath } from "../Math/Vectorization";
import { Stroke } from "./Stroke";

export class FreeShape extends Stroke {
  constructor(color: RGB) {
    super(color, 0, 1);
  }

  vectorize(active: boolean = false): number[] {
    const color = active ? [0.95, 0.95, 0.95, 1] : [1, 1, 1, 1];

    return FillPath(this.points, color);
  }

  serialize() {
    return {
      type: "e",
      path: this.points,
    };
  }

  static deserialize({ path, color }): FreeShape {
    const stroke = new FreeShape(color ?? [0, 0, 0]);

    for (let i = 0; i < path.length; i++) {
      stroke.push(path[i]);
    }

    return stroke;
  }
}
