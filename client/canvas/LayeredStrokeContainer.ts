import { PersistentGraphic } from "./Drawing/Graphic";

export interface LayeredStrokeContainer {
  add(graphic: PersistentGraphic): void;
  remove(id: string): boolean;
  getAll(): PersistentGraphic[];
  render(layerIndex: number): void;
}
