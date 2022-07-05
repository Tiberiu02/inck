import cluster from "cluster";
import { ELEMENTS_PER_VERTEX, GL } from "./GL";
import { Tool } from "./Tools";
import { Rectangle } from "./types";

const BUFFER_SIZE = 5e4;

const NUM_LAYERS = 2;
const PAGE_HEIGHT = 1;

class StrokeBuffer {
  private gl: WebGL2RenderingContext;
  private array: number[];
  private buffer: WebGLBuffer;
  private synced: boolean;
  private strokes: { id: string; size: number }[];
  program: WebGLProgram;
  getUniforms: () => object;

  constructor(gl: WebGL2RenderingContext, program: WebGLProgram, getUniforms: () => object, array: number[] = []) {
    this.gl = gl;
    this.array = array;
    this.buffer = gl.createBuffer();
    this.synced = false;
    this.strokes = [];
    this.program = program;
    this.getUniforms = getUniforms;
  }

  canAdd(array: number[]): boolean {
    return this.array.length + array.length <= BUFFER_SIZE;
  }

  add(id: string, array: number[]): void {
    this.array.push(...array);
    this.synced = false;
    this.strokes.push({ id, size: array.length });
  }

  remove(id: string): boolean {
    let start = 0;
    let index = 0;
    while (index < this.strokes.length && this.strokes[index].id !== id) {
      start += this.strokes[index].size;
      index += 1;
    }

    if (index == this.strokes.length) {
      return false;
    }

    this.array.splice(start, this.strokes[index].size);
    this.strokes.splice(index, 1);
    this.synced = false;
  }

  render(): void {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    if (!this.synced) {
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.array), this.gl.STREAM_DRAW);
      this.synced = true;
    }
    GL.setProgram(this.gl, this.program, this.getUniforms());
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.array.length / ELEMENTS_PER_VERTEX);
  }

  isEmpty(): boolean {
    return this.array.length == 0;
  }
}

class StrokeCluster {
  private gl: WebGL2RenderingContext;
  private buffers: StrokeBuffer[];
  private strokeLocation: object;
  program: WebGLProgram;
  getUniforms: () => object;

  constructor(gl: WebGL2RenderingContext, program: WebGLProgram, getUniforms: () => object) {
    this.gl = gl;
    this.buffers = [];
    this.strokeLocation = {};
    this.program = program;
    this.getUniforms = getUniforms;
  }

  addStroke(id: string, array: number[]) {
    if (this.buffers.length && this.buffers[this.buffers.length - 1].canAdd(array)) {
      const buffer = this.buffers[this.buffers.length - 1];
      buffer.add(id, array);
      this.strokeLocation[id] = buffer;
    } else {
      const buffer = new StrokeBuffer(this.gl, this.program, this.getUniforms, array);
      this.buffers.push(buffer);
      this.strokeLocation[id] = buffer;
    }
  }

  removeStroke(id: string) {
    const buffer = this.strokeLocation[id];
    buffer.remove(id);
    if (buffer.isEmpty()) {
      this.buffers = this.buffers.filter(b => b != buffer);
    }
  }

  render() {
    for (const buffer of this.buffers) {
      buffer.render();
    }
  }
}

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private layers: StrokeCluster[];
  private buffer: WebGLBuffer;
  private getUniforms: () => object;
  private defaultProgram: WebGLProgram;
  private activeStrokes: Tool[];

  constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, program: WebGLProgram, getUniforms: () => object) {
    this.canvas = canvas;
    this.gl = gl;
    this.layers = [...Array(NUM_LAYERS)].map(_ => new StrokeCluster(gl, program, getUniforms));
    this.buffer = gl.createBuffer();
    this.getUniforms = getUniforms;
    this.defaultProgram = program;
    this.activeStrokes = [];
  }

  addStroke(stroke: Tool): void {
    this.layers[stroke.zIndex].addStroke(stroke.id, stroke.vectorize());
  }

  removeStroke(stroke: Tool): void {
    this.layers[stroke.zIndex].removeStroke(stroke.id);
  }

  addActiveStroke(stroke: Tool) {
    this.activeStrokes.push(stroke);
  }

  render(): void {
    this.layers.forEach((layer, ix) => {
      layer.render();
      this.activeStrokes.filter(stroke => stroke.zIndex == ix).forEach(stroke => this.renderStroke(stroke.vectorize(true)));
    });
    this.activeStrokes = [];
  }

  renderStroke(array: number[], program?: WebGLProgram): void {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(array), this.gl.STREAM_DRAW);
    GL.setProgram(this.gl, program ?? this.defaultProgram, this.getUniforms());
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, array.length / ELEMENTS_PER_VERTEX);
  }

  clearCanvas() {
    this.gl.clearColor(1, 1, 1, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }
}
