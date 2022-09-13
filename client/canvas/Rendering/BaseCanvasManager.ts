import { Graphic, GraphicTypes, PersistentGraphic } from "../Drawing/Graphic";
import { PersistentVectorGraphic, VectorGraphic } from "../Drawing/VectorGraphic";
import { ELEMENTS_PER_VERTEX, GL } from "./GL";
import { CanvasManager } from "../CanvasManager";
import { RenderLoop } from "./RenderLoop";

import { ImageGraphic } from "../Drawing/ImageGraphic";
import { Display } from "../DeviceProps";
import { View } from "../View/View";

export function GetUniforms() {
  return {
    u_Matrix: View.getTransformMatrix(),
  };
}

export const BUFFER_SIZE = 5e4;
export const NUM_LAYERS = 2;

class StrokeBuffer {
  private array: number[];
  private buffer: WebGLBuffer;
  private synced: boolean;
  private strokes: { id: string; size: number }[];

  constructor() {
    this.array = [];
    this.buffer = GL.ctx.createBuffer();
    this.synced = false;
    this.strokes = [];
  }

  canAdd(array: number[]): boolean {
    return this.array.length + array.length <= BUFFER_SIZE;
  }

  add(id: string, array: number[]): void {
    for (const x of array) {
      this.array.push(x);
    }
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
    GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, this.buffer);
    if (!this.synced) {
      GL.ctx.bufferData(GL.ctx.ARRAY_BUFFER, new Float32Array(this.array), GL.ctx.STREAM_DRAW);
      this.synced = true;
    }
    GL.setProgram(GL.mainProgram, GetUniforms());
    GL.ctx.drawArrays(GL.ctx.TRIANGLE_STRIP, 0, this.array.length / ELEMENTS_PER_VERTEX);
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
      this.buffers = this.buffers.filter(b => b != buffer);
    }
    return status;
  }

  render() {
    for (const buffer of this.buffers) {
      buffer.render();
    }
  }
}

export class BaseCanvasManager implements CanvasManager {
  private canvas: HTMLCanvasElement;
  private gl: GL;
  private layers: StrokeCluster[];
  private activeStrokes: Graphic[];
  private strokes: { [id: string]: PersistentVectorGraphic };

  constructor() {
    this.layers = [...Array(NUM_LAYERS)].map(_ => new StrokeCluster());
    this.activeStrokes = [];
    this.strokes = {};
  }

  add(graphic: PersistentGraphic): void {
    if (graphic.graphic.type == GraphicTypes.VECTOR) {
      const vectorGraphic = graphic.graphic as VectorGraphic;
      this.strokes[graphic.id] = graphic as PersistentVectorGraphic;
      this.layers[vectorGraphic.zIndex].addStroke(graphic.id, vectorGraphic.vector);
      RenderLoop.scheduleRender();
    }
  }

  remove(id: string): boolean {
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

  addForNextRender(drawable: Graphic) {
    if (drawable.type == GraphicTypes.VECTOR) {
      this.activeStrokes.push(drawable);
    } else if (drawable.type == GraphicTypes.IMAGE) {
      const image = drawable as ImageGraphic;
      this.activeStrokes.push(image);
    }
  }

  render(): void {
    for (let ix = 0; ix < NUM_LAYERS; ix++) {
      if (ix == 0)
        //continue;
        GL.beginLayer();

      if (this.layers[ix]) {
        this.layers[ix].render();
      }
      this.activeStrokes
        .filter(graphic => graphic.zIndex == ix)
        .forEach(graphic => {
          if (graphic.type == GraphicTypes.VECTOR) {
            const vector = graphic as VectorGraphic;
            GL.renderVector(vector.vector, vector.glUniforms || GetUniforms());
          } else if (graphic.type == GraphicTypes.IMAGE && 0) {
            const image = graphic as ImageGraphic;
            if (image.top + image.height >= View.getTop() && image.top < View.getTop() + View.getHeight()) {
              if (!image.texture) {
                image.texture = GL.createTexture(image.pixels);
              }
              const [x, y] = View.getScreenCoords(image.left, image.top);
              const [w, h] = View.getScreenCoords(image.width, image.height, true);
              const r = window.devicePixelRatio;
              GL.renderTexture(image.texture, w * r, h * r, x * r, y * r);
            } else if (image.texture) {
              GL.ctx.deleteTexture(image.texture);
              image.texture = null;
            }
          }
        });

      if (ix == 0) GL.finishLayer(0.35);
    }

    this.activeStrokes = [];
  }
}
