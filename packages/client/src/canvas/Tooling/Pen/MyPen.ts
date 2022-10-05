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
import { GL } from "../../Rendering/GL";
import { GenerateRandomString } from "../../Math/RandomString";
import { RemovedGraphic } from "../../Drawing/Graphic";

const LONG_PRESS_TIME = 500; // (ms)
const INTERVAL_TIME = 100; //   (ms)
const LONG_PRESS_DIST = 0.05; // (in)

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

  constructor(
    color: RGB,
    width: number,
    zIndex: number,
    strokeContainer: LayeredStrokeContainer,
    actionStack: ActionStack,
    network: NetworkConnection
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
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    if (pressure && this.detectedLongPress) return;

    if (pressure) {
      if (!this.drawing) {
        const width = View.getCanvasCoords(Display.DPI * this.width, 0, true)[0];
        this.timestamp = timestamp;
        this.remoteController.setWidth(width);
        this.strokeBuilder = new StrokeBuilder(timestamp, this.zIndex, this.color, width);
        this.drawing = true;
        this.interval = window.setInterval(() => this.testLongPress(), INTERVAL_TIME);
      }

      this.strokeBuilder.push({ x, y, pressure, timestamp });
      this.points.push({ x, y, pressure, timestamp });
    } else {
      if (this.drawing) {
        this.release();
      }
    }

    this.remoteController.update(x, y, pressure, timestamp);

    // Render
    RenderLoop.supportsFastRender ? RenderLoop.render() : RenderLoop.scheduleRender();
  }

  render(layerRendered: number): void {
    if (this.strokeBuilder && layerRendered == this.zIndex) {
      const vector = this.strokeBuilder.getGraphic().vector;
      GL.renderVector(vector, View.getTransformMatrix());
    }
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
      dx /= Display.DPI;
      dy /= Display.DPI;

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

    const width = View.getCanvasCoords(Display.DPI * this.width, 0, true)[0];
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
