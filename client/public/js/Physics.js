import Profiler from './Profiler.js'
import { ELEMENTS_PER_VERTEX } from './GL.js'

const dt = 5
const stiffness = 0.005
const drag = 0.1
const A_STEP = (Math.PI / 2) / 4 // rounded tip angular distance between vertices

export function StrokeToPath(s, w = 0.01, color = [0, 0, 0, 1], full = true) {
  Profiler.start('physics')

  let vertices = []

  if (s.length == 4) {

    const [x, y, r] = [s[0], s[1], s[2] * w]
    for (let a = A_STEP / 2; a < Math.PI; a += A_STEP) {
      const [sin, cos] = [Math.sin(a), Math.cos(a)]
      vertices.push(x + sin * r, y + cos * r, ...color)
      vertices.push(x - sin * r, y + cos * r, ...color)
    }
  }

  let i = 0 | 0
  let [x, y, vx, vy, t] = [+s[0], +s[1], 0.0, 0.0, +s[3]]
  while (t < s.at(-1)) {
    while (t > s[i + 7])
      i += 4

    const k = (t - s[i + 3]) / (s[i + 7] - s[i + 3])
    const X = s[i] * (1 - k) + s[i + 4] * k 
    const Y = s[i + 1] * (1 - k) + s[i + 5] * k 
    const P = s[i + 2] * (1 - k) + s[i + 6] * k
    const v = Math.sqrt(vx * vx + vy * vy)

    if (v) {
      const r = w * P
      const nx = -vy / v * r
      const ny = vx / v * r

      if (!vertices.length) { // Round tip
        const ix = -vx / v * r
        const iy = -vy / v * r
        vertices.push(x + ix, y + iy, ...color)
        for (let a = A_STEP; a < Math.PI / 2; a += A_STEP) {
          const [sin, cos] = [Math.sin(a), Math.cos(a)]
          vertices.push(x + ix * cos + nx * sin, y + iy * cos + ny * sin, ...color)
          vertices.push(x + ix * cos - nx * sin, y + iy * cos - ny * sin, ...color)
        }
      }

      vertices.push(x + nx, y + ny, ...color)
      vertices.push(x - nx, y - ny, ...color)
    }

    const ax = (X - x) * stiffness - vx * drag
    const ay = (Y - y) * stiffness - vy * drag
    
    x += vx * dt
    y += vy * dt
    vx += ax * dt
    vy += ay * dt
    t += dt
  }

  if (full) {
    let dt = 1
    const X = s.at(-4)
    const Y = s.at(-3)
    const P = s.at(-2)
    let dist = Math.sqrt((X - x) ** 2 + (Y - y) ** 2)
    while (dist > 0) {
      const v = Math.sqrt(vx * vx + vy * vy)
      dist -= v
  
      if (v) {
        const r = w * P
        const nx = -vy / v * r
        const ny = vx / v * r
        vertices.push(x + nx, y + ny, ...color)
        vertices.push(x - nx, y - ny, ...color)

        if (dist <= 0) { // Round tip
          const ix = vx / v * r
          const iy = vy / v * r
          for (let a = Math.PI / 2 - A_STEP; a >= 0; a -= A_STEP) {
            const [sin, cos] = [Math.sin(a), Math.cos(a)]
            vertices.push(x + ix * cos + nx * sin, y + iy * cos + ny * sin, ...color)
            vertices.push(x + ix * cos - nx * sin, y + iy * cos - ny * sin, ...color)
          }
          vertices.push(x + ix, y + iy, ...color)
        }
      }
  
      const ax = (X - x) * stiffness - vx * drag
      const ay = (Y - y) * stiffness - vy * drag
      
      x += vx * dt
      y += vy * dt
      vx += ax * dt
      vy += ay * dt
      t += dt
    }
  }

  let indices = []
  for (let i = 2; i * ELEMENTS_PER_VERTEX < vertices.length; i++)
    indices.push(i - 2, i - 1, i)
  
  Profiler.stop('physics')

  return [vertices, indices]
}