import { Drawable, DrawableTypes } from "../Drawing/Drawable";
import { Stroke } from "../Drawing/Stroke";
import { View } from "../View/View";
import { ELEMENTS_PER_VERTEX, GL } from "./GL";
import Profiler from "../Profiler";
import { Display } from "../DeviceProps";
import { VectorGraphic } from "../Drawing/VectorGraphic";
import { CanvasManager } from "../CanvasManager";
import { RenderLoop } from "./RenderLoop";

const BUFFER_SIZE = 5e4;
const NUM_LAYERS = 2;

function GetUniforms() {
  return {
    u_AspectRatio: Display.AspectRatio(),
    u_Left: View.getLeft(),
    u_Top: View.getTop(),
    u_Zoom: View.getZoom(),
  };
}

class StrokeBuffer {
  private gl: WebGL2RenderingContext;
  private array: number[];
  private buffer: WebGLBuffer;
  private synced: boolean;
  private strokes: { id: string; size: number }[];
  private program: WebGLProgram;

  constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
    this.gl = gl;
    this.array = [];
    this.buffer = gl.createBuffer();
    this.synced = false;
    this.strokes = [];
    this.program = program;
  }

  canAdd(array: number[]): boolean {
    return this.array.length + array.length <= BUFFER_SIZE;
  }

  add(id: string, array: number[]): void {
    for (const x of array) {
      this.array.push(x);
    }
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
    GL.setProgram(this.gl, this.program, GetUniforms());
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.array.length / ELEMENTS_PER_VERTEX);
  }

  isEmpty(): boolean {
    return this.array.length == 0;
  }
}

class StrokeCluster {
  private gl: WebGL2RenderingContext;
  private buffers: StrokeBuffer[];
  private strokeLocation: { [id: string]: StrokeBuffer };
  private program: WebGLProgram;

  constructor(gl: WebGL2RenderingContext, program: WebGLProgram) {
    this.gl = gl;
    this.buffers = [];
    this.strokeLocation = {};
    this.program = program;
  }

  addStroke(id: string, array: number[]) {
    if (this.buffers.length && this.buffers[this.buffers.length - 1].canAdd(array)) {
      const buffer = this.buffers[this.buffers.length - 1];
      buffer.add(id, array);
      this.strokeLocation[id] = buffer;
    } else {
      const buffer = new StrokeBuffer(this.gl, this.program);
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

export class BaseCanvasManager implements CanvasManager {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private layers: StrokeCluster[];
  private buffer: WebGLBuffer;
  private program: WebGLProgram;
  private activeStrokes: Stroke[];
  private strokes: { [id: string]: VectorGraphic };

  constructor() {
    this.canvas = document.createElement("canvas");
    document.body.appendChild(this.canvas);

    this.gl = GL.initWebGL(this.canvas);
    this.program = GL.createProgram(this.gl);
    this.layers = [...Array(NUM_LAYERS)].map(_ => new StrokeCluster(this.gl, this.program));
    this.buffer = this.gl.createBuffer();
    this.activeStrokes = [];
    this.strokes = {};

    // Adjust canvas size
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  add(drawable: Drawable): void {
    if (drawable.type == DrawableTypes.VECTOR) {
      const stroke = drawable as VectorGraphic;
      this.strokes[stroke.id] = stroke;
      this.layers[stroke.zIndex].addStroke(stroke.id, stroke.vector);
      RenderLoop.scheduleRender();
    }
  }

  remove(id: string): boolean {
    if (this.strokes[id] == undefined) {
      return false;
    }
    const zIndex = this.strokes[id].zIndex;
    delete this.strokes[id];

    const result = this.layers[zIndex].removeStroke(id);
    if (result) {
      RenderLoop.scheduleRender();
    }

    return result;
  }

  getAll(): Drawable[] {
    return Object.values(this.strokes);
  }

  addForNextRender(drawable: Drawable) {
    if (drawable.type == DrawableTypes.VECTOR) {
      this.activeStrokes.push(drawable as Stroke);
    }
  }

  render(): void {
    this.clearCanvas();
    this.layers.forEach((layer, ix) => {
      layer.render();
      this.activeStrokes
        .filter(stroke => stroke.zIndex == ix)
        .forEach(stroke => {
          Profiler.start("vectorization");
          const array = stroke.vector;
          Profiler.stop("vectorization");
          Profiler.start("active rendering");
          this.renderStroke(array);
          Profiler.stop("active rendering");
        });
    });
    this.activeStrokes = [];
  }

  private renderStroke(array: number[], program?: WebGLProgram): void {
    Profiler.start("binding");
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    Profiler.stop("binding");

    Profiler.start("buffering");
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(array), this.gl.STREAM_DRAW);
    // Note to self: don't bother with with gl.bufferSubData, doesn't work well on mobile
    Profiler.stop("buffering");

    Profiler.start("program");
    GL.setProgram(this.gl, program ?? this.program, GetUniforms());
    Profiler.stop("program");

    Profiler.start("drawing");
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, array.length / ELEMENTS_PER_VERTEX);
    Profiler.stop("drawing");
  }

  private viewport(x: number, y: number, width: number, height: number) {
    this.gl.viewport(x, y, width, height);
  }

  private resizeCanvas() {
    this.canvas.style.width = document.documentElement.clientWidth + "px";
    this.canvas.style.height = document.documentElement.clientHeight + "px";
    this.canvas.width = Math.round(document.documentElement.clientWidth * window.devicePixelRatio);
    this.canvas.height = Math.round(document.documentElement.clientHeight * window.devicePixelRatio);
    this.viewport(0, 0, this.canvas.width, this.canvas.height);

    RenderLoop.scheduleRender();
  }

  private clearCanvas() {
    this.gl.clearColor(1, 1, 1, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }
}
