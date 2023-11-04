import { m4, Matrix4 } from "../Math/M4";
import {
  MainFragmentShaderSource,
  MainVertexShaderSource,
  ImageFragmentShaderSource,
  ImageVertexShaderSource,
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

export class GL {
  static ctx: WebGLRenderingContext;

  static mainProgram: WebGLProgram;
  static imageProgram: WebGLProgram;

  private static mainBuffer: WebGLBuffer;
  private static texBuffer: WebGLBuffer;

  private static layerTex: WebGLTexture;
  private static layerFb: WebGLFramebuffer;
  private static width: number;
  private static height: number;

  static init() {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);

    // Init context
    this.ctx = canvas.getContext("webgl", { desynchronized: true, alpha: false });

    if (!this.ctx) {
      console.warn("WebGL not supported, falling back on experimental");
      this.ctx = canvas.getContext("experimental-webgl") as WebGLRenderingContext;
    }

    if (!this.ctx) alert("Your browser does not support WebGL");

    this.ctx.enable(this.ctx.BLEND);
    this.ctx.blendFunc(this.ctx.SRC_ALPHA, this.ctx.ONE_MINUS_SRC_ALPHA);
    this.ctx.blendEquation(this.ctx.FUNC_ADD);

    this.ctx.enable(this.ctx.DEPTH_TEST);
    this.ctx.depthFunc(this.ctx.ALWAYS);

    // Create programs
    this.mainProgram = this.createProgram(MainVertexShaderSource, MainFragmentShaderSource);
    this.imageProgram = this.createProgram(ImageVertexShaderSource, ImageFragmentShaderSource);

    // Init buffers
    this.mainBuffer = this.ctx.createBuffer();
    this.initTexBuffers();
  }

  public static ensureCanvasSize() {
    const width = Math.round(document.documentElement.clientWidth * window.devicePixelRatio);
    const height = Math.round(document.documentElement.clientHeight * window.devicePixelRatio);

    const canvas = this.ctx.canvas as HTMLCanvasElement;
    if (canvas.width != width || canvas.height != height) {
      canvas.style.width = document.documentElement.clientWidth + "px";
      canvas.style.height = document.documentElement.clientHeight + "px";
      canvas.width = Math.round(document.documentElement.clientWidth * window.devicePixelRatio);
      canvas.height = Math.round(document.documentElement.clientHeight * window.devicePixelRatio);
      GL.viewport(0, 0, canvas.width, canvas.height);
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
    //this.ctx.disable(this.ctx.DEPTH_TEST);

    // Clear the attachment(s).
    this.ctx.clearColor(0, 0, 0, 0); // clear to transparent
    this.ctx.clear(this.ctx.COLOR_BUFFER_BIT);
  }

  static finishLayer(opacity: number = 1) {
    // render to the canvas
    this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, null);
    //this.ctx.disable(this.ctx.DEPTH_TEST);

    this.renderTexture(this.layerTex, this.width, -this.height, 0, this.height, opacity);
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

  static setAttribute(gl: WebGLRenderingContext, program: WebGLProgram, name: string, size: number, offset: number) {
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

  static setUniform1f(gl: WebGLRenderingContext, program: WebGLProgram, name: string, val: number) {
    let location = gl.getUniformLocation(program, name);
    gl.uniform1f(location, val);
  }

  static setUniformMatrix4fv(gl: WebGLRenderingContext, program: WebGLProgram, name: string, val: Matrix4) {
    let location = gl.getUniformLocation(program, name);
    gl.uniformMatrix4fv(location, false, val);
  }

  static setProgram(program: WebGLProgram, uniforms: object) {
    this.ctx.useProgram(program);

    GL.setAttribute(this.ctx, program, "a_Position", 2, 0);
    GL.setAttribute(this.ctx, program, "a_Color", 4, 2);

    for (let name in uniforms) {
      const u = uniforms[name];
      if (typeof u == "number") {
        GL.setUniform1f(this.ctx, program, name, u);
      } else if (u.length == 16) {
        GL.setUniformMatrix4fv(this.ctx, program, name, u);
      } else {
        throw new Error(`Unknown uniform: ${u}`);
      }
    }
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
    if (!buffer) {
      this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.mainBuffer);
      this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(array), this.ctx.STREAM_DRAW);
    } else {
      this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, buffer);
    }

    this.ctx.useProgram(this.mainProgram);

    const stride = ELEMENTS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;

    // Set position attribute
    const positionLocation = this.ctx.getAttribLocation(this.mainProgram, "a_Position");
    this.ctx.vertexAttribPointer(positionLocation, 2, this.ctx.FLOAT, false, stride, 0);
    this.ctx.enableVertexAttribArray(positionLocation);

    // Set color attribute
    const colorLocation = this.ctx.getAttribLocation(this.mainProgram, "a_Color");
    this.ctx.vertexAttribPointer(colorLocation, 4, this.ctx.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    this.ctx.enableVertexAttribArray(colorLocation);

    // Set matrix uniform
    const matrixLocation = this.ctx.getUniformLocation(this.mainProgram, "u_Matrix");
    this.ctx.uniformMatrix4fv(matrixLocation, false, transformMatrix);

    this.ctx.drawArrays(this.ctx.TRIANGLE_STRIP, 0, array.length / ELEMENTS_PER_VERTEX);
  }

  static renderTexture(tex: WebGLTexture, width: number, height: number, x: number, y: number, opacity: number = 1) {
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.texBuffer);
    const array = [0, 0, 0, 1, 1, 0, 1, 1];
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(array), this.ctx.STREAM_DRAW);

    // Set program
    this.ctx.useProgram(this.imageProgram);

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
      matrix = m4.translate(matrix, x, y, 0);

      // this matrix will scale our 1 unit quad
      // from 1 unit to width, height units
      matrix = m4.scale(matrix, width, height, 1);

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
