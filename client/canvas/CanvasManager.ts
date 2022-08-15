import { Drawable } from "./Drawing/Drawable";

export interface CanvasManager {
  add(drawable: Drawable): void;
  remove(id: string): boolean;
  getAll(): Drawable[];
  addForNextRender(drawable: Drawable): void;
  render(): void;
}
