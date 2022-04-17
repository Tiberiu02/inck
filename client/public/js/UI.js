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

    this.vertical = document.createElement('div')
    Object.assign(this.vertical.style, style)
    document.body.appendChild(this.vertical)

    this.horizontal = document.createElement('div')
    Object.assign(this.horizontal.style, style)
    document.body.appendChild(this.horizontal)
  }

  update(view, yMax) {
    const vStart = view.left
    const vLen = 1 / view.zoom
    const vFullLen = window.innerWidth - 3 * this.margin - this.width

    Object.assign(this.vertical.style, {
      display: (vLen == 1 ? 'none' : ''),
      bottom: `${this.margin}px`,
      height: `${this.width}px`,
      left: `${this.margin + vStart * vFullLen}px`,
      width: `${vLen * vFullLen}px`
    })

    const aspectRatio = (innerHeight / innerWidth)
    const hSize = Math.max(yMax, view.top + 1 / view.zoom * aspectRatio)
    const hLen = vLen * aspectRatio / hSize
    const hStart = view.top / hSize
    let hFullLen = window.innerHeight - 2 * this.margin - this.margin - this.width
    
    let hBarHeight = hLen * hFullLen
    if (hBarHeight < this.width) {
      hFullLen -= this.width - hBarHeight
      hBarHeight = this.width
    }
    
    Object.assign(this.horizontal.style, {
      display: (hLen == 1 ? 'none' : ''),
      right: `${this.margin}px`,
      width: `${this.width}px`,
      top: `${this.margin + hStart * hFullLen}px`,
      height: `${hBarHeight}px`
    })
  }
}