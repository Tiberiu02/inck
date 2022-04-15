/**
 * EXPLANATION OF THE VIEW GEOMETRY
 * 
 * 
 *        0                        1
 *        +------------------------+----------> x
 *        |                        |
 *        |                        |
 *        |                        |
 *        |    +--------+          |
 *        |    |        |          |
 *        |    |        |          |
 *        |    +--------+  VIEW    |
 *        |                        |
 *        |                        |
 *        |                        |
 *        |                        |
 *        |                        |
 *        +------------------------+  CANVAS
 *        |
 *        |
 *        V
 *        y
 * 
 * The canvas is a rectangle of width=1 and variable height.
 * Top-left corner is mapped to the origin: (x=0, y=0).
 * Top-right corner is mapped to (x=1, y=0).
 * Everything else has 0 <= x <= 1 and y >= 0.
 * 
 * The view is a rectangle comletely included in the canvas rectangle.
 * The view is determined by its top-left corner, which is located at (x=this.left, y=this.top).
 * The view width is equal to 1.0/this.zoom.
 * The view has the same aspect ratio as the screen.
 */

export class ViewManager {

  constructor(app) {
    this.app = app

    this.top = 0
    this.left = 0
    this.zoom = 1

    this.touches = {}

    window.addEventListener('wheel', e => this.handleWheelEvent(e), { passive: false })

    this.mouse = { x: 0, y: 0 }
    window.addEventListener('mousemove', e => this.mouse = { x: e.clientX, y: e.clientY })
    
    window.addEventListener('touchstart', e => this.handleTouchEvent(e))
    window.addEventListener('touchend', e => this.handleTouchEvent(e))
    window.addEventListener('touchcancel', e => this.handleTouchEvent(e))
    window.addEventListener('touchmove', e => this.handleTouchEvent(e))

    this.inertia = new ScrollInertia(this)
  }

  disableWindowOverscrolling() {
    if (window.safari) {
      history.pushState(null, null, location.href)
      window.onpopstate = function(event) {
          history.go(1)
      }
    } else
      document.body.style.overscrollBehavior = 'none'
  }

  getVars() {
    return {
      'u_AspectRatio': window.innerWidth / window.innerHeight,
      'u_Left': this.left,
      'u_Top': this.top,
      'u_Zoom': this.zoom
    }
  }

  update(touches) {
    // Update touches
    this.touches = []
    for (let i = 0; i < touches.length; i++) {
      const t = touches.item(i)
      if (t.radiusX > 1 && t.radiusY > 1)
        this.touches.push({ x: t.clientX, y: t.clientY })
    }
    const N = this.touches.length
    if (!N) return

    // Compute average position and radius
    let xAvg = 0, yAvg = 0, rAvg = 0
    for (let { x, y } of Object.values(this.touches)) {
      xAvg += x
      yAvg += y
    }
    xAvg /= N
    yAvg /= N
    for (let { x, y } of Object.values(this.touches))
      rAvg += Math.sqrt((x - xAvg) ** 2 + (y - yAvg) ** 2)

    this.averagePointerPos = { x: xAvg, y: yAvg }
    this.averagePointerDist = N > 1 ? rAvg / N : 1
  }

  // Map screen coordinates to canvas coordinates
  mapCoords(x, y) {
    x /= this.app.canvas.width * this.zoom
    y /= this.app.canvas.width * this.zoom
    x += this.left
    y += this.top
    return [x, y]
  }

  clip() {
    this.top = Math.max(0, this.top)
    this.left = Math.max(0, Math.min(1 - 1 / this.zoom, this.left))
    this.zoom = Math.max(1, this.zoom)
  }

  applyZoom(centerX, centerY, zoomFactor) {
    const [x0, y0] = this.mapCoords(centerX, centerY)
    this.zoom = Math.max(1, this.zoom * zoomFactor)
    const [x1, y1] = this.mapCoords(centerX, centerY)
    this.left -= x1 - x0
    this.top -= y1 - y0
  }

  handleTouchEvent(e) {
    const { type, touches, timeStamp } = e

    if (e.changedTouches[0].radiusX <= 1 && e.changedTouches[0].radiusY <= 1) // Ignore stylus events
      return

    if (!this.touches.length) // Reset inertia on touch start
      this.inertia.reset(timeStamp)

    if (type != 'touchmove' || touches.length != this.touches.length) {
      this.update(touches)
      this.inertia.reset()
    } else {
      const [x0, y0, r0] = [this.averagePointerPos.x, this.averagePointerPos.y, this.averagePointerDist]
      this.update(touches)
      const [x1, y1, r1] = [this.averagePointerPos.x, this.averagePointerPos.y, this.averagePointerDist]

      // Scroll
      const dx = (x0 - x1) / (this.app.canvas.width * this.zoom)
      const dy = (y0 - y1) / (this.app.canvas.width * this.zoom)
      this.left += dx
      this.top += dy
      this.inertia.update(dx, dy, timeStamp)

      this.applyZoom(x1, y1, r1 / r0) // Zoom

      this.clip() // Clip to canvas

      this.app.scheduleRender()
    }

    if (!this.touches.length) // Release view on touch end
      this.inertia.release()
  }

  handleWheelEvent(e) {
    e.preventDefault()
    
    let { deltaX, deltaY, deltaMode } = e

    if (deltaMode == WheelEvent.DOM_DELTA_PIXEL) {
      deltaX /= this.app.canvas.width * this.zoom
      deltaY /= this.app.canvas.width * this.zoom
    }

    if (e.ctrlKey) {
      this.applyZoom(this.mouse.x, this.mouse.y, 1 - deltaY * (35 + 10 * Math.sign(deltaY)))
    } else {
      this.top += deltaY
      this.left += deltaX
    }
    this.clip()

    this.app.scheduleRender()
  }

}

const INERTIA_DECAY_RATE = 5
const INERTIA_DECAY_PER_MS = INERTIA_DECAY_RATE * 0.001
const SMOOTH_AVG = 0.5
const STOPPING_INERTIA = 0.0001

class ScrollInertia {
  constructor(view) {
    this.view = view
  }

  update(dx, dy, t) {
    const dt = t - this.t
    const vx = dx / dt
    const vy = dy / dt

    if (!this.v)
      this.v = { x: vx, y: vy }
    else
      this.v = {
        x: this.v.x * (1 - SMOOTH_AVG) + vx * SMOOTH_AVG,
        y: this.v.y * (1 - SMOOTH_AVG) + vy * SMOOTH_AVG
      }
    
    this.t = t
  }

  reset(t) {
    this.t = t
    delete this.v
    if (this.interval) {
      clearInterval(this.interval)
      delete this.interval
    }
  }

  release() {
    this.t = performance.now()
    this.interval = setInterval(() => this.move(), 10)
  }

  move() {
    if (!this.v) {
      this.reset()
      return
    }

    const t = performance.now()
    const dt = t - this.t

    this.view.left += this.v.x * dt
    this.view.top += this.v.y * dt
    this.view.clip()
    this.view.app.scheduleRender()
  
    this.v.x *= 1 - Math.min(1, dt * INERTIA_DECAY_PER_MS)
    this.v.y *= 1 - Math.min(1, dt * INERTIA_DECAY_PER_MS)

    this.t = t

    if (Math.sqrt(this.v.x ** 2 + this.v.y ** 2) * this.view.zoom < STOPPING_INERTIA)
      this.reset()
  }
}