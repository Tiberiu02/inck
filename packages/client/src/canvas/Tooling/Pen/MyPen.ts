import { ActionStack } from "../ActionsStack";
import { LayeredStrokeContainer } from "../../LayeredStrokeContainer";
import { SerializeStroke } from "../../Drawing/Stroke";
import { StrokeBuilder } from "../../Drawing/StrokeBuilder";
import { RGB, StrokePoint } from "../../types";
import { MyTool } from "../Tool";
import { View } from "../../View/View";
import { Display } from "../../DeviceProps";
import { NetworkConnection } from "../../Network/NetworkConnection";
import { RenderLoop } from "../../Rendering/RenderLoop";
import { EmitterPen, PenController, SerializedPen } from "./TheirPen";
import { DetectShape } from "../../ShapeRecognition/ShapeRecognition";
import { ELEMENTS_PER_VERTEX, GL } from "../../Rendering/GL";
import { GenerateRandomString } from "../../Math/RandomString";
import { RemovedGraphic } from "../../Drawing/Graphic";

const LONG_PRESS_TIME = 500; // (ms)
const INTERVAL_TIME = 100; //   (ms)
const LONG_PRESS_DIST = 5; // (px)

export class MyPen implements MyTool {
  private color: RGB;
  private width: number;
  private zIndex: number;
  private timestamp: number;

  private strokeContainer: LayeredStrokeContainer;
  private actionStack: ActionStack;
  private network: NetworkConnection;

  private drawing: boolean;
  private points: StrokePoint[];
  private strokeBuilder: StrokeBuilder;
  private remoteController: PenController;

  private interval: number;
  private detectedLongPress: boolean;
  private svg: SVGSVGElement;
  layers: HTMLDivElement[];

  constructor(
    color: RGB,
    width: number,
    zIndex: number,
    strokeContainer: LayeredStrokeContainer,
    actionStack: ActionStack,
    network: NetworkConnection,
    layers: HTMLDivElement[]
  ) {
    this.color = color;
    this.width = width;
    this.zIndex = zIndex;

    this.strokeContainer = strokeContainer;
    this.actionStack = actionStack;
    this.network = network;

    this.points = [];
    this.network.setTool(this.serialize());
    this.remoteController = new EmitterPen(network);

    this.layers = layers;
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    if (pressure && this.detectedLongPress) return;

    if (pressure) {
      if (!this.drawing) {
        const width = View.getCanvasCoords(this.width, 0, true)[0];
        this.timestamp = timestamp;
        this.remoteController.setWidth(width);
        this.strokeBuilder = new StrokeBuilder(timestamp, this.zIndex, this.color, width);
        this.drawing = true;
        this.interval = window.setInterval(() => this.testLongPress(), INTERVAL_TIME);

        this.svg.replaceChildren();
        this.layers[this.zIndex].appendChild(this.svg);
      }

      this.strokeBuilder.push({ x, y, pressure, timestamp });
      this.points.push({ x, y, pressure, timestamp });
      this.updateSvg();
    } else {
      if (this.drawing) {
        this.release();
      }
    }

    this.remoteController.update(x, y, pressure, timestamp);

    // Render
    RenderLoop.supportsFastRender ? RenderLoop.render() : RenderLoop.scheduleRender();
  }

  updateSvg() {
    const array = this.strokeBuilder.getGraphic().vector;

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

    const xMin = Math.floor(Math.min(...xs));
    const xMax = Math.ceil(Math.min(...xs));
    const yMin = Math.floor(Math.min(...ys));
    const yMax = Math.ceil(Math.min(...ys));

    const svg = this.svg;
    svg.setAttribute("width", `${xMax - xMin}`);
    svg.setAttribute("height", `${yMax - yMin}`);
    svg.style.position = `absolute`;
    svg.style.left = `${xMin}px`;
    svg.style.top = `${yMin}px`;

    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", xs.map((x, i) => `${(x - xMin).toFixed(4)},${(ys[i] - yMin).toFixed(4)}`).join(" "));
    poly.setAttribute("fill", `rbg(${array.slice(2, 5).map((v) => Math.floor(v * 255))})`);

    svg.replaceChildren(poly);
  }

  render(layerRendered: number): void {
    // if (this.strokeBuilder && layerRendered == this.zIndex) {
    //   const vector = this.strokeBuilder.getGraphic().vector;
    //   GL.renderVector(vector, View.getTransformMatrix());
    // }
  }

  private testLongPress() {
    const currentTime = performance.now();
    if (this.drawing && !this.detectedLongPress && this.points[0].timestamp < currentTime - LONG_PRESS_TIME) {
      let i = this.points.length - 1;
      const [xs, ys] = [[], []];
      while (i >= 0 && this.points[i].timestamp > currentTime - LONG_PRESS_TIME) {
        xs.push(this.points[i].x);
        ys.push(this.points[i].y);
        i--;
      }

      let dx = Math.max(...xs) - Math.min(...xs);
      let dy = Math.max(...ys) - Math.min(...ys);
      [dx, dy] = View.getScreenCoords(dx, dy, true);

      if (dx < LONG_PRESS_DIST && dy < LONG_PRESS_DIST) {
        this.detectedLongPress = true;
        this.convertShape();
      }
    }
  }

  private convertShape() {
    const shapePoints = DetectShape(this.points);
    this.loadPoints(shapePoints);
  }

  private loadPoints(newPoints: StrokePoint[]) {
    this.remoteController.loadPoints(newPoints);
    this.points = newPoints;

    const width = View.getCanvasCoords(this.width, 0, true)[0];
    this.remoteController.setWidth(width);
    this.strokeBuilder = new StrokeBuilder(this.timestamp, this.zIndex, this.color, width);

    newPoints.forEach((p) => this.strokeBuilder.push(p));

    RenderLoop.scheduleRender();
  }

  serialize(): SerializedPen {
    return {
      deserializer: "pen",
      color: this.color,
      width: this.width,
      zIndex: this.zIndex,
      stroke: this.strokeBuilder ? SerializeStroke(this.strokeBuilder.getStroke(null)) : null,
    };
  }

  release() {
    if (this.drawing) {
      // Add stroke
      const id = GenerateRandomString();
      const stroke = this.strokeBuilder.getStroke(id);

      this.strokeContainer.add(stroke);

      this.actionStack.push({
        undo: (): boolean => {
          this.strokeContainer.add(RemovedGraphic(stroke.id));
          return true;
        },
        redo: () => this.strokeContainer.add(stroke),
      });

      // Reset pen
      this.strokeBuilder = null;
      this.points = [];
      this.drawing = false;
      this.detectedLongPress = false;
    }

    clearInterval(this.interval);
  }
}
