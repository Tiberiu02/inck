import { Display } from "../DeviceProps";
import { m4, Matrix4 } from "../Math/M4";
import Profiler from "../Profiler";
import {
  MainFragmentShaderSource,
  MainVertexShaderSource,
  ImageFragmentShaderSource,
  ImageVertexShaderSource,
  LayerVertexShaderSource,
  LayerFragmentShaderSource,
} from "./Shaders";

export const ELEMENTS_PER_VERTEX = 6;

export function desynchronizedHintAvailable() {
  const userAgent = window.navigator.userAgent;
  const chrome = userAgent.includes("Chrome");
  if (!chrome) return false;

  const android = userAgent.includes("Android");
  const version = parseInt(window.navigator.userAgent.match(/Chrome\/(\d+)/)[1]);
  return version >= 85 || (android && version >= 75);
}

class VectorProgram {
  ctx: WebGL2RenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  matrixLoc: WebGLUniformLocation;
  positionLoc: number;
  colorLoc: number;

  constructor(gl: WebGL2RenderingContext) {
    this.ctx = gl;

    this.program = GL.createProgram(MainVertexShaderSource, MainFragmentShaderSource);
    this.ctx.useProgram(this.program);
    GL.currentProgram = this.program;

    this.buffer = this.ctx.createBuffer();
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.buffer);

    const stride = ELEMENTS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;

    // Position attribute
    this.positionLoc = this.ctx.getAttribLocation(this.program, "a_Position");
    this.ctx.enableVertexAttribArray(this.positionLoc);
    this.ctx.vertexAttribPointer(this.positionLoc, 2, this.ctx.FLOAT, false, stride, 0);

    // Color attribute
    this.colorLoc = this.ctx.getAttribLocation(this.program, "a_Color");
    this.ctx.enableVertexAttribArray(this.colorLoc);
    this.ctx.vertexAttribPointer(this.colorLoc, 4, this.ctx.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

    // Matrix uniform
    this.matrixLoc = this.ctx.getUniformLocation(this.program, "u_Matrix");
  }

  createBuffer() {
    const buffer = this.ctx.createBuffer();
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, buffer);

    this.ctx.useProgram(this.program);
    GL.currentProgram = this.program;

    const stride = ELEMENTS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;

    // Position attribute
    this.ctx.enableVertexAttribArray(this.positionLoc);
    this.ctx.vertexAttribPointer(this.positionLoc, 2, this.ctx.FLOAT, false, stride, 0);

    // Color attribute
    this.ctx.enableVertexAttribArray(this.colorLoc);
    this.ctx.vertexAttribPointer(this.colorLoc, 4, this.ctx.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

    return buffer;
  }

  drawVector(array: number[], transformMatrix: Matrix4, buffer?: WebGLBuffer) {
    if (GL.currentProgram != this.program) {
      this.ctx.useProgram(this.program);
      GL.currentProgram = this.program;
    }

    if (!buffer) {
      this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.buffer);
      this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(array), this.ctx.STREAM_DRAW);
    }

    // Set attributes & uniforms
    const stride = ELEMENTS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
    this.ctx.vertexAttribPointer(this.positionLoc, 2, this.ctx.FLOAT, false, stride, 0);
    this.ctx.vertexAttribPointer(this.colorLoc, 4, this.ctx.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    this.ctx.uniformMatrix4fv(this.matrixLoc, false, transformMatrix);

    this.ctx.drawArrays(this.ctx.TRIANGLE_STRIP, 0, array.length / ELEMENTS_PER_VERTEX);
  }
}

class TransparentLayerProgram {
  private ctx: WebGL2RenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private textureLoc: WebGLUniformLocation;
  private positionLoc: number;

  constructor(ctx: WebGL2RenderingContext, opacity = 0.3) {
    this.ctx = ctx;

    // Create a buffer.
    this.buffer = this.ctx.createBuffer();
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.buffer);

    // Put a unit quad in the buffer
    const positions = [0, 0, 0, +1, +1, 0, +1, +1];
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(positions), this.ctx.STATIC_DRAW);

    this.program = GL.createProgram(LayerVertexShaderSource, LayerFragmentShaderSource.replaceAll("$OPACITY", opacity));

    this.ctx.useProgram(this.program);
    GL.currentProgram = this.program;

    this.textureLoc = this.ctx.getUniformLocation(this.program, "u_Texture");
    this.positionLoc = this.ctx.getAttribLocation(this.program, "a_Position");
  }

  renderLayer(tex: WebGLTexture) {
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.buffer);

    // Set program
    this.ctx.useProgram(this.program);
    GL.currentProgram = this.program;

    // Set position attribute
    this.ctx.vertexAttribPointer(this.positionLoc, 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    this.ctx.enableVertexAttribArray(this.positionLoc);

    // Tell the shader to get the texture from texture unit 0
    this.ctx.uniform1i(this.textureLoc, 0);
    this.ctx.bindTexture(this.ctx.TEXTURE_2D, tex);

    // draw the quad (2 triangles, 4 vertices)
    this.ctx.drawArrays(this.ctx.TRIANGLE_STRIP, 0, 4);
  }
}

export class GL {
  static ctx: WebGL2RenderingContext;
  static currentProgram: WebGLProgram;

  static mainProgram: WebGLProgram;
  static imageProgram: WebGLProgram;
  static vectorProgram: VectorProgram;
  static layerProgram: TransparentLayerProgram;

  private static texBuffer: WebGLBuffer;

  private static layerTex: WebGLTexture;
  private static layerFb: WebGLFramebuffer;
  private static width: number;
  private static height: number;

  static init() {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);

    // Init context
    this.ctx = canvas.getContext("webgl2", { desynchronized: true, alpha: false, antialias: true });

    if (!this.ctx) {
      console.warn("WebGL not supported, falling back on experimental");
      this.ctx = canvas.getContext("experimental-webgl") as WebGL2RenderingContext;
    }

    if (!this.ctx) alert("Your browser does not support WebGL");

    this.ctx.enable(this.ctx.BLEND);
    this.ctx.blendFunc(this.ctx.SRC_ALPHA, this.ctx.ONE_MINUS_SRC_ALPHA);
    this.ctx.blendEquation(this.ctx.FUNC_ADD);

    this.ctx.enable(this.ctx.DEPTH_TEST);
    this.ctx.depthFunc(this.ctx.ALWAYS);

    // Create programs
    this.imageProgram = this.createProgram(ImageVertexShaderSource, ImageFragmentShaderSource);
    this.vectorProgram = new VectorProgram(this.ctx);
    this.layerProgram = new TransparentLayerProgram(this.ctx);

    // Init buffers
    this.initTexBuffers();
  }

  public static ensureCanvasSize() {
    const width = Math.round(Display.Width * Display.DevicePixelRatio);
    const height = Math.round(Display.Height * Display.DevicePixelRatio);

    if (this.ctx.canvas.width != width || this.ctx.canvas.height != height) {
      this.ctx.canvas.style.width = Display.Width + "px";
      this.ctx.canvas.style.height = Display.Height + "px";
      this.ctx.canvas.width = width;
      this.ctx.canvas.height = height;
      GL.viewport(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
  }

  private static initTexBuffers() {
    // Create a buffer.
    this.texBuffer = this.ctx.createBuffer();
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.texBuffer);

    // Put a unit quad in the buffer
    const positions = [0, 0, 0, 1, 1, 0, 1, 1];
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(positions), this.ctx.STATIC_DRAW);
  }

  private static initLayerTex(width: number, height: number) {
    this.width = width;
    this.height = height;

    if (this.layerTex) {
      this.ctx.deleteTexture(this.layerTex);
      this.ctx.deleteFramebuffer(this.layerFb);
    }

    // create to render to
    this.layerTex = this.ctx.createTexture();
    this.ctx.bindTexture(this.ctx.TEXTURE_2D, this.layerTex);

    {
      // define size and format of level 0
      const level = 0;
      const internalFormat = this.ctx.RGBA;
      const border = 0;
      const format = this.ctx.RGBA;
      const type = this.ctx.UNSIGNED_BYTE;
      const data = null;
      this.ctx.texImage2D(this.ctx.TEXTURE_2D, level, internalFormat, width, height, border, format, type, data);

      // set the filtering so we don't need mips
      this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MIN_FILTER, this.ctx.LINEAR);
      this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_S, this.ctx.CLAMP_TO_EDGE);
      this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_T, this.ctx.CLAMP_TO_EDGE);
    }

    // Create and bind the framebuffer
    this.layerFb = this.ctx.createFramebuffer();
    this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, this.layerFb);

    // attach the texture as the first color attachment
    {
      const attachmentPoint = this.ctx.COLOR_ATTACHMENT0;
      const level = 0;
      this.ctx.framebufferTexture2D(this.ctx.FRAMEBUFFER, attachmentPoint, this.ctx.TEXTURE_2D, this.layerTex, level);
    }

    this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, null);
  }

  static beginLayer() {
    // render to our targetTexture by binding the framebuffer
    this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, this.layerFb);

    // Clear the attachment(s).
    this.ctx.clearColor(0, 0, 0, 0); // clear to transparent
    this.ctx.clear(this.ctx.COLOR_BUFFER_BIT);
  }

  static finishLayer(opacity: number = 1) {
    // WebGL 1 does not support framebuffer multi-sampling,
    // thus highlighter strokes will not me anti-aliased
    // see: https://stackoverflow.com/questions/47934444/webgl-framebuffer-multisampling

    // render to the canvas
    this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, null);

    this.layerProgram.renderLayer(this.layerTex);
  }

  static createProgram(vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram {
    const gl = this.ctx;

    // Create Shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.shaderSource(fragmentShader, fragmentShaderSource);

    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error("Failed to compile vertex shader");
      throw new Error(gl.getShaderInfoLog(vertexShader));
    }

    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error("Failed to compile fragment shader");
      throw new Error(gl.getShaderInfoLog(fragmentShader));
    }

    // Create Program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Failed to link program");
      throw new Error(gl.getProgramInfoLog(program));
    }
    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
      console.error("Failed to validate program");
      throw new Error(gl.getProgramInfoLog(program));
    }

    return program;
  }

  static setAttribute(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, size: number, offset: number) {
    let location = gl.getAttribLocation(program, name);
    gl.vertexAttribPointer(
      location, // Attribute location
      size, // Number of elements per attribute
      gl.FLOAT, // Type of elements
      false,
      ELEMENTS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
      offset * Float32Array.BYTES_PER_ELEMENT // Offset
    );
    gl.enableVertexAttribArray(location);
  }

  static setUniform1f(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, val: number) {
    let location = gl.getUniformLocation(program, name);
    gl.uniform1f(location, val);
  }

  static setUniformMatrix4fv(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, val: Matrix4) {
    let location = gl.getUniformLocation(program, name);
    gl.uniformMatrix4fv(location, false, val);
  }

  // creates a texture info { width: w, height: h, texture: tex }
  // The texture will start with 1x1 pixels and be updated
  // when the image has loaded
  static createTexture(img: HTMLCanvasElement | HTMLImageElement): WebGLTexture {
    const gl = this.ctx;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // let's assume all images are not a power of 2
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    return texture;
  }

  static renderVector(array: number[], transformMatrix: Matrix4, buffer?: WebGLBuffer): void {
    this.vectorProgram.drawVector(array, transformMatrix, buffer);
  }

  static renderTexture(tex: WebGLTexture, width: number, height: number, x: number, y: number, opacity: number = 1) {
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.texBuffer);
    const array = [0, 0, 0, 1, 1, 0, 1, 1];
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(array), this.ctx.STREAM_DRAW);

    // Set program
    this.ctx.useProgram(this.imageProgram);
    GL.currentProgram = this.imageProgram;

    // Set position attribute
    const positionLocation = this.ctx.getAttribLocation(this.imageProgram, "a_Position");
    this.ctx.vertexAttribPointer(positionLocation, 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    this.ctx.enableVertexAttribArray(positionLocation);

    // Set matrix uniform
    const matrixLocation = this.ctx.getUniformLocation(this.imageProgram, "u_Matrix");
    {
      // this matrix will convert from pixels to clip space
      let matrix = m4.orthographic(0, this.ctx.canvas.width, this.ctx.canvas.height, 0, -1, 1);

      // this matrix will translate our quad to x, y
      m4.translate(matrix, x, y, 0, matrix);

      // this matrix will scale our 1 unit quad
      // from 1 unit to width, height units
      m4.scale(matrix, width, height, 1, matrix);

      // Set the matrix.
      this.ctx.uniformMatrix4fv(matrixLocation, false, matrix);
    }

    // Tell the shader to get the texture from texture unit 0
    const textureLocation = this.ctx.getUniformLocation(this.imageProgram, "u_Texture");
    this.ctx.uniform1i(textureLocation, 0);
    this.ctx.bindTexture(this.ctx.TEXTURE_2D, tex);

    // Set texture opacity
    const alphaLocation = this.ctx.getUniformLocation(this.imageProgram, "u_Alpha");
    this.ctx.uniform1f(alphaLocation, opacity);

    // draw the quad (2 triangles, 4 vertices)
    this.ctx.drawArrays(this.ctx.TRIANGLE_STRIP, 0, 4);
  }

  static clear() {
    this.ctx.clearColor(1, 1, 1, 1);
    this.ctx.clear(this.ctx.COLOR_BUFFER_BIT);
  }

  static viewport(x: number, y: number, width: number, height: number) {
    this.ctx.viewport(x, y, width, height);
    this.initLayerTex(width, height);
  }
}
