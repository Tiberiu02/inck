const express = require('express')
const http = require('http')
const sockets = require('socket.io')
const SocketServer = sockets.Server

const { UpdateDB, QueryDB, QueryAllDB, InsertDB } = require('./Database.js')
const path = require('path')

class Server {
  contructor() { }
  start() {
    this.port = 88
    
    this.app = express()
    this.server = http.createServer(this.app)
    this.io = new SocketServer(this.server, {
      cors: {
        origin: "http://localhost",
        methods: ["GET", "POST"]
      }
    })

    this.app.use('/', express.static('client'))
    this.app.get('/doc/:docid', (req, res) => {
      res.sendFile(path.join(path.resolve(), 'client/index.html'))
    })

    this.server.listen(this.port, () => {
      console.log('listening on *:' + this.port)
    })

    this.io.on('connection', (socket) => {
      let ip = socket.conn.remoteAddress.replace('::ffff:', '')

      socket.on('disconnect', () => {
        console.log(`[${new Date().toLocaleString()}] ${ip} stopped drawing`)
      })

      socket.on('new stroke', (docId, stroke) => {
        console.log(`[${new Date().toLocaleString()}] ${ip} is drawing on /doc/${docId}`)

        if (docId == '')
          return
        
        if (docId == 'secret_welcome_page')
          docId = ''

        QueryAllDB('data', 'notes', { id: docId }, { id: 1 }, response => {
          if (response.length)
            UpdateDB('data', 'notes', { id: docId }, { $push: { 'strokes': stroke } } )
          else
            InsertDB('data', 'notes', { id: docId, strokes: [stroke] })
        })
      })

      socket.on('undo stroke', (docId) => {
        console.log(`[${new Date().toLocaleString()}] ${ip} is undoing on /doc/${docId}`)

        if (docId == '')
          return
        
        if (docId == 'secret_welcome_page')
          docId = ''

        QueryAllDB('data', 'notes', { id: docId }, { id: 1 }, response => {
          if (response.length)
            UpdateDB('data', 'notes', { id: docId }, { $pop: { 'strokes': 1 } } )
        })
      })

      socket.on('request document', docId => {
        console.log(`[${new Date().toLocaleString()}] ${ip} started drawing on /doc/${docId}`)

        if (docId == 'secret_welcome_page')
          docId = ''

        QueryAllDB('data', 'notes', { id: docId }, {}, result => {
          if (!result.length)
            socket.emit('load document', [])
          else
            socket.emit('load document', result[0].strokes)
        })
      })
    })
  }
}

module.exports = Server