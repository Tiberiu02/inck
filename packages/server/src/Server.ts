import express, { Express } from "express";
import { createServer, Server as HTTPServer } from "http";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { Server as SocketServer, Socket as WebSocket } from "socket.io";
import mongoose from "mongoose";
import fileupload from "express-fileupload";
import { ApiUrlStrings } from "../../common-types/ApiUrlStrings";

import dotenv from "dotenv";
dotenv.config();

import {
  register as registerFn,
  login as loginFn,
  initializeResetPasswordUsingEmail,
  initializeResetPasswordUsingToken,
  changePasswordEndpoint,
  getAccountDetailsFromToken,
} from "./api/Authentication";
import { disconnect, newStroke, requestDocument, remoteControl, directedRemoteControl } from "./Sockets";
import { NoteModel } from "./db/Models";
import { getPDF, receivePDF } from "./api/Pdf";
import { DrawingUser, DrawnDocument } from "./BackendInterfaces";
import { API } from "./api/index";
import { RedisCache } from "./RedisCache";

const MILLIS_PER_WEEK = 604800000;
const MILLIS_PER_DAY = 86400000;

export class Server {
  port: number;
  app: Express;
  server: HTTPServer;
  io: SocketServer;
  docs: { [id: string]: DrawnDocument };
  cache: RedisCache;

  constructor(port = 8080) {
    // Check env is correct
    const { MONGO_URI, REDIS_URI, REDIS_PORT, CACHE_FLUSH_EVERY } = process.env;
    if (!MONGO_URI || !REDIS_URI || !REDIS_PORT || !CACHE_FLUSH_EVERY) {
      throw Error("Missing fields in .env file");
    }
    mongoose.connect(MONGO_URI);

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
    this.cache = new RedisCache(REDIS_URI, parseInt(REDIS_PORT), parseInt(CACHE_FLUSH_EVERY));

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

    this.buildRestApi(API, "/api");

    this.app.post("/api/auth/register", jsonBodyParser, registerFn);
    this.app.post("/api/auth/login", jsonBodyParser, loginFn);

    this.app.post("/api/settings/account-details", jsonBodyParser, getAccountDetailsFromToken);
    // Request a password change (send email, save request in db, etc)
    this.app.post("/api/auth/reset-password-with-token", jsonBodyParser, initializeResetPasswordUsingToken);
    this.app.post("/api/auth/reset-password-with-email", jsonBodyParser, initializeResetPasswordUsingEmail);
    this.app.post("/api/auth/change-password", jsonBodyParser, changePasswordEndpoint);

    // PDF uploading/serving stuff
    this.app.post(ApiUrlStrings.POST_PDF, fileuploadParser, receivePDF);
    this.app.get(`${ApiUrlStrings.GET_PDF}/:pdfName.pdf`, getPDF);
  }

  buildRestApi(handler: any, path: string) {
    if (typeof handler == "object") {
      for (const name in handler) {
        this.buildRestApi(handler[name], `${path}/${name}`);
      }
    } else {
      this.app.post(path, bodyParser.json(), async (req, res) => {
        try {
          console.log(req.body);
          const params: any[] = req.body; //JSON.parse(req.body);
          const result = await handler(...params);
          res.status(200).send({ result });
        } catch (err) {
          console.log(err);
          res.status(400).send({ error: err.message });
        }
      });
    }
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

      requestDocument(user, this.docs, socket, this.cache)(docId as string);
      socket.emit("userId", user.id);

      socket.on("disconnect", disconnect(user, this.docs, socket));
      socket.on("new stroke", newStroke(user, this.docs, socket, this.cache));

      // LIVE COLLABORATION
      socket.on("remote control", remoteControl(user, this.docs, socket));
      socket.on("directed remote control", directedRemoteControl(user, this.docs, socket));
    });
  }
}
