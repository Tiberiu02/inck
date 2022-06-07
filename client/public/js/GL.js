export const ELEMENTS_PER_VERTEX = 6

export function desynchronizedHintAvailable() {
  const userAgent = window.navigator.userAgent
  const chrome = userAgent.includes('Chrome')
  if (!chrome)
    return false

  const android = userAgent.includes('Android')
  const version = parseInt(window.navigator.userAgent.match(/Chrome\/(\d+)/)[1])
  return (version >= 85 || android && version >= 75)
}

export class GL {

  static initWebGL(canvas) { // add back
    let gl = canvas.getContext('webgl', {desynchronized: true, alpha: false})

    if (!gl) {
      console.warn('WebGL not supported, falling back on experimental')
      gl = canvas.getContext('experimental-webgl')
    }
    
    if (!gl)
      alert('Your browser does not support WebGL')

    //gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    //gl.enable(gl.BLEND);
    //gl.disable(gl.DEPTH_TEST);
    
    return gl
  }

  static async createProgram(gl, vertexShaderURL, fragmentShaderURL) {
    // Create Shaders
    const VertexShaderSource = await (await fetch(vertexShaderURL)).text()
    const FragmentShaderSource = await (await fetch(fragmentShaderURL)).text()

    let vertexShader = gl.createShader(gl.VERTEX_SHADER)
    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    
    gl.shaderSource(vertexShader, VertexShaderSource)
    gl.shaderSource(fragmentShader, FragmentShaderSource)

    gl.compileShader(vertexShader)
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Failed to compile vertex shader')
      throw new Error(gl.getShaderInfoLog(vertexShader))
    }

    gl.compileShader(fragmentShader)
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Failed to compile fragment shader')
      throw new Error(gl.getShaderInfoLog(fragmentShader))
    }

    // Create Program
    let program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Failed to link program')
      throw new Error(gl.getProgramInfoLog(program))
    }
    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
      console.error('Failed to validate program')
      throw new Error(gl.getProgramInfoLog(program))
    }

    return program;
  }

  static createBuffers(gl) {
    return {
      vertex: gl.createBuffer(),
      index: gl.createBuffer(),
    }
  }

  static bindBuffers(gl, { vertex, index }) {    
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index)
  }

  static bufferArrays(gl, { vertex, index }, drawType = 'STREAM_DRAW') {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex), gl[drawType])
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl[drawType])
  }

  static setAttribute(gl, program, name, size, offset) {
    let location = gl.getAttribLocation(program, name)
    gl.vertexAttribPointer(
      location, // Attribute location
      size, // Number of elements per attribute
      gl.FLOAT, // Type of elements
      gl.FLOAT_32_UNSIGNED_INT_24_8_REV,
      ELEMENTS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
      offset * Float32Array.BYTES_PER_ELEMENT // Offset
    )
    gl.enableVertexAttribArray(location)
  }

  static setUniform1f(gl, program, name, val) {
    let location = gl.getUniformLocation(program, name);
    gl.uniform1f(location, val); 
  }

  static setVars(gl, program, uniforms) {
    GL.setAttribute(gl, program, 'a_Position', 2, 0)
    GL.setAttribute(gl, program, 'a_Color', 4, 2)

    for (let name in uniforms)
      GL.setUniform1f(gl, program, name, uniforms[name])
  }

  static appendArray({ vertex, index }, vertexNew, indexNew) {
    index.push(...indexNew.map(i => i + vertex.length / ELEMENTS_PER_VERTEX))
    vertex.push(...vertexNew)
  }

}