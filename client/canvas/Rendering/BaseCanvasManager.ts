import { Drawable, DrawableTypes } from "../Drawing/Drawable";
import { Stroke } from "../Drawing/Stroke";
import { View } from "../View/View";
import { ELEMENTS_PER_VERTEX, GL } from "./GL";
import Profiler from "../Profiler";
import { Display } from "../DeviceProps";
import { VectorGraphic } from "../Drawing/VectorGraphic";
import { CanvasManager } from "../CanvasManager";
import { RenderLoop } from "./RenderLoop";

export const BUFFER_SIZE = 5e4;
export const NUM_LAYERS = 2;

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

import * as PDFJS from "pdfjs-dist";
import { m4 } from "../Math/M4";

import {
  ImageFragmentShaderSource,
  ImageVertexShaderSource,
  MainFragmentShaderSource,
  MainVertexShaderSource,
} from "./Shaders";
import { Image } from "../Drawing/Image";

async function LoadPdf() {
  const url = "/demo.pdf";
  const currentPage = 1;
  const scale = 1.5;

  PDFJS.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.15.349/pdf.worker.js`;
  const pdf = await PDFJS.getDocument(url).promise;

  Profiler.start("rendering page");
  const page = await pdf.getPage(currentPage);

  console.log("Printing " + currentPage);
  var viewport = page.getViewport({ scale });
  var canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  var renderContext = { canvasContext: ctx, viewport: viewport };

  canvas.height = viewport.height;
  canvas.width = viewport.width;
  canvas.style.position = "fixed";
  canvas.style.top = "0px";
  canvas.style.left = "0px";

  await page.render(renderContext).promise;
  Profiler.stop("rendering page");
  console.log("renering PDF page took (ms):", Profiler.getProfiler().performance("rendering page"));

  const image: Image = {
    pixels: canvas,
    id: "",
    serializer: "image",
    type: DrawableTypes.IMAGE,
    geometry: null,
  };

  return image;
}

export class BaseCanvasManager implements CanvasManager {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private layers: StrokeCluster[];
  private buffer: WebGLBuffer;
  private mainProgram: WebGLProgram;
  private imageProgram: WebGLProgram;
  private activeStrokes: Stroke[];
  private strokes: { [id: string]: VectorGraphic };
  private positionBuffer: WebGLBuffer;
  private texcoordBuffer: WebGLBuffer;
  private pdf: Image;

  constructor() {
    this.canvas = document.createElement("canvas");
    document.body.appendChild(this.canvas);

    this.gl = GL.initWebGL(this.canvas);
    this.mainProgram = GL.createProgram(this.gl, MainVertexShaderSource, MainFragmentShaderSource);
    this.imageProgram = GL.createProgram(this.gl, ImageVertexShaderSource, ImageFragmentShaderSource);
    this.layers = [...Array(NUM_LAYERS)].map(_ => new StrokeCluster(this.gl, this.mainProgram));
    this.buffer = this.gl.createBuffer();
    this.activeStrokes = [];
    this.strokes = {};

    // Adjust canvas size
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Create a buffer.
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

    // Put a unit quad in the buffer
    const positions = [0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

    // Create a buffer for texture coords
    this.texcoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texcoordBuffer);

    // Put texcoords in the buffer
    const texcoords = [0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texcoords), this.gl.STATIC_DRAW);

    // Test PDF
    const wloc = window.location.pathname.match(/\/note\/([\w\d_]+)/);
    const docId = (wloc && wloc[1]) || "";
    if (docId == "pdf") {
      LoadPdf().then(pdf => {
        this.pdf = pdf;
        RenderLoop.scheduleRender();
      });
    }
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
    } else if (drawable.type == DrawableTypes.IMAGE) {
      const image = drawable as Image;
      if (!image.texture) {
        image.texture = GL.createImageTextureInfo(this.gl, image.pixels);
      }
      this.renderTexture(image.texture, image.pixels.width, image.pixels.height, 0, 0);
    }
  }

  render(): void {
    this.clearCanvas();
    if (this.pdf) {
      this.addForNextRender(this.pdf);
    }
    this.layers.forEach((layer, ix) => {
      layer.render();
      this.activeStrokes
        .filter(stroke => stroke.zIndex == ix)
        .forEach(stroke => {
          this.renderVector(stroke.vector, stroke.glUniforms);
        });
    });
    this.activeStrokes = [];
  }

  private renderVector(array: number[], uniforms?: any): void {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(array), this.gl.STREAM_DRAW);
    GL.setProgram(this.gl, this.mainProgram, uniforms ?? GetUniforms());
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, array.length / ELEMENTS_PER_VERTEX);
  }

  private renderTexture(tex: WebGLTexture, width: number, height: number, x: number, y: number) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);

    // Tell WebGL to use our shader program pair
    this.gl.useProgram(this.imageProgram);

    // look up where the vertex data needs to go.
    var positionLocation = this.gl.getAttribLocation(this.imageProgram, "a_position");
    var texcoordLocation = this.gl.getAttribLocation(this.imageProgram, "a_texcoord");

    // lookup uniforms
    var matrixLocation = this.gl.getUniformLocation(this.imageProgram, "u_matrix");
    var textureLocation = this.gl.getUniformLocation(this.imageProgram, "u_texture");

    // Setup the attributes to pull data from our buffers
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texcoordBuffer);
    this.gl.enableVertexAttribArray(texcoordLocation);
    this.gl.vertexAttribPointer(texcoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    // this matrix will convert from pixels to clip space
    let matrix = m4.orthographic(0, this.gl.canvas.width, this.gl.canvas.height, 0, -1, 1);

    // this matrix will translate our quad to x, y
    matrix = m4.translate(matrix, x, y, 0);

    // this matrix will scale our 1 unit quad
    // from 1 unit to width, height units
    matrix = m4.scale(matrix, width, height, 1);

    // Set the matrix.
    this.gl.uniformMatrix4fv(matrixLocation, false, matrix);

    // Tell the shader to get the texture from texture unit 0
    this.gl.uniform1i(textureLocation, 0);

    // draw the quad (2 triangles, 6 vertices)
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
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
