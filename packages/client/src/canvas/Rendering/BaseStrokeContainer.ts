import { Graphic, GraphicTypes, PersistentGraphic } from "../Drawing/Graphic";
import { PersistentVectorGraphic, VectorGraphic } from "../Drawing/VectorGraphic";
import { ELEMENTS_PER_VERTEX, GL } from "./GL";
import { LayeredStrokeContainer } from "../LayeredStrokeContainer";
import { RenderLoop } from "./RenderLoop";
import { View } from "../View/View";

export const BUFFER_SIZE = 5e4;

class StrokeBuffer {
  private array: number[];
  private buffer: WebGLBuffer;
  private synced: boolean;
  private strokes: { id: string; size: number }[];

  constructor() {
    this.array = [];
    this.buffer = GL.vectorProgram.createBuffer();
    this.synced = false;
    this.strokes = [];
  }

  canAdd(array: number[]): boolean {
    return this.array.length + array.length <= BUFFER_SIZE;
  }

  add(id: string, array: number[]): void {
    [].push.apply(this.array, array);
    this.synced = false;
    this.strokes.push({ id, size: array.length });
  }

  remove(id: string): boolean {
    let start = 0;
    let index = 0;
    while (index < this.strokes.length && this.strokes[index].id !== id) {
      start += this.strokes[index].size;
      index += 1;
    }

    if (index == this.strokes.length) {
      return false;
    }

    this.array.splice(start, this.strokes[index].size);
    this.strokes.splice(index, 1);
    this.synced = false;

    return true;
  }

  render(): void {
    // GL.vectorProgram.bindVAO();

    GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, this.buffer);
    if (!this.synced) {
      GL.ctx.bufferData(GL.ctx.ARRAY_BUFFER, new Float32Array(this.array), GL.ctx.STREAM_DRAW);
      this.synced = true;
    }
    GL.vectorProgram.drawVector(this.array, View.instance.getTransformMatrix(), this.buffer);
  }

  isEmpty(): boolean {
    return this.array.length == 0;
  }
}

class StrokeCluster {
  private buffers: StrokeBuffer[];
  private strokeLocation: { [id: string]: StrokeBuffer };

  constructor() {
    this.buffers = [];
    this.strokeLocation = {};
  }

  addStroke(id: string, array: number[]) {
    if (this.buffers.length && this.buffers[this.buffers.length - 1].canAdd(array)) {
      const buffer = this.buffers[this.buffers.length - 1];
      buffer.add(id, array);
      this.strokeLocation[id] = buffer;
    } else {
      const buffer = new StrokeBuffer();
      buffer.add(id, array);
      this.buffers.push(buffer);
      this.strokeLocation[id] = buffer;
    }
  }

  removeStroke(id: string): boolean {
    const buffer = this.strokeLocation[id];

    if (!buffer) return false;

    const status = buffer.remove(id);
    if (buffer.isEmpty()) {
      this.buffers = this.buffers.filter((b) => b != buffer);
    }
    return status;
  }

  render() {
    for (const buffer of this.buffers) {
      buffer.render();
    }
  }
}

export class BaseStrokeContainer implements LayeredStrokeContainer {
  private layers: StrokeCluster[];
  private strokes: { [id: string]: PersistentVectorGraphic };

  constructor(numLayers: number) {
    this.layers = [...Array(numLayers)].map((_) => new StrokeCluster());
    this.strokes = {};
  }

  add(graphic: PersistentGraphic): void {
    if (this.strokes[graphic.id]) {
      this.remove(graphic.id);
    }
    if (graphic.graphic.type == GraphicTypes.VECTOR) {
      const vectorGraphic = graphic.graphic as VectorGraphic;
      this.strokes[graphic.id] = graphic as PersistentVectorGraphic;
      this.layers[vectorGraphic.zIndex].addStroke(graphic.id, vectorGraphic.vector);
    }
    RenderLoop.scheduleRender();
  }

  private remove(id: string): boolean {
    if (this.strokes[id] == undefined) {
      return false;
    }
    const zIndex = this.strokes[id].zIndex;
    delete this.strokes[id];

    const result = this.layers[zIndex].removeStroke(id);
    if (result) {
      RenderLoop.scheduleRender();
    }

    return result;
  }

  getAll(): PersistentGraphic[] {
    return Object.values(this.strokes);
  }

  render(layerIndex: number): void {
    this.layers[layerIndex].render();
  }
}
