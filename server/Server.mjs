import express from "express";
import { createServer } from "http";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { Server as SocketServer } from "socket.io";
import mongoose from "mongoose";

import dotend from "dotenv";
dotend.config();

import { UpdateDB, QueryDB, QueryAllDB, InsertDB } from "./Database.mjs";
import { register as registerFn, login as loginFn } from "./Authentication.mjs";
import { createFileFn, editFileFn, getFilesFn, moveFilesFn, removeFilesFn } from "./FileExplorer.mjs";

class Server {
  constructor(port = 8080) {
    mongoose.connect(process.env.MONGO_URI);

    this.port = port;
    this.app = express();
    this.app.disable("x-powered-by");
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
    const corsOptions = {
      origin: "*",
      credentials: true, //access-control-allow-credentials:true
      optionSuccessStatus: 200,
    };
    this.app.use(cors(corsOptions));
    this.app.use(cookieParser());
  }

  start() {
    this.server.listen(this.port, () => {
      console.log("listening on *:" + this.port);
    });

    this.registerEndpoints();
    this.startSocketServer();
  }

  registerEndpoints() {
    const jsonBodyParser = bodyParser.json();
    this.app.post("/api/auth/register", jsonBodyParser, registerFn);
    this.app.post("/api/auth/login", jsonBodyParser, loginFn);
    this.app.post("/api/explorer/getfiles", jsonBodyParser, getFilesFn);
    this.app.post("/api/explorer/addfile", jsonBodyParser, createFileFn);
    this.app.post('/api/explorer/editfile', jsonBodyParser, editFileFn)
    this.app.post("/api/explorer/removefiles", jsonBodyParser, removeFilesFn)
    this.app.post("/api/explorer/movefiles", jsonBodyParser, moveFilesFn)
  }

  startSocketServer() {
    // Map userId: Int => {users: List[socket]}
    this.docs = {};

    this.io.on("connection", socket => {
      const user = {
        ip: socket.conn.remoteAddress.replace("::ffff:", ""),
        id: Math.random().toString(36).slice(2),
        canWrite: true,
        socket: socket,
      };

      socket.emit("userId", user.id);

      socket.on("disconnect", () => {
        if (!user.docId) {
          return;
        }

        for (let other of this.docs[user.docId].users) {
          if (other != user) {
            other.socket.emit(`collaborator remove ${user.id}`);
          }
        }

        this.docs[user.docId].users = this.docs[user.docId].users.filter(u => u != socket);
        console.log(
          `[${new Date().toLocaleString()}] ${user.ip} stopped drawing on ${user.docId}, ${
            this.docs[user.docId].users.length
          } users remaining`
        );
      });

      socket.on("remove stroke", id => {
        if (!user.docId || !user.canWrite || typeof id != "string") {
          return;
        }

        for (let other of this.docs[user.docId].users) {
          if (other != user) {
            other.socket.emit("unload strokes", [id]);
          }
        }

        UpdateDB("data", "notes", { id: user.docId }, { $pull: { strokes: { id: id } } });
      });

      socket.on("new stroke", stroke => {
        try {
          console.log(`[${new Date().toLocaleString()}] ${user.ip} is drawing on /doc/${user.docId}`);

          if (!user.docId) {
            return;
          }

          const [uId, sId] = stroke.id.split("-");

          if (uId != user.id) {
            console.log(`Invalid stroke on ${user.docId}. User id = ${user.id} (received ${uId})`);
            return;
          }

          for (let other of this.docs[user.docId].users) {
            if (other != user) {
              other.socket.emit("load strokes", [stroke]);
            }
          }

          if (!user.canWrite) {
            return;
          }

          QueryAllDB("data", "notes", { id: user.docId }, { id: 1 }, response => {
            if (response.length) {
              UpdateDB("data", "notes", { id: user.docId }, { $push: { strokes: stroke } });
            } else {
              InsertDB("data", "notes", { id: user.docId, strokes: [stroke] });
            }
          });
        } catch (e) {
          console.log(e);
        }
      });

      socket.on("request document", id => {
        if (user.docId) {
          return;
        }

        user.docId = id;
        console.log(`[${new Date().toLocaleString()}] ${user.ip} started drawing on /doc/${user.docId}`);

        if (!this.docs[id]) {
          this.docs[id] = {
            users: [user],
          };
        } else {
          this.docs[id].users.push(user);
        }

        if (user.docId == "demo") {
          user.canWrite = false;
        }
        if (user.docId == "secret_demo_page") {
          user.docId = "demo";
        }

        // Inform existing collaborators about new collaborator, and vice versa
        for (let other of this.docs[user.docId].users) {
          if (other != user) {
            other.socket.emit("new collaborator", user.id);
            user.socket.emit("new collaborator", other.id);
          }
        }

        QueryAllDB("data", "notes", { id: user.docId }, {}, result => {
          if (!result.length) {
            socket.emit("load strokes", [], user.id);
          } else {
            socket.emit("load strokes", result[0].strokes, user.id);
          }
        });
      });

      // LIVE COLLABORATION

      socket.on("update pointer", pointer => {
        if (!user.docId || !this.docs[user.docId]) return;

        for (let other of this.docs[user.docId].users) {
          if (other != user) {
            other.socket.emit(`collaborator pointer ${user.id}`, pointer);
          }
        }
      });

      socket.on("update input", (x, y, p, t) => {
        if (!user.docId || !this.docs[user.docId]) return;

        for (let other of this.docs[user.docId].users) {
          if (other != user) {
            other.socket.emit(`collaborator input ${user.id}`, x, y, p, t);
          }
        }
      });

      socket.on("update tool", tool => {
        if (!user.docId || !this.docs[user.docId]) return;

        for (let other of this.docs[user.docId].users) {
          if (other != user) {
            other.socket.emit(`collaborator tool ${user.id}`, tool);
          }
        }
      });
    });
  }
}

export default Server;
