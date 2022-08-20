import { CanvasManager } from "../CanvasManager";
import { MutableObservableProperty } from "../DesignPatterns/Observable";
import { Graphic, PersistentGraphic } from "./Graphic";

export class PageSizeTracker implements CanvasManager {
  private canvas: CanvasManager;
  private yMax: MutableObservableProperty<number>;

  constructor(canvas: CanvasManager, yMax: MutableObservableProperty<number>) {
    this.canvas = canvas;
    this.yMax = yMax;
  }

  add(graphic: PersistentGraphic): void {
    this.yMax.set(Math.max(this.yMax.get(), graphic.geometry.boundingBox.yMax));
    this.canvas.add(graphic);
  }

  remove(id: string): boolean {
    return this.canvas.remove(id);
  }
  getAll(): PersistentGraphic[] {
    return this.canvas.getAll();
  }
  addForNextRender(graphic: Graphic): void {
    this.canvas.addForNextRender(graphic);
  }
  render(): void {
    this.canvas.render();
  }
}
