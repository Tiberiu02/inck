import { Display } from "../DeviceProps";
import { m4 } from "../Math/M4";
import { GL } from "../Rendering/GL";
import { CreateRectangleVector } from "../Rendering/Utils";
import { RGB } from "../types";
import { View } from "../View/View";

export class LinesBackground {
  private spacing: number;
  private array: number[];
  private buffer: WebGLBuffer;

  constructor(spacing: number) {
    this.spacing = spacing;
    this.buffer = GL.ctx.createBuffer();
    this.initGrid();
  }

  private initGrid() {
    const color: RGB = [0.92, 0.93, 0.95];

    const nHorizontal = Math.ceil(Math.max(1, 1 / Display.AspectRatio) / this.spacing) + 3;

    const horizontalLines = Array(nHorizontal)
      .fill(0)
      .flatMap((_, i) =>
        CreateRectangleVector(
          this.spacing / 2,
          this.spacing / 2 + i * this.spacing,
          1 - this.spacing,
          this.spacing * 0.02,
          color,
          true
        )
      );

    this.array = horizontalLines;

    GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, this.buffer);
    GL.ctx.bufferData(GL.ctx.ARRAY_BUFFER, new Float32Array(this.array), GL.ctx.STATIC_DRAW);
  }

  render() {
    const transform = m4.multiply(
      View.instance.getTransformMatrix(),
      m4.translation(0, this.spacing * Math.max(0, Math.floor(View.instance.getTop() / this.spacing) - 1), 0)
    );
    GL.renderVector(this.array, transform, this.buffer);
  }
}
