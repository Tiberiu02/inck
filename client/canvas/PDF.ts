import { CanvasManager } from "./CanvasManager";
import { PersistentGraphic, Graphic, GraphicTypes } from "./Drawing/Graphic";
import * as PDFJS from "pdfjs-dist/legacy/build/pdf";
import Profiler from "./Profiler";
import { ImageGraphic } from "./Drawing/ImageGraphic";
import { RenderLoop } from "./Rendering/RenderLoop";
import { CreateRectangleGraphic } from "./Drawing/Rectangle";
import { MutableView, View } from "./View/View";
import { MutableObservableProperty } from "./DesignPatterns/Observable";
import { GL } from "./Rendering/GL";
import { GetUniforms } from "./Rendering/BaseCanvasManager";
import { RGB } from "./types";

enum PdfPageStatus {
  LOADED,
  LOADING,
  NOT_LOADED,
}

type PdfPage = {
  number: number;
  top: number;
  height: number;
  status: PdfPageStatus;
  texture: WebGLTexture;
};

function CreateRectangleVector(
  x: number,
  y: number,
  w: number,
  h: number,
  color: RGB,
  joinable: boolean = false
): number[] {
  const vector = [];

  if (joinable) {
    vector.push(x, y, ...color, 1);
    vector.push(x, y, ...color, 1);
  }
  vector.push(x, y, ...color, 1);
  vector.push(x + w, y, ...color, 1);
  vector.push(x, y + h, ...color, 1);
  vector.push(x + w, y + h, ...color, 1);
  if (joinable) {
    vector.push(x + w, y + h, ...color, 1);
    vector.push(x + w, y + h, ...color, 1);
  }

  return vector;
}

export class PdfCanvasManager implements CanvasManager {
  private canvas: CanvasManager;
  private url: string;
  private pdf: PDFJS.PDFDocumentProxy;
  private pages: PdfPage[];
  private yMax: MutableObservableProperty<number>;
  private skeletonVector: number[];
  private skeletonBuffer: WebGLBuffer;

  constructor(canvas: CanvasManager, url: string, yMax: MutableObservableProperty<number>) {
    this.canvas = canvas;
    this.url = url;
    this.yMax = yMax;
    this.pages = [];

    MutableView.maxWidth = 3;
    MutableView.documentTop = -0.2;

    RenderLoop.scheduleRender();
    this.init();
  }

  private async init() {
    document.getElementById("pdf-spinner").style.display = "flex";

    PDFJS.GlobalWorkerOptions.workerSrc = `/api/pdf.worker.js`;
    this.pdf = await PDFJS.getDocument(this.url).promise;

    const padding = 0.01; // %w

    this.skeletonVector = [];

    let top = 0;
    for (let currentPage = 1; currentPage <= this.pdf.numPages; currentPage++) {
      const page = await this.pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1 });
      const height = viewport.height / viewport.width;

      this.pages.push({
        number: currentPage,
        top,
        height,
        status: PdfPageStatus.NOT_LOADED,
        texture: null,
      });
      this.skeletonVector.push(...CreateRectangleVector(0, top, 1, height, [1, 1, 1], true));

      this.yMax.set(Math.max(this.yMax.get(), top + height));
      top += height + padding;
    }

    this.skeletonBuffer = GL.ctx.createBuffer();
    GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, this.skeletonBuffer);
    GL.ctx.bufferData(GL.ctx.ARRAY_BUFFER, new Float32Array(this.skeletonVector), GL.ctx.STATIC_DRAW);

    document.getElementById("pdf-spinner").style.display = "none";

    RenderLoop.scheduleRender();
  }

  add(graphic: PersistentGraphic): void {
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
    const bgVector = CreateRectangleVector(
      View.getLeft(),
      View.getTop(),
      View.getWidth(),
      View.getHeight(),
      [0.9, 0.9, 0.9]
    );

    GL.renderVector(bgVector, GetUniforms());

    if (this.skeletonBuffer) {
      GL.renderVector(this.skeletonVector, GetUniforms(), this.skeletonBuffer);
    }

    const pageIsVisible = (page: PdfPage) =>
      page && page.top + page.height > View.getTop() && page.top < View.getTop() + View.getHeight();

    let pageToLoad = null;

    for (let i = 0; i < this.pages.length; i++) {
      const page = this.pages[i];

      const show = pageIsVisible(page) || pageIsVisible(this.pages[i - 1]) || pageIsVisible(this.pages[i + 1]);

      if (show) {
        if (page.status == PdfPageStatus.LOADED) {
          const [x, y] = View.getScreenCoords(0, page.top);
          const [w, h] = View.getScreenCoords(1, page.height, true);
          const r = window.devicePixelRatio;
          GL.renderTexture(page.texture, w * r, h * r, x * r, y * r);
        } else if (pageToLoad == null) {
          pageToLoad = page;
        }
      } else {
        if (page.status == PdfPageStatus.LOADED) {
          GL.ctx.deleteTexture(page.texture);
          page.status = PdfPageStatus.NOT_LOADED;
        }
      }
    }

    if (pageToLoad && this.pdf && this.pages.every(page => page.status != PdfPageStatus.LOADING)) {
      this.startLoadingPage(pageToLoad);
    }

    this.canvas.render();
  }

  async startLoadingPage(pageData: PdfPage) {
    pageData.status = PdfPageStatus.LOADING;

    const size = 4096;

    const page = await this.pdf.getPage(pageData.number);

    let viewport = page.getViewport({ scale: 1 });
    const scale = size / Math.max(viewport.width, viewport.height);
    viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const renderContext = { canvasContext: ctx, viewport: viewport };

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.position = "fixed";
    canvas.style.top = "0px";
    canvas.style.left = "0px";

    await page.render(renderContext).promise;

    pageData.texture = GL.createTexture(canvas);

    pageData.status = PdfPageStatus.LOADED;

    RenderLoop.scheduleRender();
  }
}
