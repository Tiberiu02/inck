export function ShowCircularWave(x, y, r, duration) {
  let el = document.createElement('div')
  el.className = 'circular-wave-animation'

  el.style.width = el.style.height = `${2 * r}px`
  el.style.marginLeft = el.style.marginTop = `-${r}px`
  el.style.left = x + 'px'
  el.style.top = y + 'px'
  el.style.animationDuration = `${duration}ms`

  document.body.appendChild(el)

  setTimeout(() => el.remove(), duration)
}

export class ScrollBars {
  constructor(color, width, margin) {
    this.width = width
    this.margin = margin
    const style = {
      backgroundColor: color,
      position: 'absolute',
      width: '0px',
      height: '0px',
      borderRadius: `${width/2}px`,
    }

    this.pointers = {}

    this.vertical = document.createElement('div')
    Object.assign(this.vertical.style, style)
    document.body.appendChild(this.vertical)

    this.horizontal = document.createElement('div')
    Object.assign(this.horizontal.style, style)
    document.body.appendChild(this.horizontal)
  }

  handlePointerEvent(e, view, yMax) {
    let { pointerId, x, y, pressure } = e

    if (pressure) {
      e.preventDefault()

      if (!this.scrollDirection)
        this.scrollDirection = (e.target == this.horizontal ? 'horizontal' : 'vertical')

      if (this.pointers[pointerId]) {
        const p = this.pointers[pointerId]
        if (this.scrollDirection == 'vertical') {
          const dy = (y - p.y) / (innerHeight - 3 * this.margin - this.width) * this.yMax
          view.top = Math.max(0, Math.min(this.yMax - innerHeight / innerWidth / view.zoom, view.top + dy))
        } else {
          const dx = (x - p.x) / (innerWidth - 3 * this.margin - this.width)
          view.left = Math.max(0, Math.min(1 - 1 / view.zoom, view.left + dx))
        }
      } else
        this.yMax = Math.max(yMax, view.top + innerHeight / innerWidth / view.zoom)

      this.pointers[pointerId] = { x, y }
    } else {
      this.pointers = []
      delete this.yMax
      delete this.scrollDirection
    }
  }

  scrolling() {
    return this.pointers.length > 0
  }

  update(view, yMax) {
    if (this.yMax)
      yMax = this.yMax

    const hLen = 1 / view.zoom
    const hStart = view.left
    const hFullLen = window.innerWidth - 3 * this.margin - this.width

    Object.assign(this.horizontal.style, {
      display: (hLen == 1 ? 'none' : ''),
      bottom: `${this.margin}px`,
      height: `${this.width}px`,
      left: `${this.margin + hStart * hFullLen}px`,
      width: `${hLen * hFullLen}px`
    })
    
    const aspectRatio = (innerHeight / innerWidth)
    const vSize = Math.max(yMax, view.top + 1 / view.zoom * aspectRatio)
    const vLen = hLen * aspectRatio / vSize
    const vStart = view.top / vSize
    let vFullLen = window.innerHeight - 2 * this.margin - this.margin - this.width
    
    this.vBarHeight = vLen * vFullLen
    if (this.vBarHeight < this.width) {
      vFullLen -= this.width - this.vBarHeight
      this.vBarHeight = this.width
    }
    
    Object.assign(this.vertical.style, {
      display: (vLen == 1 ? 'none' : ''),
      right: `${this.margin}px`,
      width: `${this.width}px`,
      top: `${this.margin + vStart * vFullLen}px`,
      height: `${this.vBarHeight}px`
    })
  }
}



// Detect screen DPI
let el = document.createElement('div');
el.style.position = 'absolute';
el.style.height = '1in';
el.style.top = '100%';
document.body.appendChild(el);
window.DPI = el.offsetHeight;
document.body.removeChild(el);