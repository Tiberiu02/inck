import { LayeredStrokeContainer } from "../LayeredStrokeContainer";
import { RenderLoop } from "../Rendering/RenderLoop";
import { NetworkConnection } from "./NetworkConnection";
import {
  PersistentGraphic,
  SerializedGraphic,
  SerializeGraphic,
  DeserializeGraphic,
  RemovedGraphic,
} from "../Drawing/Graphic";
import { Collaborator } from "./Collaborator";
import { NoteData } from "../../types/canvas";
import { LocalStorage } from "../../LocalStorage";

const CACHING_INTERVAL = 1000;

export class NetworkStrokeContainer implements LayeredStrokeContainer {
  private baseCanvas: LayeredStrokeContainer;
  private network: NetworkConnection;
  private collabs: { [id: number]: Collaborator };
  private collabsContainer: HTMLDivElement;

  private strokes: { [id: string]: SerializedGraphic };
  private cacheIsUpToDate: boolean;

  constructor(baseCanvas: LayeredStrokeContainer, network: NetworkConnection) {
    this.baseCanvas = baseCanvas;
    this.network = network;

    this.strokes = LocalStorage.loadCachedNote(network.docId);
    console.log("storage", this.strokes);
    for (const stroke of Object.values(this.strokes)) {
      baseCanvas.add(DeserializeGraphic(stroke));
    }
    this.cacheIsUpToDate = true;

    document.getElementById("note-spinner").style.display = "flex";

    network.on("load note", (data: NoteData) => {
      console.log("loaded note", data);

      const receivedStrokes = data.strokes;

      for (const stroke of Object.values(this.strokes)) {
        if (stroke.timestamp < data.creationDate) {
          this.baseCanvas.add(RemovedGraphic(stroke.id));
          delete this.strokes[stroke.id];
        }
      }

      for (const stroke of Object.values(this.strokes)) {
        if (!receivedStrokes[stroke.id] || receivedStrokes[stroke.id].timestamp < this.strokes[stroke.id].timestamp) {
          network.emit("new stroke", stroke);
        }
      }

      for (let stroke of Object.values(receivedStrokes)) {
        if (!this.strokes[stroke.id] || this.strokes[stroke.id].timestamp < stroke.timestamp) {
          this.strokes[stroke.id] = stroke;
          const deserializedGraphic = DeserializeGraphic(stroke);
          if (deserializedGraphic) {
            this.baseCanvas.add(deserializedGraphic);
          }
        }
      }

      document.getElementById("note-spinner").style.display = "none";
      LocalStorage.removeCachedNote(network.docId);
      this.cacheIsUpToDate = false;
      RenderLoop.scheduleRender();
    });

    network.on("disconnect", () => {
      this.cacheIsUpToDate = false;
    });

    network.on("load strokes", (data: SerializedGraphic[]) => {
      console.log("loaded strokes", data);

      for (let stroke of data) {
        if (!stroke) continue;

        const deserializedStroke = DeserializeGraphic(stroke);
        if (deserializedStroke) {
          this.baseCanvas.add(deserializedStroke);
        }

        this.strokes[stroke.id] = stroke;
      }

      this.cacheIsUpToDate = false;

      RenderLoop.scheduleRender();
    });

    this.collabsContainer = document.createElement("div");
    Object.assign(this.collabsContainer.style, {
      width: "100vw",
      height: "100vh",
      overflow: "none",
      "pointer-events": "none",

      position: "absolute",
      top: "0px",
      left: "opx",
    });
    document.body.appendChild(this.collabsContainer);

    this.collabs = {};

    this.network.on("new collaborator", (id: string) => {
      this.collabs[id] = new Collaborator(id, this.collabsContainer, baseCanvas);

      this.network.on(`collaborator update ${id}`, (method: string, ...args: any[]) => {
        this.collabs[id][method](...args);
      });
      this.network.on(`collaborator remove ${id}`, () => {
        this.collabs[id].remove();
        delete this.collabs[id];
        RenderLoop.scheduleRender();
      });
    });

    setInterval(() => this.updateCache(), CACHING_INTERVAL);
  }

  add(graphic: PersistentGraphic): void {
    // Timestamp all strokes added by the user
    graphic = { ...graphic, timestamp: Date.now() };

    const serializedGraphic = SerializeGraphic(graphic);
    this.strokes[graphic.id] = serializedGraphic;
    this.cacheIsUpToDate = false;
    this.baseCanvas.add(graphic);

    this.network.emit("new stroke", serializedGraphic);
  }

  getAll(): PersistentGraphic[] {
    return this.baseCanvas.getAll();
  }

  render(layerIndex: number, opacity?: number): void {
    this.baseCanvas.render(layerIndex, opacity);

    for (let c of Object.values(this.collabs)) {
      c.render(layerIndex);
    }
  }

  private updateCache() {
    if (!this.cacheIsUpToDate) {
      if (!this.network.isConnected()) {
        LocalStorage.updateCachedNote(this.network.docId, this.strokes);
      }
      this.cacheIsUpToDate = true;
    }
  }
}
