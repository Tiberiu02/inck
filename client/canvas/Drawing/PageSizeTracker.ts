import { CanvasManager } from "../CanvasManager";
import { MutableObservableProperty } from "../DesignPatterns/Observable";
import { Drawable } from "./Drawable";

export class PageSizeTracker implements CanvasManager {
  private canvas: CanvasManager;
  private yMax: MutableObservableProperty<number>;

  constructor(canvas: CanvasManager, yMax: MutableObservableProperty<number>) {
    this.canvas = canvas;
    this.yMax = yMax;
  }

  add(drawable: Drawable): void {
    this.yMax.set(Math.max(this.yMax.get(), drawable.geometry.boundingBox.yMax));
    this.canvas.add(drawable);
  }

  remove(id: string): boolean {
    return this.canvas.remove(id);
  }
  getAll(): Drawable[] {
    return this.canvas.getAll();
  }
  addForNextRender(drawable: Drawable): void {
    this.canvas.addForNextRender(drawable);
  }
  render(): void {
    this.canvas.render();
  }
}
