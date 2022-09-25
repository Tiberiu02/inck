import express, { Express } from "express";
import { createServer, Server as HTTPServer } from "http";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { Server as SocketServer, Socket as WebSocket } from "socket.io";
import mongoose from "mongoose";
import fileupload from "express-fileupload";

import dotenv from "dotenv";
dotenv.config();

import {
  register as registerFn,
  login as loginFn,
  initializeResetPasswordUsingEmail,
  initializeResetPasswordUsingToken,
  changePasswordEndpoint,
} from "./api/Authentication.js";
import {
  createFileFn,
  editFileFn,
  getAccountDetailsFromToken,
  getFilesFn,
  importFreeNote,
  moveFilesFn,
  removeFilesFn,
} from "./api/FileExplorer.js";
import {
  disconnect,
  newStroke,
  removeStroke,
  requestDocument,
  remoteControl,
  directedRemoteControl,
} from "./Sockets.js";
import { NoteModel } from "./db/Models.js";
import { getPDF, receivePDF } from "./api/Pdf.js";
import { DrawingUser, DrawnDocument } from "./BackendInterfaces.js";

const MILLIS_PER_WEEK = 604800000;
const MILLIS_PER_DAY = 86400000;

export class Server {
  port: number;
  app: Express;
  server: HTTPServer;
  io: SocketServer;
  docs: { [id: string]: DrawnDocument };

  constructor(port = 8080) {
    mongoose.connect(process.env.MONGO_URI || "");

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
    this.docs = {};

    const corsOptions = {
      origin: "*",
      credentials: true, //access-control-allow-credentials:true
      optionSuccessStatus: 200,
    };
    this.app.use(cors(corsOptions));
    this.app.use(cookieParser());

    // Start automatic collection of old notes
    setInterval(async () => this.removeOutdatedNotes(), MILLIS_PER_DAY);
  }

  start() {
    this.server.listen(this.port, () => {
      console.log("listening on *:" + this.port);
    });

    this.registerEndpoints();
    this.startSocketServer();
  }

  async removeOutdatedNotes() {
    console.log("Collecting two weeks old notes");
    const now = Date.now();
    const minTime = now - 2 * MILLIS_PER_WEEK;
    await NoteModel.deleteMany({
      isFreeNote: true,
      creationDate: { $lte: minTime },
    });
  }

  registerEndpoints() {
    const jsonBodyParser = bodyParser.json();
    const fileuploadParser = fileupload();
    this.app.post("/api/auth/register", jsonBodyParser, registerFn);
    this.app.post("/api/auth/login", jsonBodyParser, loginFn);

    this.app.post("/api/explorer/getfiles", jsonBodyParser, getFilesFn);
    this.app.post("/api/explorer/addfile", jsonBodyParser, createFileFn);
    this.app.post("/api/explorer/editfile", jsonBodyParser, editFileFn);
    this.app.post("/api/explorer/removefiles", jsonBodyParser, removeFilesFn);
    this.app.post("/api/explorer/movefiles", jsonBodyParser, moveFilesFn);
    this.app.post("/api/explorer/import-free-note", jsonBodyParser, importFreeNote);

    this.app.post("/api/settings/account-details", jsonBodyParser, getAccountDetailsFromToken);
    // Request a password change (send email, save request in db, etc)
    this.app.post("/api/auth/reset-password-with-token", jsonBodyParser, initializeResetPasswordUsingToken);
    this.app.post("/api/auth/reset-password-with-email", jsonBodyParser, initializeResetPasswordUsingEmail);
    this.app.post("/api/auth/change-password", jsonBodyParser, changePasswordEndpoint);

    // PDF loading/serving stuff
    this.app.post("/api/pdf/receive-pdf", fileuploadParser, receivePDF);
    this.app.get("/api/pdf/get-pdf/:pdfName.pdf", getPDF);
  }

  startSocketServer() {
    // Map docId: Int => {users: List[socket]}

    this.io.on("connection", async (socket) => {
      console.log("Connection incoming");
      const { authToken, docId } = socket.handshake.query;
      const ip = socket.conn.remoteAddress.replace("::ffff:", "");
      const id = Math.random().toString(36).slice(2);

      const user: DrawingUser = {
        ip,
        id,
        docId: undefined,
        canWrite: false,
        authToken: authToken as string,
        socket,
      };

      requestDocument(user, this.docs, socket)(docId as string);
      socket.emit("userId", user.id);

      socket.on("disconnect", disconnect(user, this.docs, socket));
      socket.on("remove stroke", removeStroke(user, this.docs, socket));
      socket.on("new stroke", newStroke(user, this.docs, socket));

      // LIVE COLLABORATION
      socket.on("remote control", remoteControl(user, this.docs, socket));
      socket.on("directed remote control", directedRemoteControl(user, this.docs, socket));
    });
  }
}