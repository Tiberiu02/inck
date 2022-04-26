import { StrokeToPath } from './Physics.js'

export class Tool {
  constructor(inputs) {
    this.inputs = inputs
  }

  update(x, y, pressure, timeStamp) {
    if (!this.startTime)
      this.startTime = timeStamp
    
    this.inputs.push(x, y, pressure, timeStamp - this.startTime)
  }

  static deserialize(data) {
    if (data.type == 'p')
      return Pen.deserialize(data)
    else if (data.type == 'e')
      return Eraser.deserialize(data)
  }

  ifLongPress(duration, maxDist, callback) {
    this.longPressTimeout = setTimeout(() => {
      let [xMin, yMin, xMax, yMax] = [Infinity, Infinity, 0, 0]

      for (let i = 0; i < this.inputs.length; i += 4) {
        xMin = Math.min(xMin, this.inputs[i])
        yMin = Math.min(yMin, this.inputs[i + 1])
        xMax = Math.max(xMax, this.inputs[i])
        yMax = Math.max(yMax, this.inputs[i + 1])
      }

      if (xMax - xMin < maxDist && yMax - yMin < maxDist)
        callback()
    }, duration)
  }

  delete() {
    if (this.longPressTimeout)
      clearTimeout(this.longPressTimeout)
  }
}

export class Pen extends Tool {
  constructor(width, color, inputs = []) {
    super(inputs)
    this.width = width
    this.color = color
  }

  vectorize(active) {
    return StrokeToPath(this.inputs, this.width, this.color)
  }

  serialize() {
    return {
      type: 'p',
      width: this.width,
      color: this.color,
      path: this.inputs
    }
  }

  static deserialize(s) {
    return new Pen(s.width, s.color, s.path)
  }
}

export class Eraser extends Tool {
  constructor(inputs = []) {
    super(inputs)
  }

  vectorize(active) {
    const color = active ? [0.95, 0.95, 0.95, 1] : [1, 1, 1, 1]

    let vertices = []
    for (let i = 0; i < this.inputs.length; i += 4)
      vertices.push(this.inputs[i], this.inputs[i + 1], ...color)
    
    let indices = []
    for (let i = 1; i * 4 < this.inputs.length; i++)
      indices.push(0, i - 1, i)
    
    return [vertices, indices]
  }

  serialize() {
    return {
      type: 'e',
      path: this.inputs
    }
  }

  static deserialize(s) {
    return new Eraser(s.path)
  }
}