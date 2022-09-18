import { LayeredStrokeContainer } from "../LayeredStrokeContainer";
import { MutableObservableProperty } from "../DesignPatterns/Observable";
import { Graphic, PersistentGraphic } from "./Graphic";

export class PageSizeTracker implements LayeredStrokeContainer {
  private canvas: LayeredStrokeContainer;
  private yMax: MutableObservableProperty<number>;

  constructor(canvas: LayeredStrokeContainer, yMax: MutableObservableProperty<number>) {
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
  render(layerRendered: number): void {
    this.canvas.render(layerRendered);
  }
}
