import { PersistentGraphic } from "./Drawing/Graphic";

export interface LayeredStrokeContainer {
  add(graphic: PersistentGraphic): void;
  getAll(): PersistentGraphic[];
  render(layerIndex: number, opacity?: number): void;
}
