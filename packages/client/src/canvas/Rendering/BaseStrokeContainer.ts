import { Graphic, GraphicTypes, PersistentGraphic } from "../Drawing/Graphic";
import { PersistentVectorGraphic, VectorGraphic } from "../Drawing/VectorGraphic";
import { Layers } from "./GL";
import type { GL } from "./GL";
import { LayeredStrokeContainer } from "../LayeredStrokeContainer";
import { RenderLoop } from "./RenderLoop";
import { View } from "../View/View";
import { Display } from "../DeviceProps";
import { m4, Matrix4 } from "../Math/M4";

export const BUFFER_SIZE = 5e3;

class StrokeBuffer {
  private array: number[];
  private buffer: WebGLBuffer;
  private synced: boolean;
  private strokes: { id: string; size: number }[];
  private gl: GL;

  constructor(gl: GL) {
    this.gl = gl;
    this.array = [];
    this.buffer = this.gl.vectorProgram.createBuffer();
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

  render(transform: Matrix4): void {
    // GL.vectorProgram.bindVAO();

    this.gl.ctx.bindBuffer(this.gl.ctx.ARRAY_BUFFER, this.buffer);
    if (!this.synced) {
      this.gl.ctx.bufferData(this.gl.ctx.ARRAY_BUFFER, new Float32Array(this.array), this.gl.ctx.STREAM_DRAW);
      this.synced = true;
    }
    this.gl.vectorProgram.drawVector(this.array, transform, this.buffer);
  }

  isEmpty(): boolean {
    return this.array.length == 0;
  }
}

// Size of layer cache relative to visible
// A value of 2 means that we draw a rectangle 2 times bigger (in both width and height)
// this is usefull because it allows for scrolling without redrawing every frame
export const LAYER_SIZE = 1.5;

class StrokeCluster {
  private buffers: StrokeBuffer[];
  private strokeLocation: { [id: string]: StrokeBuffer };
  private layerTexture: WebGLTexture; // Strokes are drawn here and only re-drawn on updates
  private redrawnRequired: boolean;
  private gl: GL;
  top: number;
  left: number;
  width: number;
  height: number;
  scale: number;
  viewState: "updating" | "justStabilized" | "stable";

  constructor(gl: GL) {
    this.buffers = [];
    this.strokeLocation = {};
    this.gl = gl;

    this.initLayerTexture();
    window.addEventListener("resize", () => this.initLayerTexture());

    this.viewState = "updating";
    View.instance.onUpdate(() => (this.viewState = "updating"));
  }

  initLayerTexture() {
    if (this.layerTexture) {
      this.gl.ctx.deleteTexture(this.layerTexture);
    }

    const gl = this.gl.ctx;

    this.layerTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.layerTexture);

    // define size and format of level 0
    const level = 0;
    const internalFormat = gl.RGBA;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const data = null;
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      Display.RealWidth,
      Display.RealHeight,
      border,
      format,
      type,
      data
    );

    // set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.redrawnRequired = true;
  }

  drawLayer() {
    console.log("redarwing layer");
    const transform = m4.multiply(
      m4.scaling(1 / LAYER_SIZE, 1 / LAYER_SIZE, 1 / LAYER_SIZE),
      View.instance.getTransformMatrix()
    );
    this.gl.beginLayer();
    for (const buffer of this.buffers) {
      buffer.render(transform);
    }
    this.gl.finishLayer(null);

    this.width = View.instance.getWidth() * LAYER_SIZE;
    this.height = View.instance.getHeight() * LAYER_SIZE;
    this.top = View.instance.getTop() - (View.instance.getHeight() / 2) * (LAYER_SIZE - 1);
    this.left = View.instance.getLeft() - (View.instance.getWidth() / 2) * (LAYER_SIZE - 1);
    this.computeTransform();
  }

  computeTransform() {
    const scale = this.width / LAYER_SIZE / View.instance.getWidth();
    const tx = -((View.instance.getLeft() - this.left - this.width / 2) * scale + this.width / 2) / this.width / scale;
    const ty = -((View.instance.getTop() - this.top - this.height / 2) * scale + this.height / 2) / this.height / scale;
    const txPx = Math.round(tx * Display.Width * LAYER_SIZE * Display.DevicePixelRatio) / Display.DevicePixelRatio;
    const tyPx = Math.round(ty * Display.Height * LAYER_SIZE * Display.DevicePixelRatio) / Display.DevicePixelRatio;
    this.gl.transform = `scale(${scale}) translate(${txPx}px, ${tyPx}px)`;

    this.scale = scale;
  }

  addStroke(id: string, array: number[]) {
    if (this.buffers.length && this.buffers[this.buffers.length - 1].canAdd(array)) {
      const buffer = this.buffers[this.buffers.length - 1];
      buffer.add(id, array);
      this.strokeLocation[id] = buffer;
    } else {
      const buffer = new StrokeBuffer(this.gl);
      buffer.add(id, array);
      this.buffers.push(buffer);
      this.strokeLocation[id] = buffer;
    }

    this.redrawnRequired = true;
  }

  removeStroke(id: string): boolean {
    const buffer = this.strokeLocation[id];

    if (!buffer) return false;

    const status = buffer.remove(id);
    if (buffer.isEmpty()) {
      this.buffers = this.buffers.filter((b) => b != buffer);
    }

    this.redrawnRequired ||= status;

    return status;
  }

  render() {
    if (this.viewState == "updating") {
      if (
        !this.redrawnRequired &&
        this.top <= View.instance.getTop() &&
        this.left <= View.instance.getLeft() &&
        this.top + this.height >= View.instance.getTop() + View.instance.getHeight() &&
        this.left + this.width >= View.instance.getLeft() + View.instance.getWidth()
      ) {
        this.computeTransform();
      } else {
        this.drawLayer();
        this.redrawnRequired = false;
      }

      this.viewState = "justStabilized";
      RenderLoop.scheduleRender();
    } else if (this.viewState == "justStabilized") {
      if (this.redrawnRequired || this.scale != 1) {
        this.drawLayer();
        this.redrawnRequired = false;
      }

      this.viewState = "stable";
    } else if (this.redrawnRequired) {
      this.drawLayer();
      this.redrawnRequired = false;
    }
  }
}

export class BaseStrokeContainer implements LayeredStrokeContainer {
  private layers: StrokeCluster[];
  private strokes: { [id: string]: PersistentVectorGraphic };

  constructor() {
    this.layers = [new StrokeCluster(Layers.highlighter.static), new StrokeCluster(Layers.pen.static)];
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

  render(layerIndex: number, opacity: number = 1): void {
    this.layers[layerIndex].render();
  }
}
