import { GL, ELEMENTS_PER_VERTEX } from "./GL";

const INDEX_LIMIT = 1e4;

export default class Buffers {
  gl: any;
  drawType: any;
  list: { arrays: { vertex: any[]; index: any[] }; buffers: { vertex: any; index: any }; synced: boolean }[];
  yMax: number;

  constructor(gl, drawType) {
    this.gl = gl;
    this.drawType = drawType;
    this.list = [this.newBuffer()];
    this.yMax = 0;
  }

  newBuffer() {
    return {
      arrays: {
        vertex: [],
        index: [],
      },
      buffers: GL.createBuffers(this.gl),
      synced: true,
    };
  }

  push(vertex, index) {
    if (this.list[this.list.length - 1].arrays.index.length + index.length > INDEX_LIMIT) this.list.push(this.newBuffer());

    //console.log(this.yMax, vertex)
    for (let i = 0; i < vertex.length; i += ELEMENTS_PER_VERTEX) this.yMax = Math.max(this.yMax, vertex[i + 1]);
    GL.appendArray(this.list[this.list.length - 1].arrays, vertex, index);
    this.list[this.list.length - 1].synced = false;
  }

  draw(preDraw) {
    for (let b of this.list) {
      GL.bindBuffers(this.gl, b.buffers);
      if (!b.synced) {
        GL.bufferArrays(this.gl, b.arrays);
        b.synced = true;
      }
      preDraw();
      this.gl.drawElements(this.gl.TRIANGLES, b.arrays.index.length, this.gl.UNSIGNED_SHORT, 0);
    }
  }
}
