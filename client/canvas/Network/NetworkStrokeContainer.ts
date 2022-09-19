import { LayeredStrokeContainer } from "../LayeredStrokeContainer";
import { RenderLoop } from "../Rendering/RenderLoop";
import { NetworkConnection } from "./NetworkConnection";
import { PersistentGraphic, SerializedGraphic, SerializeGraphic, DeserializeGraphic } from "../Drawing/Graphic";
import { Collaborator } from "./Collaborator";

export class NetworkStrokeContainer implements LayeredStrokeContainer {
  private baseCanvas: LayeredStrokeContainer;
  private network: NetworkConnection;
  private collabs: { [id: number]: Collaborator };
  private collabsContainer: HTMLDivElement;

  constructor(baseCanvas: LayeredStrokeContainer, network: NetworkConnection) {
    this.baseCanvas = baseCanvas;
    this.network = network;

    document.getElementById("note-spinner").style.display = "flex";

    network.on("userId", (userId: string) => {
      window.userId = userId;
    });

    network.on("load note", (data: any) => {
      console.log("loaded note", data);

      for (let s of data.strokes) {
        if (!s) continue;

        const stroke = DeserializeGraphic(s);
        if (stroke) {
          this.baseCanvas.add(stroke);
        }
      }

      document.getElementById("note-spinner").style.display = "none";
      RenderLoop.scheduleRender();
    });

    network.on("load strokes", (data: SerializedGraphic[]) => {
      console.log("loaded strokes", data);

      for (let s of data) {
        if (!s) continue;

        const stroke = DeserializeGraphic(s);
        if (stroke) {
          this.baseCanvas.add(stroke);
        }
      }

      RenderLoop.scheduleRender();
    });

    network.on("unload strokes", (ids: string[]) => {
      ids.forEach(id => this.baseCanvas.remove(id));
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
    this.baseCanvas.add(graphic);
    this.network.emit("new stroke", SerializeGraphic(graphic));
  }

  remove(id: string): boolean {
    this.network.emit("remove stroke", id);
    return this.baseCanvas.remove(id);
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
