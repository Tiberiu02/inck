import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import bodyParser from "body-parser"
import cookieParser from 'cookie-parser'
import { Server as SocketServer } from 'socket.io'
import mongoose from "mongoose"

import dotend from 'dotenv'
dotend.config()

import { UpdateDB, QueryDB, QueryAllDB, InsertDB } from './Database.mjs'
import { register as registerFn, login as loginFn } from "./Authentication.mjs"
import { createFileFn, getFilesFn } from './FileExplorer.mjs'




class Server {
  constructor(port = 8080) {

    mongoose.connect(process.env.MONGO_URI)

    this.port = port
    this.app = express()
    this.app.disable('x-powered-by');
    this.server = createServer(this.app)
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
    this.server.listen(this.port, () => {
      console.log('listening on *:' + this.port)
    })

    this.registerEndpoints()
    this.startSocketServer()
  }

  registerEndpoints() {
    const jsonBodyParser = bodyParser.json()
    this.app.post('/api/auth/register', jsonBodyParser, registerFn)
    this.app.post('/api/auth/login', jsonBodyParser, loginFn)
    this.app.post('/api/explorer/getfiles', jsonBodyParser, getFilesFn)
    this.app.post('/api/explorer/addfile', jsonBodyParser, createFileFn)
  }

  startSocketServer() {

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

export default Server