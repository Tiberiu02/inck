import { Display } from "../DeviceProps";
import { m4 } from "../Math/M4";
import { GL } from "../Rendering/GL";
import { CreateRectangleVector } from "../Rendering/Utils";
import { RGB } from "../types";
import { View } from "../View/View";

export class GridBackground {
  private spacing: number;
  private array: number[];
  private buffer: WebGLBuffer;

  constructor(spacing: number) {
    this.spacing = spacing;
    this.buffer = GL.ctx.createBuffer();
    this.initGrid();
  }

  private initGrid() {
    const color: RGB = [0.94, 0.95, 0.96];

    const size = Math.max(Display.AspectRatio, 1 / Display.AspectRatio) * 2;
    const nVertical = Math.round(1 / this.spacing) - 2;
    const s = 1 / (nVertical + 2);
    this.spacing = s;
    const nHorizontal = Math.ceil(size / s) + 3;

    const horizontalLines = Array(nHorizontal)
      .fill(0)
      .flatMap((_, i) => CreateRectangleVector(s, s + i * s, 1 - s * 2, s * 0.04, color, true));

    const verticalLines = Array(nVertical + 1)
      .fill(0)
      .flatMap((_, i) => CreateRectangleVector(s + i * s, s, s * 0.04, size, color, true));

    this.array = [...horizontalLines, ...verticalLines];

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
