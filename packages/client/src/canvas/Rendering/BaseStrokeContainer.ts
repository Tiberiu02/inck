import { Graphic, GraphicTypes, PersistentGraphic } from "../Drawing/Graphic";
import { PersistentVectorGraphic, VectorGraphic } from "../Drawing/VectorGraphic";
import { ELEMENTS_PER_VERTEX, GL } from "./GL";
import { LayeredStrokeContainer } from "../LayeredStrokeContainer";
import { RenderLoop } from "./RenderLoop";
import { View } from "../View/View";
import { OFFSET_INPUT } from "../Drawing/Stroke";

export function GetUniforms() {
  return {
    u_Matrix: View.getTransformMatrix(),
  };
}

export const BUFFER_SIZE = 5e4;

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
  private strokes: Map<string, Element>;
  private container: SVGSVGElement;

  constructor(container: SVGSVGElement) {
    this.strokes = new Map();
    this.container = container;
  }

  addStroke(id: string, array: number[]) {
    const xs = [];
    const ys = [];

    for (let i = 0; i < array.length; i += ELEMENTS_PER_VERTEX * 2) {
      xs.push(array[i]);
      ys.push(array[i + 1]);
    }

    xs.reverse();
    ys.reverse();

    for (let i = ELEMENTS_PER_VERTEX; i < array.length; i += ELEMENTS_PER_VERTEX * 2) {
      xs.push(array[i]);
      ys.push(array[i + 1]);
    }

    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    xs.forEach((x, i) => poly.points.appendItem(new DOMPoint(x, ys[i])));
    // poly.setAttribute("points", xs.map((x, i) => `${x},${ys[i]}`).join(" "));
    poly.setAttribute("fill", `rbg(${array.slice(2, 5).map((v) => Math.floor(v * 255))})`);

    this.container.appendChild(poly);

    this.strokes.set(id, poly);
  }

  removeStroke(id: string): boolean {
    if (!this.strokes.has(id)) return false;

    this.container.removeChild(this.strokes.get(id));
    this.strokes.delete(id);

    return true;
  }

  render() {
    // this.container.style.transformOrigin = "top left";
    // this.container.style.transform =
    //   `scale(${innerWidth * View.getZoom()})` + `translate(${-View.getLeft() * 100}%, ${-View.getTop() * 100}%)`;
  }
}

export class BaseStrokeContainer implements LayeredStrokeContainer {
  private layers: StrokeCluster[];
  private containers: HTMLDivElement[];
  private strokes: { [id: string]: PersistentVectorGraphic };

  constructor(containers: HTMLDivElement[]) {
    this.containers = containers;
    this.layers = containers.map((container) => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", `1`);
      svg.setAttribute("height", `10`);
      svg.style.position = `absolute`;
      svg.style.left = `0px`;
      svg.style.top = `0px`;
      container.appendChild(svg);

      return new StrokeCluster(svg);
    });
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
