const express = require('express')
const http = require('http')
const sockets = require('socket.io')
require('dotenv').config();
const {register: registerFn, login: loginFn} = require("./auth")
const { UpdateDB, QueryDB, QueryAllDB, InsertDB } = require('./Database.js')
const path = require('path');
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const cors = require('cors');
var cookieParser = require('cookie-parser')




class Server {
  constructor(port = 8080) {

    const SocketServer = sockets.Server
    this.port = port
    mongoose.connect(process.env.MONGO_URI)
    this.app = express()
    this.app.disable('x-powered-by');
    this.server = http.createServer(this.app)
    this.io = new SocketServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })
    const corsOptions ={ 
      origin: '*', 
      credentials: true,            //access-control-allow-credentials:true
      optionSuccessStatus: 200
    }
    this.app.use(cors(corsOptions));
    this.app.use(cookieParser())
  }

  start() {

    // Register auth endpoints
    const jsonBodyParser = bodyParser.json()
    this.app.post(process.env.REGISTER_ENDPOINT, jsonBodyParser, registerFn)
    this.app.post(process.env.LOGIN_ENDPOINT, jsonBodyParser, loginFn)

    this.app.use('/', express.static('client'))
    // TODO: remove ?
    this.app.get('/doc/:docid', (req, res) => {
      res.sendFile(path.join(path.resolve(), 'client/index.html'))
    })

    this.server.listen(this.port, () => {
      console.log('listening on *:' + this.port)
    })

    // Map userId: Int => {users: List[socket]}
    this.docs = {}

    this.io.on('connection', (socket) => {
      let ip = socket.conn.remoteAddress.replace('::ffff:', '')
      let userId = Math.random()
      let docId
      let canWrite = true

      socket.on('disconnect', () => {
        if (!docId)
          return

        for (let u of this.docs[docId].users)
          if (u != socket)
            u.emit('collaborator', userId, null, null)

        this.docs[docId].users = this.docs[docId].users.filter(u => u != socket)
        console.log(`[${new Date().toLocaleString()}] ${ip} stopped drawing on ${docId}, ${this.docs[docId].users.length} users remaining`)
      })

      socket.on('new stroke', (stroke) => {
        console.log(`[${new Date().toLocaleString()}] ${ip} is drawing on /doc/${docId}`)

        if (!docId)
          return

        for (let u of this.docs[docId].users)
          if (u != socket)
            u.emit('load strokes', [stroke])

        if (!canWrite)
          return
        
        QueryAllDB('data', 'notes', { id: docId }, { id: 1 }, response => {
          if (response.length)
            UpdateDB('data', 'notes', { id: docId }, { $push: { 'strokes': stroke } } )
          else
            InsertDB('data', 'notes', { id: docId, strokes: [stroke] })
        })
      })

      socket.on('undo stroke', () => {
        if (!docId)
          return

        console.log(`[${new Date().toLocaleString()}] ${ip} is undoing on /doc/${docId}`)

        if (docId == '' || !canWrite)
          return

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
        
        if (docId == 'demo')
          canWrite = false
        if (docId == 'secret_demo_page')
          docId = 'demo'

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

        for (let u of this.docs[docId].users)
          if (u != socket)
            u.emit('collaborator', userId, pointer, activeStroke)
      })
    })
  }
}

module.exports = Server