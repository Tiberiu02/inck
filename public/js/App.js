import { StrokeToPath } from './Physics.js'
import Profiler from './Profiler.js'
import { GL, ELEMENTS_PER_VERTEX } from './GL.js'
import { ViewManager } from './Gestures.js'

export default class App {

  constructor() {
    this.init()
  }

  async init() {
    // Create canvas
    this.canvas = document.createElement('canvas')
    document.body.appendChild(this.canvas)

    // Create WebGL
    this.gl = GL.initWebGL(this.canvas)
    this.program = await GL.createProgram(this.gl, '/gl/vertex.glsl', '/gl/fragment.glsl')
    this.gl.useProgram(this.program)

    // Create view
    this.view = new ViewManager(this)
    this.view.disableWindowOverscrolling()

    // Create buffers
    this.activeBuffers = GL.createBuffers(this.gl)
    this.staticBuffers = GL.createBuffers(this.gl)
    this.staticArrays = { vertex: [], index: [] }

    // Adjust canvas size
    this.resizeCanvas()

    // Add event listeners
    window.addEventListener('pointerdown', e => this.handlePointerEvent(e))
    window.addEventListener('pointermove', e => this.handlePointerEvent(e))
    window.addEventListener('pointerup', e => this.handlePointerEvent(e))
    window.addEventListener('wheel', e => this.view.handleWheelEvent(e))
    window.addEventListener('touchstart', e => this.view.handleTouchEvent(e));
    window.addEventListener('touchend', e => this.view.handleTouchEvent(e));
    window.addEventListener('touchcancel', e => this.view.handleTouchEvent(e));
    window.addEventListener('touchmove', e => this.view.handleTouchEvent(e));

    // Start rendering loop
    requestAnimationFrame(() => this.renderLoop())
  }

  scheduleRender() {
    this.rerender = true
  }

  renderLoop() {

    const correctSize = (this.canvas.width == window.innerWidth * devicePixelRatio && this.canvas.height == window.innerHeight * devicePixelRatio)

    if (!correctSize && !this.skipResizeFrames) {
      console.log('detected resize')
      this.canvas.width = window.innerWidth * devicePixelRatio
      this.canvas.height = window.innerHeight * devicePixelRatio
      this.canvas.style.width = window.innerWidth
      this.canvas.style.height = window.innerHeight
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
      this.rerender = true
    }

    if (this.skipResizeFrames > 0)
      this.skipResizeFrames--

    if (this.rerender) {
      delete this.rerender
      this.render()
      // For some reason, drawing and resizing very fast causes black screen.
      // Skipping resize for a few frames.
      this.skipResizeFrames = 2 
    }

    requestAnimationFrame(() => this.renderLoop())
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth * window.devicePixelRatio
    this.canvas.height = window.innerHeight * window.devicePixelRatio
    this.canvas.style.width = window.innerWidth
    this.canvas.style.height = window.innerHeight
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)

    this.scheduleRender()
  }

  handlePointerEvent(e) {
    if (e.pointerType == 'touch') {
      return
    }

    e.preventDefault()

    let { x, y, pressure, timeStamp } = e
    
    if (!pressure && !this.stroke)
      return
    
    [x, y] = this.view.mapCoords(x, y)

    if (pressure) {
      if (!this.stroke) {
        this.stroke = []
        this.strokeStartTime = timeStamp
      }
      
      this.stroke.push(x, y, pressure, timeStamp - this.strokeStartTime)
    } else {
      let [vertex, index] = StrokeToPath(this.stroke)

      this.staticArrays.index.push(...index.map(i => i + this.staticArrays.vertex.length / ELEMENTS_PER_VERTEX))
      this.staticArrays.vertex.push(...vertex)
      
      GL.bindBuffers(this.gl, this.staticBuffers)
      GL.bufferArrays(this.gl, this.staticArrays, 'DYNAMIC_DRAW')

      this.stroke = undefined;
    }

    this.render()
  }

  render() {    
    Profiler.start('rendering')
    
    this.clearCanvas()
    this.drawActiveStroke()
    this.drawOldStrokes()

    Profiler.stop('rendering')
  }

  clearCanvas() {
    this.gl.clearColor(1, 1, 1, 1)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
  }

  drawActiveStroke() {
    if (!this.stroke)
      return
    
    let [vertex, index] = StrokeToPath(this.stroke)
    
    GL.bindBuffers(this.gl, this.activeBuffers)
    GL.bufferArrays(this.gl, { vertex, index }, 'STREAM_DRAW')
    GL.setVars(this.gl, this.program, this.view.getVars())
    
    this.gl.drawElements(this.gl.TRIANGLES, index.length, this.gl.UNSIGNED_SHORT, 0)
  }

  drawOldStrokes() {
    GL.bindBuffers(this.gl, this.staticBuffers)
    GL.setVars(this.gl, this.program, this.view.getVars())
    
    this.gl.drawElements(this.gl.TRIANGLES, this.staticArrays.index.length, this.gl.UNSIGNED_SHORT, 0)
  }

}