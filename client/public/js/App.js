import Profiler from './Profiler.js'
import { GL, ELEMENTS_PER_VERTEX } from './GL.js'
import { ViewManager } from './Gestures.js'
import Connector from './Connector.js'
import { ShowCircularWave, ScrollBars } from './UI.js'
import Buffers from './Buffers.js'
import ToolWheel from '/js/ToolWheel.js'

export default class App {

  constructor() {
    this.init()
  }

  async init() {
    // Create canvas
    this.canvas = document.createElement('canvas')
    document.body.appendChild(this.canvas)
    //document.body.style.overflow = 'hidden'
    Object.assign(document.body.style, {
      'width': '100vw',
      'height': '100vh',
      'touch-action': 'none',

      '-webkit-user-select': 'none',  /* Chrome all / Safari all */
      '-moz-user-select': 'none',     /* Firefox all */
      '-ms-user-select': 'none',      /* IE 10+ */
      'user-select': 'none',          /* Likely future */
    
      '-webkit-touch-callout': 'none',
    
      'overflow': 'hidden',
    })

    // Create WebGL
    this.gl = GL.initWebGL(this.canvas)
    this.programs = {
      canvas: await GL.createProgram(this.gl, '/gl/canvas/vertex.glsl', '/gl/canvas/fragment.glsl')
    }

    // Create view
    this.view = new ViewManager(this)
    this.view.disableWindowOverscrolling()

    // Create scroll bars
    this.scrollBars = new ScrollBars('rgba(0, 0, 0, 0.5)', 10, 0)

    // Create buffers
    this.activeBuffers = GL.createBuffers(this.gl)
    this.staticBuffers = new Buffers(this.gl, 'DYNAMIC_DRAW')

    // Adjust canvas size
    this.resizeCanvas()

    // Add event listeners
    // Check Apple listeners for pen; different listeners for apple devices
    /*window.addEventListener('mousedown', e => this.handleMouseEvent(e), true)
    window.addEventListener('mousemove', e => this.handleMouseEvent(e), true)
    window.addEventListener('mouseup', e => this.handleMouseEvent(e), true)
    
    window.addEventListener('touchdown', e => this.handleTouchEvent(e), true)
    window.addEventListener('touchmove', e => this.handleTouchEvent(e), true)
    window.addEventListener('touchup', e => this.handleTouchEvent(e), true)
    */
    window.addEventListener('pointerdown', e => this.handlePointerEvent(e))
    window.addEventListener('pointermove', e => this.handlePointerEvent(e))
    window.addEventListener('pointerup', e => this.handlePointerEvent(e))
    window.addEventListener('pointerleave', e => this.handlePointerEvent(e))
    window.addEventListener('pointerout', e => this.handlePointerEvent(e))
    
    window.addEventListener('touchdown', e => e.preventDefault())
    window.addEventListener('touchmove', e => e.preventDefault())
    window.addEventListener('touchup', e => e.preventDefault())

    window.addEventListener('contextmenu', e => e.preventDefault())

    // Create tool wheel
    this.wheel = new ToolWheel(this, {
      undo: () => console.log('Undo'),
      redo: () => console.log('Redo'),
      settings: () => console.log('settings'),
    })

    // Start rendering loop
    requestAnimationFrame(() => this.renderLoop())

    // Connect to the backend server
    this.connector = new Connector(this.staticBuffers, () => this.scheduleRender())
  }

  scheduleRender() {
    this.rerender = true
  }

  renderLoop() {

    const correctSize = (this.canvas.width == Math.round(window.innerWidth * devicePixelRatio) && this.canvas.height == Math.round(window.innerHeight * devicePixelRatio))

    if (!correctSize && !this.skipResizeFrames) {
      console.log('detected resize')
      this.resizeCanvas()
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
    this.canvas.style.width = window.innerWidth + 'px'
    this.canvas.style.height = window.innerHeight + 'px'
    this.canvas.width = Math.round(window.innerWidth * window.devicePixelRatio)
    this.canvas.height = Math.round(window.innerHeight * window.devicePixelRatio)
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)

    this.scheduleRender()
  }

  // to remove
  handleMouseEvent(e) {
    let pointerEvent = {
      x: e.x,
      y: e.y,
      pressure: e.buttons ? 0.5 : 0,
      timeStamp: performance.now(),
      target: e.target,
      type: "mouse",
      preventDefault: () => e.preventDefault()
    }
    this.handlePointerEvent(pointerEvent)
  }

  handleTouchEvent(e) {
    console.log(e, e.touches[0].radiusX)
  }

  handlePointerEvent(e) {
    //console.log("pointer", e)

    if (this.scrollBars.scrolling() || e.target == this.scrollBars.vertical || e.target == this.scrollBars.horizontal) {
      this.scrollBars.handlePointerEvent(e, this.view, this.staticBuffers.yMax)
      this.scheduleRender()
    } else if (e.target == this.canvas) {
      
      if (e.pressure && this.wheel.isVisible() && this.openingWheel)
        return

      if (e.pressure && this.wheel.isVisible() && !this.openingWheel)
        this.wheel.hide()

      if (!e.pressure && this.openingWheel)
        this.openingWheel = false

      let { type, pressure, timeStamp, pointerType } = e
      let [x, y] = this.view.mapCoords(e.x, e.y)

      this.drawing = (pressure > 0 && pointerType != 'touch')

      if (pointerType != 'touch') {
        if (pressure) { // Writing
          if (!this.activeTool) { // New stroke
            this.activeTool = this.wheel.NewTool()
            console.log('new tool')
            // Long press eraser gesture
            const d = pointerType == 'pen' ? 15 : 1
            this.activeTool.ifLongPress(pointerType == 'pen' ? 500 : 1000, d / innerWidth / this.view.zoom, () => {
              this.activeTool.delete()
              this.openingWheel = true
              this.activeTool = undefined
              this.wheel.hide()
              this.wheel.show(e.x, e.y)
              console.log(e.x, e.y)
              this.render()
              
              //console.log(e.pointerId)
              //this.wheel.wheel.setPointerCapture(e.pointerId)
              //this.canvas.style.pointerEvents = 'none'
              //setTimeout(200, this.canvas.style.pointerEvents = 'all')
            })
          }
          
          let prediction = []
          if (e.getPredictedEvents)
            prediction = [].concat(...e.getPredictedEvents().map(({x, y, pressure, timeStamp}) => [...this.view.mapCoords(x, y), pressure, timeStamp]))
            
          this.activeTool.update(x, y, pressure, timeStamp, prediction)
          this.render()
          //this.scheduleRender()
        } else if (this.activeTool) { // Finished stroke
          this.staticBuffers.push(...this.activeTool.vectorize(false))
          this.connector.registerStroke(this.activeTool.serialize())

          this.activeTool.delete()
          delete this.activeTool
          delete this.lastLiveUpdate

          this.render()
          //this.scheduleRender()
        }

        const FPS = this.activeTool ? 20 : 60
        if (!this.lastLiveUpdate || this.lastLiveUpdate + 1000 / FPS < performance.now()) {
          const pointer = (type == 'pointerleave' || type == 'pointerout') ? undefined : { x, y }
          const activeStroke = this.activeTool ? this.activeTool.serialize() : undefined
          this.connector.socket.emit('live update', pointer, activeStroke)
          this.lastLiveUpdate = performance.now()
        }
      }
    }
  }

  render() {
    if (this.rendering || this.nextRender && performance.now() < this.nextRender) {
      this.scheduleRender()
      return
    }

    this.rendering = true
    const renderStart = performance.now()
    Profiler.start('rendering')
    
    this.clearCanvas()
    this.gl.useProgram(this.programs.canvas)
    this.drawOldStrokes()
    this.drawActiveStroke()
    this.connector.drawCollabs(this.view, ([vertex, index]) => {
      GL.bindBuffers(this.gl, this.activeBuffers)
      GL.bufferArrays(this.gl, { vertex, index }, 'STREAM_DRAW')
      GL.setVars(this.gl, this.programs.canvas, this.view.getVars())
      this.gl.drawElements(this.gl.TRIANGLES, index.length, this.gl.UNSIGNED_SHORT, 0)
    })
    this.scrollBars.update(this.view, this.staticBuffers.yMax)

    Profiler.stop('rendering')
    this.nextRender = performance.now() * 2 - renderStart
    this.rendering = false
  }

  clearCanvas() {
    this.gl.clearColor(1, 1, 1, 1)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
  }

  drawActiveStroke() {
    if (!this.activeTool)
      return
    
    let [vertex, index] = this.activeTool.vectorize(true)
    
    //console.log(vertex, index)

    GL.bindBuffers(this.gl, this.activeBuffers)
    GL.bufferArrays(this.gl, { vertex, index }, 'STREAM_DRAW')
    GL.setVars(this.gl, this.programs.canvas, this.view.getVars())
    
    this.gl.drawElements(this.gl.TRIANGLES, index.length, this.gl.UNSIGNED_SHORT, 0)
    this.gl.flush()
  }

  drawOldStrokes() {
    this.staticBuffers.draw(() => {
      GL.setVars(this.gl, this.programs.canvas, this.view.getVars())
    })
  }

}