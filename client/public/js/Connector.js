import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js"
import { StrokeToPath } from './Physics.js'
import { GL } from './GL.js'

function hexToRgb(hex) {
  const normal = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (normal) return normal.slice(1).map(e => parseInt(e, 16));

  const shorthand = hex.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (shorthand) return shorthand.slice(1).map(e => 0x11 * parseInt(e, 16));

  return null;
}

export default class Connector {
  constructor(app) {
    this.app = app
    this.socket = io('http://localhost:88')

    this.socket.on('connect', () => {
      const wloc = window.location.pathname.match(/\/note\/([\w\d_]+)/)
      this.docId = wloc && wloc[1] || ''

      this.socket.emit('request document', this.docId)
    })

    this.socket.on('load document', data => this.loadData(data))

    // Legacy code
    this.decodeCoord = n => [(n & 4095) / 4096, (n >> 12) / 4095]
  }

  loadData(data) {
    console.log(data)
    for (let s of data) {
      if (!s) continue
      
      if (!s.type || s.type == 'pen') {
        let path = []
        for (const i in s.path)
          path.push(...this.decodeCoord(s.path[i]), 0.5, 10 * i)
        
        const color = hexToRgb(s.color || '#000').concat(1)
        const [vertex, index] = StrokeToPath(path, s.width, color, true)
        GL.appendArray(this.app.staticArrays, vertex, index)
      }
    }

    this.app.updateStaticBuffers()
    this.app.scheduleRender()
  }
}