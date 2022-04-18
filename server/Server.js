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
        origin: "*",
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

    this.docs = {}

    this.io.on('connection', (socket) => {
      let ip = socket.conn.remoteAddress.replace('::ffff:', '')
      let userId = Math.random()
      let docId

      socket.on('disconnect', () => {
        this.docs[docId].users = this.docs[docId].users.filter(u => u != socket)
        console.log(`[${new Date().toLocaleString()}] ${ip} stopped drawing on ${docId}, ${this.docs[docId].users.length} users remaining`)
      })

      socket.on('new stroke', (stroke) => {
        console.log(`[${new Date().toLocaleString()}] ${ip} is drawing on /doc/${docId}`)

        for (let u of this.docs[docId].users)
          if (u != socket)
            u.emit('load strokes', [stroke])

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

      socket.on('undo stroke', () => {
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

      socket.on('request document', id => {
        if (docId)
          return

        docId = id
        console.log(`[${new Date().toLocaleString()}] ${ip} started drawing on /doc/${docId}`)

        if (!this.docs[id])
          this.docs[id] = {
            users: [socket]
          }
        else
          this.docs[id].users.push(socket)

        if (docId == 'secret_welcome_page')
          docId = ''

        QueryAllDB('data', 'notes', { id: docId }, {}, result => {
          if (!result.length)
            socket.emit('load strokes', [])
          else
            socket.emit('load strokes', result[0].strokes)
        })
      })

      socket.on('live update', (pointer, activeStroke) => {
        if (!this.docs[docId])
          return

        //console.log(pointer, activeStroke)
        for (let u of this.docs[docId].users)
          if (u != socket)
            u.emit('collaborator', userId, pointer, activeStroke)
      })
    })
  }
}

module.exports = Server