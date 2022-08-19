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
  static initWebGL(canvas) {
    // add back
    let gl = canvas.getContext("webgl", { desynchronized: true, alpha: false });

    if (!gl) {
      console.warn("WebGL not supported, falling back on experimental");
      gl = canvas.getContext("experimental-webgl");
    }

    if (!gl) alert("Your browser does not support WebGL");

    return gl;
  }

  static createProgram(
    gl: WebGL2RenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string
  ): WebGLProgram {
    // Create Shaders
    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

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

  static createBuffers(gl) {
    return {
      vertex: gl.createBuffer(),
      index: gl.createBuffer(),
    };
  }

  static bindBuffers(gl, { vertex, index }) {
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
    //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  }

  static bufferArrays(gl, { vertex, index }, drawType = "STREAM_DRAW") {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex), gl[drawType]);
    //gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl[drawType]);
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

  static setUniform1f(gl, program, name, val) {
    let location = gl.getUniformLocation(program, name);
    gl.uniform1f(location, val);
  }

  static setProgram(gl: WebGL2RenderingContext, program: WebGLProgram, uniforms: object) {
    gl.useProgram(program);

    GL.setAttribute(gl, program, "a_Position", 2, 0);
    GL.setAttribute(gl, program, "a_Color", 4, 2);

    for (let name in uniforms) {
      GL.setUniform1f(gl, program, name, uniforms[name]);
    }
  }

  // creates a texture info { width: w, height: h, texture: tex }
  // The texture will start with 1x1 pixels and be updated
  // when the image has loaded
  static createImageTextureInfo(gl: WebGL2RenderingContext, img: HTMLCanvasElement | HTMLImageElement) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // let's assume all images are not a power of 2
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    return texture;
  }
}
