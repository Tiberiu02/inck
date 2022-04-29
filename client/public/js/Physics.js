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

function ComputeSmoothPath(s, full) {
  if (s.length == ELEMENTS_PER_INPUT)
    return [{ x: s[0], y: s[1], t: 0, nx: 1, ny: 0 }]

  let path = []

  let i = 0 | 0
  let [x, y, vx, vy, t] = [+s[0], +s[1], 0.0, 0.0, +s[3]]
  while (t < s.at(-1)) {
    while (t >= s[i + ELEMENTS_PER_INPUT + OFFSET_INPUT.T])
      i += ELEMENTS_PER_INPUT

    const k = (t - s[i + OFFSET_INPUT.T]) / (s[i + ELEMENTS_PER_INPUT + OFFSET_INPUT.T] - s[i + OFFSET_INPUT.T])
    const X = s[i + OFFSET_INPUT.X] * (1 - k) + s[i + ELEMENTS_PER_INPUT + OFFSET_INPUT.X] * k
    const Y = s[i + OFFSET_INPUT.Y] * (1 - k) + s[i + ELEMENTS_PER_INPUT + OFFSET_INPUT.Y] * k
    const v = Math.sqrt(vx * vx + vy * vy)

    if (v) {
      const nx = -vy / v
      const ny = vx / v

      path.push({ x, y, t, nx, ny })
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
    const dt = 1
    const X = s.at(-ELEMENTS_PER_INPUT + OFFSET_INPUT.X)
    const Y = s.at(-ELEMENTS_PER_INPUT + OFFSET_INPUT.Y)
    
    let dist = Math.sqrt((X - x) ** 2 + (Y - y) ** 2)
    while (dist > 0) {
      const v = Math.sqrt(vx * vx + vy * vy)
      dist -= v
  
      if (v) {
        const nx = -vy / v
        const ny = vx / v
        
        path.push({ x, y, t, nx, ny })
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

  return path
}

function Bisector(ux, uy, vx, vy) {
  const x = ux + vx
  const y = uy + vy
  const n = Math.sqrt(x ** 2 + y ** 2)
  if (!n) return [uy, -ux]
  return [x / n, y / n]
}

function interpolate(x1, y1, x2, y2, x) {
  if (x1 == x2)
    return (y1 + y2) / 2
  
  return (y1 * (x2 - x) + y2 * (x - x1)) / (x2 - x1)
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

  const GetR = p => w * p

  let path = ComputeSmoothPath(s, full)

  let lenSmooth = 0
  for (let i = 1; i < path.length; i++)
    lenSmooth += Math.sqrt((path[i].x - path[i - 1].x) ** 2 + (path[i].y - path[i - 1].y) ** 2)

  let inputsByDist = [{ p: s[OFFSET_INPUT.P], d: 0 }]
  let lenRaw = 0
  for (let i = ELEMENTS_PER_INPUT; i < s.length; i += ELEMENTS_PER_INPUT) {
    lenRaw += Math.sqrt((s[i - ELEMENTS_PER_INPUT + OFFSET_INPUT.X] - s[i + OFFSET_INPUT.X]) ** 2 + (s[i - ELEMENTS_PER_INPUT + OFFSET_INPUT.Y] - s[i + OFFSET_INPUT.Y]) ** 2)
    inputsByDist.push({ p: s[i + OFFSET_INPUT.P], d: lenRaw })
  }
  
  let vertices = []

  if (path.length) { // Round tip at the begining
    const { x, y, nx, ny } = path.at(0)
    const r = GetR(s[OFFSET_INPUT.P])
    const ix = -ny
    const iy = nx
    vertices.push(x + r * ix, y + r * iy, ...color)
    for (let a = A_STEP; a < Math.PI / 2; a += A_STEP) {
      const [sin, cos] = [Math.sin(a), Math.cos(a)]
      vertices.push(x + r * ix * cos + r * nx * sin, y + r * iy * cos + r * ny * sin, ...color)
      vertices.push(x + r * ix * cos - r * nx * sin, y + r * iy * cos - r * ny * sin, ...color)
    }
  }

  let closestInput = 0
  let currLen = 0
  for (let i = 0; i < path.length; i++) {
    const { x, y, t, nx, ny } = path[i]

    if (i > 0)
      currLen += Math.sqrt((x - path[i - 1].x) ** 2 + (y - path[i - 1].y) ** 2)
      
    while (closestInput + 1 < inputsByDist.length && currLen / lenSmooth * lenRaw > inputsByDist[closestInput].d)
      closestInput += 1
    
    const p = closestInput > 0 ? interpolate(inputsByDist[closestInput - 1].d, inputsByDist[closestInput - 1].p, inputsByDist[closestInput].d, inputsByDist[closestInput].p, currLen / lenSmooth * lenRaw) : inputsByDist[closestInput].p
    const r = GetR(p)

    // Round off sharp corners
    if (i > 0 && path[i - 1].nx * nx + path[i - 1].ny * ny <= 0.5) {
      const [nx0, ny0] = [path[i - 1].nx, path[i - 1].ny]
      const [nx01, ny01] = Bisector(nx0, ny0, nx, ny)
      const [nx001, ny001] = Bisector(nx0, ny0, nx01, ny01)
      const [nx011, ny011] = Bisector(nx01, ny01, nx, ny)

      vertices.push(x + nx0 * r, y + ny0 * r, ...color)
      vertices.push(x - nx0 * r, y - ny0 * r, ...color)
      
      vertices.push(x + nx001 * r, y + ny001 * r, ...color)
      vertices.push(x - nx001 * r, y - ny001 * r, ...color)
      
      vertices.push(x + nx01 * r, y + ny01 * r, ...color)
      vertices.push(x - nx01 * r, y - ny01 * r, ...color)
      
      vertices.push(x + nx011 * r, y + ny011 * r, ...color)
      vertices.push(x - nx011 * r, y - ny011 * r, ...color)
    }

    vertices.push(x + nx * r, y + ny * r, ...color)
    vertices.push(x - nx * r, y - ny * r, ...color)
  }
  
  if (path.length) { // Round tip at the end
    const { x, y, nx, ny } = path.at(-1)
    const r = GetR(s.at(-ELEMENTS_PER_INPUT + OFFSET_INPUT.P))
    const ix = ny
    const iy = -nx
    for (let a = Math.PI / 2 - A_STEP; a >= 0; a -= A_STEP) {
      const [sin, cos] = [Math.sin(a), Math.cos(a)]
      vertices.push(x + r * ix * cos + r * nx * sin, y + r * iy * cos + r * ny * sin, ...color)
      vertices.push(x + r * ix * cos - r * nx * sin, y + r * iy * cos - r * ny * sin, ...color)
    }
    vertices.push(x + r * ix, y + r * iy, ...color)
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