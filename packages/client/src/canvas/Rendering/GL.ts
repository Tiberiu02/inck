import { Display } from "../DeviceProps";
import { m4, Matrix4 } from "../Math/M4";
import Profiler from "../Profiler";
import { RGB } from "../types";
import { LAYER_SIZE } from "./BaseStrokeContainer";
import {
  MainFragmentShaderSource,
  MainVertexShaderSource,
  ImageFragmentShaderSource,
  ImageVertexShaderSource,
  LayerVertexShaderSource,
  LayerFragmentShaderSource,
} from "./Shaders";

export const ELEMENTS_PER_VERTEX = 6;
export const HIGHLIGHTER_OPACITY = 0.35;

const FRAMEBUFFER = {
  RENDER: 0,
  TEXTURE: 1,
};

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
  setProgram: (_: WebGLProgram) => void;

  constructor(
    gl: WebGL2RenderingContext,
    createProgram: (vs: string, fs: string) => WebGLProgram,
    setProgram: (_: WebGLProgram) => void
  ) {
    this.ctx = gl;
    this.setProgram = setProgram;

    this.program = createProgram(MainVertexShaderSource, MainFragmentShaderSource);
    this.setProgram(this.program);

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

    this.setProgram(this.program);

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
    this.setProgram(this.program);

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
  private opacityLoc: WebGLUniformLocation;
  private textureLoc: WebGLUniformLocation;
  private positionLoc: number;
  private setProgram: (_: WebGLProgram) => void;

  constructor(
    ctx: WebGL2RenderingContext,
    createProgram: (vs: string, fs: string) => WebGLProgram,
    setProgram: (_: WebGLProgram) => void
  ) {
    this.ctx = ctx;
    this.setProgram = setProgram;

    // Create a buffer.
    this.buffer = this.ctx.createBuffer();
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.buffer);

    // Put a unit quad in the buffer
    const positions = [0, 0, 0, +1, +1, 0, +1, +1];
    this.ctx.bufferData(this.ctx.ARRAY_BUFFER, new Float32Array(positions), this.ctx.STATIC_DRAW);

    this.program = createProgram(LayerVertexShaderSource, LayerFragmentShaderSource);

    this.setProgram(this.program);

    this.opacityLoc = this.ctx.getUniformLocation(this.program, "u_Opacity");
    this.textureLoc = this.ctx.getUniformLocation(this.program, "u_Texture");
    this.positionLoc = this.ctx.getAttribLocation(this.program, "a_Position");
  }

  renderLayer(tex: WebGLTexture, opacity: number = 1) {
    this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.buffer);

    this.setProgram(this.program);

    // Set position attribute
    this.ctx.vertexAttribPointer(this.positionLoc, 2, this.ctx.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    this.ctx.enableVertexAttribArray(this.positionLoc);

    // Set opacity
    this.ctx.uniform1f(this.opacityLoc, opacity);

    // Tell the shader to get the texture from texture unit 0
    this.ctx.uniform1i(this.textureLoc, 0);
    this.ctx.bindTexture(this.ctx.TEXTURE_2D, tex);

    // draw the quad (2 triangles, 4 vertices)
    this.ctx.drawArrays(this.ctx.TRIANGLE_STRIP, 0, 4);
  }
}

function createGL(container?: HTMLElement, scale: number = 1) {
  console.log("Creating GL");
  if (typeof window === "undefined") return null;

  let currentProgram: WebGLProgram;

  let texBuffer: WebGLBuffer;

  let layerTex: WebGLTexture;
  let layerFb: WebGLFramebuffer;
  let width: number;
  let height: number;

  let fb: WebGLFramebuffer[];
  let rb: WebGLRenderbuffer;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0px";
  canvas.style.left = "0px";
  canvas.style.pointerEvents = "none";
  (container || document.body).appendChild(canvas);

  // Init context
  let gl = canvas.getContext("webgl2", {
    alpha: true,
    // antialias: true,
  });

  if (!gl) {
    console.warn("WebGL not supported, falling back on experimental");
    gl = canvas.getContext("experimental-webgl") as WebGL2RenderingContext;
  }

  if (!gl) alert("Your browser does not support WebGL");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.blendEquation(gl.FUNC_ADD);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.ALWAYS);

  function setProgram(program: WebGLProgram) {
    if (currentProgram != program) {
      currentProgram = program;
      gl.useProgram(this.program);
    }
  }

  // Create programs
  const imageProgram = createProgram(ImageVertexShaderSource, ImageFragmentShaderSource);
  const vectorProgram = new VectorProgram(gl, createProgram, setProgram);
  const layerProgram = new TransparentLayerProgram(gl, createProgram, setProgram);

  // Init buffers
  initTexBuffers();

  ensureCanvasSize();
  window.addEventListener("resize", ensureCanvasSize);

  function initLayerFb() {
    if (layerTex) {
      gl.deleteTexture(layerTex);
      gl.deleteFramebuffer(layerFb);
      gl.deleteFramebuffer(fb[0]);
      gl.deleteFramebuffer(fb[1]);
      gl.deleteRenderbuffer(rb);
    }

    // Create 2 frame buffers
    fb = [gl.createFramebuffer(), gl.createFramebuffer()];
    // Create render buffer
    rb = gl.createRenderbuffer();

    // Bind render buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);

    console.log("gl.MAX_SAMPLES", gl.getParameter(gl.MAX_SAMPLES));

    // Enable MSAA
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, gl.getParameter(gl.MAX_SAMPLES), gl.RGBA8, width, height);

    // Bind render frame buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb[FRAMEBUFFER.RENDER]);

    // Attach render frame buffer to render buffer
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);

    // Create texture
    layerTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, layerTex);
    {
      // define size and format of level 0
      const level = 0;
      const internalFormat = gl.RGBA;
      const border = 0;
      const format = gl.RGBA;
      const type = gl.UNSIGNED_BYTE;
      const data = null;
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, format, type, data);

      // set the filtering so we don't need mips
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // Bind texture frame buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb[FRAMEBUFFER.TEXTURE]);

    // Bind texture to texture frame buffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, layerTex, 0);

    // Unbind frame buffers
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function ensureCanvasSize() {
    const width = Math.round(Display.Width * Display.DevicePixelRatio * scale);
    const height = Math.round(Display.Height * Display.DevicePixelRatio * scale);

    if (canvas.width != width || canvas.height != height) {
      canvas.style.width = Display.Width * scale + "px";
      canvas.style.height = Display.Height * scale + "px";
      canvas.width = width;
      canvas.height = height;
      viewport(0, 0, width, height);
    }
  }

  function initTexBuffers() {
    // Create a buffer.
    texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);

    // Put a unit quad in the buffer
    const positions = [0, 0, 0, 1, 1, 0, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  }

  function beginLayer() {
    // render to our targetTexture by binding the framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb[FRAMEBUFFER.RENDER]);

    // Clear the attachment(s).
    gl.clearColor(0, 0, 0, 0); // clear to transparent
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  function finishLayer(outputTexture: WebGLTexture) {
    // https://stackoverflow.com/questions/47934444/webgl-framebuffer-multisampling

    // "blit" the cube into the color buffer, which adds antialiasing
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb[FRAMEBUFFER.RENDER]);

    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb[FRAMEBUFFER.TEXTURE]);

    // Bind texture to texture frame buffer
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture || layerTex, 0);

    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.LINEAR);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (!outputTexture) {
      layerProgram.renderLayer(layerTex);
    }
  }

  function createProgram(vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram {
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

  // creates a texture info { width: w, height: h, texture: tex }
  // The texture will start with 1x1 pixels and be updated
  // when the image has loaded
  function createTexture(img: HTMLCanvasElement | HTMLImageElement): WebGLTexture {
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

  function renderVector(array: number[], transformMatrix: Matrix4, buffer?: WebGLBuffer): void {
    vectorProgram.drawVector(array, transformMatrix, buffer);
  }

  function renderTexture(tex: WebGLTexture, width: number, height: number, x: number, y: number, opacity: number = 1) {
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    const array = [0, 0, 0, 1, 1, 0, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STREAM_DRAW);

    // Set program
    gl.useProgram(imageProgram);
    currentProgram = imageProgram;

    // Set position attribute
    const positionLocation = gl.getAttribLocation(imageProgram, "a_Position");
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(positionLocation);

    // Set matrix uniform
    const matrixLocation = gl.getUniformLocation(imageProgram, "u_Matrix");
    {
      // this matrix will convert from pixels to clip space
      let matrix = m4.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);

      // this matrix will translate our quad to x, y
      m4.translate(matrix, x, y, 0, matrix);

      // this matrix will scale our 1 unit quad
      // from 1 unit to width, height units
      m4.scale(matrix, width, height, 1, matrix);

      // Set the matrix.
      gl.uniformMatrix4fv(matrixLocation, false, matrix);
    }

    // Tell the shader to get the texture from texture unit 0
    const textureLocation = gl.getUniformLocation(imageProgram, "u_Texture");
    gl.uniform1i(textureLocation, 0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Set texture opacity
    const alphaLocation = gl.getUniformLocation(imageProgram, "u_Alpha");
    gl.uniform1f(alphaLocation, opacity);

    // draw the quad (2 triangles, 4 vertices)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function clear(color: RGB = [1, 1, 1]) {
    gl.clearColor(...color, 1);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  function viewport(x: number, y: number, w: number, h: number) {
    gl.viewport(x, y, w, h);
    width = w;
    height = h;

    initLayerFb();
  }

  return {
    beginLayer,
    finishLayer,
    clear,
    createProgram,
    createTexture,
    renderVector,
    renderTexture,
    vectorProgram,
    layerProgram,
    set transform(val: string) {
      canvas.style.transform = val;
    },
    get ctx() {
      return gl;
    },
    get currentProgram() {
      return currentProgram;
    },
    set currentProgram(program) {
      currentProgram = program;
    },
  };
}

export let Layers = {
  background: null as GL,
  highlighter: {
    static: null as GL,
    dynamic: null as GL,
  },
  pen: {
    static: null as GL,
    dynamic: null as GL,
  },
};

if (typeof window !== "undefined") {
  Layers.background = createGL();

  const highlighterLayer = document.createElement("div");
  document.body.appendChild(highlighterLayer);
  highlighterLayer.style.opacity = `${HIGHLIGHTER_OPACITY * 100}%`;
  console.log(highlighterLayer);
  console.log(highlighterLayer.style.opacity, "-->", `${HIGHLIGHTER_OPACITY * 100}%`, HIGHLIGHTER_OPACITY);

  Layers.highlighter = {
    static: createGL(highlighterLayer, LAYER_SIZE),
    dynamic: createGL(highlighterLayer),
  };

  Layers.pen = {
    static: createGL(null, LAYER_SIZE),
    dynamic: createGL(),
  };
}

export type GL = ReturnType<typeof createGL>;
