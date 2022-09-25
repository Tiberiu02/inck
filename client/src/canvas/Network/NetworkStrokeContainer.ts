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

const CACHING_INTERVAL = 5000;

function LoadCachedNote(noteId: string) {
  const cache = window.localStorage && window.localStorage.getItem(`note-cache-${noteId}`);
  return cache ? JSON.parse(cache) : {};
}

function UpdateCachedNote(noteId: string, data: any) {
  if (window.localStorage) {
    window.localStorage.setItem(`note-cache-${noteId}`, JSON.stringify(data));
  }
}

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

    this.strokes = LoadCachedNote(network.docId);
    console.log("storage", this.strokes);
    for (const stroke of Object.values(this.strokes)) {
      baseCanvas.add(DeserializeGraphic(stroke));
    }
    this.cacheIsUpToDate = true;

    document.getElementById("note-spinner").style.display = "flex";

    network.on("load note", (data: NoteData) => {
      console.log("loaded note", data);

      // TO DO: initialize strokesDict with data.strokes after DB redesign
      const strokesDict: { [id: string]: SerializedGraphic } = {};
      const strokes = data.strokes.filter((s) => s.timestamp).sort((a, b) => a.timestamp - b.timestamp);
      for (let stroke of strokes) {
        if (stroke && stroke.id) {
          strokesDict[stroke.id] = stroke;
        }
      }

      for (let stroke of Object.values(strokesDict)) {
        if (!this.strokes[stroke.id] || this.strokes[stroke.id].timestamp < stroke.timestamp) {
          this.strokes[stroke.id] = stroke;
          const deserializedGraphic = DeserializeGraphic(stroke);
          if (deserializedGraphic) {
            this.baseCanvas.add(deserializedGraphic);
          }
        }
      }

      for (const stroke of Object.values(this.strokes)) {
        if (!strokesDict[stroke.id] || strokesDict[stroke.id].timestamp < this.strokes[stroke.id].timestamp) {
          network.emit("new stroke", stroke);
        }
      }

      document.getElementById("note-spinner").style.display = "none";
      this.cacheIsUpToDate = false;
      RenderLoop.scheduleRender();
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

  render(layerIndex: number): void {
    this.baseCanvas.render(layerIndex);

    for (let c of Object.values(this.collabs)) {
      c.render(layerIndex);
    }
  }

  private updateCache() {
    if (!this.cacheIsUpToDate) {
      this.cacheIsUpToDate = true;
      UpdateCachedNote(this.network.docId, this.strokes);
    }
  }
}
