import Profiler from './Profiler.js'
import { ELEMENTS_PER_VERTEX } from './GL.js'

const dt = 5
const stiffness = 0.005
const drag = 0.1
const A_STEP = (Math.PI / 2) / 4 // rounded tip angular distance between vertices

export const ELEMENTS_PER_INPUT = 4
export const OFFSET_INPUT = {
  X: 0,
  Y: 1,
  P: 2,
  T: 3,
}

/**
 * Turns a series of input points into drawable elements (WebGL vertices & indices), using a spring-base physics simulation.
 * @param {number[]} s Float array of length 4*N containing the X, Y, Pressure, TimeStamp of all N input points
 * @param {number} w Stroke width as a fraction of screen width
 * @param {number} color RGBA color of stroke as an array of 4 floats
 * @param {boolean} full True if the path should connect to last input point
 * @returns Vertices array and indices array, as two elements of a single list.
 */
export function StrokeToPath(s, w, color, full = true) {
  Profiler.start('physics')

  let vertices = []

  if (s.length == ELEMENTS_PER_INPUT) {

    const [x, y, r] = [s[OFFSET_INPUT.X], s[OFFSET_INPUT.Y], s[OFFSET_INPUT.P] * w]
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
      i += ELEMENTS_PER_INPUT

    const k = (t - s[i + OFFSET_INPUT.T]) / (s[i + ELEMENTS_PER_INPUT + OFFSET_INPUT.T] - s[i + OFFSET_INPUT.T])
    const X = s[i + OFFSET_INPUT.X] * (1 - k) + s[i + ELEMENTS_PER_INPUT + OFFSET_INPUT.X] * k
    const Y = s[i + OFFSET_INPUT.Y] * (1 - k) + s[i + ELEMENTS_PER_INPUT + OFFSET_INPUT.Y] * k
    const P = s[i + OFFSET_INPUT.P] * (1 - k) + s[i + ELEMENTS_PER_INPUT + OFFSET_INPUT.P] * k
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
    const X = s.at(-ELEMENTS_PER_INPUT + OFFSET_INPUT.X)
    const Y = s.at(-ELEMENTS_PER_INPUT + OFFSET_INPUT.Y)
    const P = s.at(-ELEMENTS_PER_INPUT + OFFSET_INPUT.P)
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

export function FillPath(path, color) {
  let vertices = []
  for (let i = 0; i < path.length; i += 2)
    vertices.push(path[i], path[i + 1], ...color)
  
  let indices = []
  for (let i = 1; i * 2 < path.length; i++)
    indices.push(0, i - 1, i)
  
  return [vertices, indices]
}