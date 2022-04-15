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

    this.pointers = {}
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
    const N = touches.length
    this.pointers = []
    if (!N) return

    for (let i = 0; i < touches.length; i++)
      this.pointers.push({ x: touches.item(i).clientX, y: touches.item(i).clientY })

    let xAvg = 0, yAvg = 0, rAvg = 0

    for (let { x, y } of Object.values(this.pointers)) {
      xAvg += x
      yAvg += y
    }
    xAvg /= N
    yAvg /= N

    for (let { x, y } of Object.values(this.pointers))
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

  handleTouchEvent(e) {
    const { type, touches } = e

    if (type != 'touchmove' || touches.length != this.pointers.length)
      this.update(touches)
    else {
      const [x0, y0, r0] = [this.averagePointerPos.x, this.averagePointerPos.y, this.averagePointerDist]
      this.update(touches)
      const [x1, y1, r1] = [this.averagePointerPos.x, this.averagePointerPos.y, this.averagePointerDist]

      // Scroll
      this.left -= (x1 - x0) / (this.app.canvas.width * this.zoom)
      this.top -= (y1 - y0) / (this.app.canvas.width * this.zoom)

      // Zoom
      const [cx0, cy0] = this.mapCoords(x1, y1)
      this.zoom = Math.max(1, this.zoom * r1 / r0)
      const [cx1, cy1] = this.mapCoords(x1, y1)
      this.left -= cx1 - cx0
      this.top -= cy1 - cy0

      // Clip to canvas
      this.top = Math.max(0, this.top)
      this.left = Math.max(0, Math.min(1 - 1 / this.zoom, this.left))

      this.app.scheduleRender()
    }
  }

  handleWheelEvent(e) {
    console.log(e)
    
    let { deltaX, deltaY, deltaMode } = e
  }

}