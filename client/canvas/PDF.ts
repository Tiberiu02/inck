import { CanvasManager } from "./CanvasManager";
import { PersistentGraphic, Graphic, GraphicTypes } from "./Drawing/Graphic";
import * as PDFJS from "pdfjs-dist/legacy/build/pdf";
import Profiler from "./Profiler";
import { ImageGraphic } from "./Drawing/ImageGraphic";
import { RenderLoop } from "./Rendering/RenderLoop";
import { CreateRectangleGraphic } from "./Drawing/Rectangle";
import { MutableView, View } from "./View/View";
import { MutableObservableProperty } from "./DesignPatterns/Observable";

export class PdfCanvasManager implements CanvasManager {
  private canvas: CanvasManager;
  private url: string;
  private pdf: PDFJS.PDFDocumentProxy;
  private images: ImageGraphic[];
  private yMax: MutableObservableProperty<number>;

  constructor(canvas: CanvasManager, url: string, yMax: MutableObservableProperty<number>) {
    this.canvas = canvas;
    this.url = url;
    this.yMax = yMax;
    this.images = [];

    MutableView.maxWidth = 3;
    this.init();
  }

  private async init() {
    PDFJS.GlobalWorkerOptions.workerSrc = `/api/pdf.worker.js`;
    this.pdf = await PDFJS.getDocument(this.url).promise;

    const scale = 5;
    const padding = 0.01; // %w

    let top = 0;
    for (let currentPage = 1; currentPage <= this.pdf.numPages; currentPage++) {
      const pixels = await RenderPage(this.pdf, currentPage, scale);
      console.log(pixels.height, pixels.width);
      const image = {
        type: GraphicTypes.IMAGE,
        zIndex: -1,
        pixels,
        left: 0,
        top,
        width: 1,
        height: pixels.height / pixels.width,
      };

      this.images.push(image);
      this.yMax.set(Math.max(this.yMax.get(), image.top + image.height));

      top += image.height + padding;
      console.log("rendered page", currentPage);

      RenderLoop.scheduleRender();
    }
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
    const bg = CreateRectangleGraphic(
      View.getLeft(),
      View.getTop(),
      View.getWidth(),
      View.getHeight(),
      [0.9, 0.9, 0.9],
      -1
    );
    this.canvas.addForNextRender(bg);

    for (const image of this.images) {
      this.canvas.addForNextRender(image);
    }
    this.canvas.render();
  }
}

async function RenderPage(pdf: PDFJS.PDFDocumentProxy, currentPage: number, scale: number): Promise<HTMLCanvasElement> {
  Profiler.start("rendering page");
  const page = await pdf.getPage(currentPage);

  console.log("Printing " + currentPage);
  var viewport = page.getViewport({ scale });
  var canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  var renderContext = { canvasContext: ctx, viewport: viewport };

  canvas.height = viewport.height;
  canvas.width = viewport.width;
  canvas.style.position = "fixed";
  canvas.style.top = "0px";
  canvas.style.left = "0px";

  await page.render(renderContext).promise;
  Profiler.stop("rendering page");
  console.log("renering PDF page took (ms):", Profiler.getProfiler().performance("rendering page"));

  return canvas;
}
