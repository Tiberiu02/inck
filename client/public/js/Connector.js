import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js"
import { StrokeToPath, FillPath } from './Physics.js'
import { GL } from './GL.js'
import { Eraser, Pen } from './Tools.js'

function hexToRgb(hex) {
  const normal = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (normal) return normal.slice(1).map(e => parseInt(e, 16));

  const shorthand = hex.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (shorthand) return shorthand.slice(1).map(e => 0x11 * parseInt(e, 16));

  return null;
}

/**
 * EXPLANATION OF SERVER INTERACTION PROTOCOL
 * 
 * Any string (id) coresponds to a document.
 * For every document, the server stores a list of objects (strokes).
 * 
 * The client can request all strokes in a document by emitting 'request document'. The server will respond with 'load document'.
 * The client can append any object to the list of strokes by emitting 'new stroke'.
 */
export default class Connector {
  constructor(buffers, renderFn) {
    this.buffers = buffers
    this.render = renderFn
    this.socket = io(`${window.location.host.split(':')[0]}:88`)

    this.socket.on('connect', () => {
      const wloc = window.location.pathname.match(/\/note\/([\w\d_]+)/)
      this.docId = wloc && wloc[1] || ''

      this.socket.emit('request document', this.docId)
    })

    this.socket.on('load document', data => this.loadData(data))

    // Backwards compatibility
    this.decodeCoordLegacy = n => [(n & 4095) / 4096, (n >> 12) / 4095]
  }

  loadData(data) {
    console.log(data)
    for (let s of data) {
      if (!s) continue

      if (!s.type || s.type == 'pen') {
        let path = []
        for (const i in s.path)
          path.push(...this.decodeCoordLegacy(s.path[i]), 0.5, 10 * i)
        
        const color = hexToRgb(s.color || '#000').concat(1)
        const [vertex, index] = StrokeToPath(path, s.width, color, true)
        this.buffers.push(vertex, index)

      } else if (s.type == 'eraser') {
        const [vertex, index] = FillPath([].concat(...s.path.map(this.decodeCoordLegacy)), [1, 1, 1, 1])
        this.buffers.push(vertex, index)
      } else if (s.type == 'p') {
        const [vertex, index] = Pen.deserialize(s).vectorize()
        this.buffers.push(vertex, index)
      } else if (s.type == 'e') {
        const [vertex, index] = Eraser.deserialize(s).vectorize()
        this.buffers.push(vertex, index)
      }
    }

    this.render()
  }

  registerStroke(stroke) {
    this.socket.emit('new stroke', this.docId, stroke)
  }
}