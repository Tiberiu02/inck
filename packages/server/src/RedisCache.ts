import { Tedis, TedisPool } from "tedis";
import { Stroke } from "./BackendInterfaces";
import avro from "avsc";
import { StrokeAvroSchema } from "./AvroSchemas";
import { NoteModel } from "./db/Models";
import { Timer } from "./Timer";
import { logEvent } from "./logging/AppendAnalytics";

export class RedisCache {
  private client?: Tedis;
  private tedisPool: TedisPool;
  private cacheFlushDelay: number;
  // Used before in case anything gets cached before redis is connected
  private strokeQueue: any;
  // Getting it automatically with avro.types.fromValue doesnt work because it infers wrong type for RGB field
  private avroSchema: any;

  constructor(host: string, port: number, cacheFlushDelay: number) {
    this.cacheFlushDelay = cacheFlushDelay;
    this.avroSchema = avro.Type.forSchema(StrokeAvroSchema);

    this.tedisPool = new TedisPool({ host, port });
    this.tedisPool.getTedis().then((client: Tedis) => {
      this.client = client;
      console.log("Connected to Redis");
      this.strokeQueue.forEach((e: any) => {
        const [docId, stroke] = e;
        this.putStrokeInRedis(docId, stroke);
      });
    });
    this.strokeQueue = [];

    setInterval(() => {
      if (this.client) {
        this.writeAllToDB();
      }
    }, cacheFlushDelay);
  }

  async putStroke(docId: string, stroke: Stroke) {
    if (!this.client) {
      this.strokeQueue.push([docId, stroke]);
    } else {
      this.putStrokeInRedis(docId, stroke);
    }
  }

  async getAllStrokes(docId: string) {
    const allStrokes: { [id: string]: string } = await this.client.hgetall(docId);
    const parsedStrokes: { [id: string]: Stroke } = {};
    for (const [key, value] of Object.entries(allStrokes)) {
      const buffer = Buffer.from(value, "base64");
      const stroke = this.avroSchema.fromBuffer(buffer);
      parsedStrokes[key] = stroke;
    }

    return parsedStrokes;
  }

  private async writeAllToDB() {
    const timer = new Timer();
    const allKeys = await this.client.keys("*");
    console.log(allKeys);
    const flushedCount = allKeys.length;

    for (const key of allKeys) {
      await this.writeDocStrokesToDB(key);
    }
    logEvent("flush_redis_to_db", {
      executionTime: timer.elapsed().toString(),
      flushedCount,
    });
    console.log(`Flushed ${flushedCount} notes to DB`);
  }

  private async writeDocStrokesToDB(docId: string) {
    const allStrokes = await this.getAllStrokes(docId);
    const updateObject = {};

    for (const stroke of Object.values(allStrokes)) {
      updateObject[`strokes.${stroke.id}`] = stroke;
    }

    await NoteModel.updateOne({ id: docId }, { $set: updateObject });
    await this.client.del(docId);
  }

  private async putStrokeInRedis(docId: string, stroke: Stroke) {
    const key = stroke.id;
    if (stroke.deserializer == "removed") {
      // TODO: fix cache
      stroke.color = [];
      stroke.data = [];
      stroke.zIndex = 0.0;
      stroke.width = 0.0;
    }

    // Get previous entry from redis
    // TODO: could factor serdes when more things are in redis
    const prevEntryB64 = await this.client.hget(docId, stroke.id);

    if (prevEntryB64) {
      const prevEntryBuffer = Buffer.from(prevEntryB64, "base64");
      const prevEntry = this.avroSchema.fromBuffer(prevEntryBuffer);
    } else {
    }

    try {
      const buffer = this.avroSchema.toBuffer(stroke);
      const value = buffer.toString("base64");
      await this.client.hset(docId, key, value);
    } catch (e) {
      console.log(e);
      console.log("error", stroke);
    }
  }
}
