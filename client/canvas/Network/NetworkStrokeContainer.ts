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

export class NetworkStrokeContainer implements LayeredStrokeContainer {
  private baseCanvas: LayeredStrokeContainer;
  private network: NetworkConnection;
  private collabs: { [id: number]: Collaborator };
  private collabsContainer: HTMLDivElement;

  private localStorage: { [id: string]: SerializedGraphic };

  constructor(baseCanvas: LayeredStrokeContainer, network: NetworkConnection) {
    this.baseCanvas = baseCanvas;
    this.network = network;
    this.localStorage = {};

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
        if (!this.localStorage[stroke.id] || this.localStorage[stroke.id].timestamp < stroke.timestamp) {
          this.localStorage[stroke.id] = stroke;
          const deserializedGraphic = DeserializeGraphic(stroke);
          if (deserializedGraphic) {
            this.baseCanvas.add(deserializedGraphic);
          }
        }
      }

      for (const stroke of Object.values(this.localStorage)) {
        if (!strokesDict[stroke.id] || strokesDict[stroke.id].timestamp < this.localStorage[stroke.id].timestamp) {
          network.emit("new stroke", stroke);
        }
      }

      document.getElementById("note-spinner").style.display = "none";
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

        this.localStorage[stroke.id] = stroke;
      }

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
  }

  add(graphic: PersistentGraphic): void {
    // Timestamp all strokes added by the user
    graphic = { ...graphic, timestamp: Date.now() };

    const serializedGraphic = SerializeGraphic(graphic);
    this.localStorage[graphic.id] = serializedGraphic;
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
}
