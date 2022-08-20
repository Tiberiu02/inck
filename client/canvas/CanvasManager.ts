import { Graphic, PersistentGraphic } from "./Drawing/Graphic";

export interface CanvasManager {
  add(graphic: PersistentGraphic): void;
  remove(id: string): boolean;
  getAll(): PersistentGraphic[];
  addForNextRender(graphic: Graphic): void;
  render(): void;
}
