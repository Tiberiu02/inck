import { GL, ELEMENTS_PER_VERTEX } from "./GL";

const INDEX_LIMIT = 2e4;

export default class Buffers {
  gl: WebGL2RenderingContext;
  drawType: any;
  list: { array: number[]; buffer: any; synced: boolean }[];
  yMax: number;

  constructor(gl, drawType) {
    this.gl = gl;
    this.drawType = drawType;
    this.list = [this.newBuffer()];
    this.yMax = 0;
  }

  newBuffer() {
    return {
      array: [],
      buffer: this.gl.createBuffer(),
      synced: true,
    };
  }

  push(vertex: number[]) {
    if (this.list[this.list.length - 1].array.length + vertex.length > INDEX_LIMIT) this.list.push(this.newBuffer());

    //console.log(this.yMax, vertex)
    for (let i = 0; i < vertex.length; i += ELEMENTS_PER_VERTEX) this.yMax = Math.max(this.yMax, vertex[i + 1]);
    this.list[this.list.length - 1].array.push(...vertex);
    this.list[this.list.length - 1].synced = false;
  }

  draw(preDraw) {
    for (let b of this.list) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, b.buffer);
      if (!b.synced) {
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(b.array), this.gl.STREAM_DRAW);
        b.synced = true;
      }
      preDraw();
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, b.array.length / ELEMENTS_PER_VERTEX);
    }
  }
}
