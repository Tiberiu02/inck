import { ViewManager } from "./Gestures";
import { ELEMENTS_PER_VERTEX, GL } from "./GL";
import Profiler from "./Profiler";
import { Tool } from "./Tools";

const BUFFER_SIZE = 5e4;
const NUM_LAYERS = 2;

class StrokeBuffer {
  private gl: WebGL2RenderingContext;
  private array: number[];
  private buffer: WebGLBuffer;
  private synced: boolean;
  private strokes: { id: string; size: number }[];
  program: WebGLProgram;
  getUniforms: () => object;

  constructor(gl: WebGL2RenderingContext, program: WebGLProgram, getUniforms: () => object) {
    this.gl = gl;
    this.array = [];
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

    return true;
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
      const buffer = new StrokeBuffer(this.gl, this.program, this.getUniforms);
      buffer.add(id, array);
      this.buffers.push(buffer);
      this.strokeLocation[id] = buffer;
    }
  }

  removeStroke(id: string): boolean {
    const buffer = this.strokeLocation[id];

    if (!buffer) return false;

    const status = buffer.remove(id);
    if (buffer.isEmpty()) {
      this.buffers = this.buffers.filter(b => b != buffer);
    }
    return status;
  }

  render() {
    for (const buffer of this.buffers) {
      buffer.render();
    }
  }
}

export class CanvasManager {
  private gl: WebGL2RenderingContext;
  private layers: StrokeCluster[];
  private buffer: WebGLBuffer;
  private program: WebGLProgram;
  private activeStrokes: Tool[];
  private zIndex: { [id: string]: number };

  protected view: ViewManager;

  public yMax: number;

  constructor(canvas: HTMLCanvasElement, view: ViewManager) {
    this.gl = GL.initWebGL(canvas);
    this.program = GL.createProgram(this.gl);
    this.layers = [...Array(NUM_LAYERS)].map(_ => new StrokeCluster(this.gl, this.program, () => view.getUniforms()));
    this.buffer = this.gl.createBuffer();
    this.view = view;
    this.activeStrokes = [];
    this.yMax = 0;
    this.zIndex = {};
  }

  addStroke(stroke: Tool): void {
    this.zIndex[stroke.id] = stroke.zIndex;
    this.layers[stroke.zIndex].addStroke(stroke.id, stroke.vectorize());
    this.yMax = Math.max(this.yMax, stroke.boundingBox.yMax);
  }

  removeStroke(id: string): boolean {
    if (this.zIndex[id] == undefined) {
      return false;
    }
    return this.layers[this.zIndex[id]].removeStroke(id);
  }

  addActiveStroke(stroke: Tool) {
    this.activeStrokes.push(stroke);
  }

  render(): void {
    this.clearCanvas();
    this.layers.forEach((layer, ix) => {
      layer.render();
      this.activeStrokes
        .filter(stroke => stroke.zIndex == ix)
        .forEach(stroke => {
          Profiler.start("vectorization");
          const array = stroke.vectorize(true);
          Profiler.stop("vectorization");
          Profiler.start("active rendering");
          this.renderStroke(array);
          Profiler.stop("active rendering");
        });
    });
    this.activeStrokes = [];
  }

  renderStroke(array: number[], program?: WebGLProgram): void {
    Profiler.start("binding");
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    Profiler.stop("binding");

    Profiler.start("buffering"); // Takes 90% of time
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(array), this.gl.STREAM_DRAW);
    Profiler.stop("buffering");

    Profiler.start("program");
    GL.setProgram(this.gl, program ?? this.program, this.view.getUniforms());
    Profiler.stop("program");

    Profiler.start("drawing");
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, array.length / ELEMENTS_PER_VERTEX);
    Profiler.stop("drawing");
  }

  viewport(x, y, width, height) {
    this.gl.viewport(x, y, width, height);
  }

  private clearCanvas() {
    this.gl.clearColor(1, 1, 1, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }
}
