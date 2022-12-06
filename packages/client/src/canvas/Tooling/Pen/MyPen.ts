import { ActionStack } from "../ActionsStack";
import { LayeredStrokeContainer } from "../../LayeredStrokeContainer";
import { SerializeStroke } from "../../Drawing/Stroke";
import { StrokeBuilder } from "../../Drawing/StrokeBuilder";
import { RGB, StrokePoint } from "../../types";
import { MyTool } from "../Tool";
import { View } from "../../View/View";
import { NetworkConnection } from "../../Network/NetworkConnection";
import { RenderLoop } from "../../Rendering/RenderLoop";
import { EmitterPen, PenController, SerializedPen } from "./TheirPen";
import { DetectShape } from "../../ShapeRecognition/ShapeRecognition";
import { GL } from "../../Rendering/GL";
import { GenerateRandomString } from "../../Math/RandomString";
import { RemovedGraphic } from "../../Drawing/Graphic";
import Profiler from "../../Profiler";

const LONG_PRESS_TIME = 500; // (ms)
const INTERVAL_TIME = 100; //   (ms)
const LONG_PRESS_DIST = 5; // (px)

export class MyPen implements MyTool {
  private color: RGB;
  private width: number;
  public zIndex: number;
  private timestamp: number;

  private strokeContainer: LayeredStrokeContainer;
  private actionStack: ActionStack;
  private network: NetworkConnection;

  private drawing: boolean;
  private strokeBuilder: StrokeBuilder;
  private remoteController: PenController;

  private lastTestForLongPress: number;
  private detectedLongPress: boolean;

  constructor(strokeContainer: LayeredStrokeContainer, actionStack: ActionStack, network: NetworkConnection) {
    this.strokeContainer = strokeContainer;
    this.actionStack = actionStack;
    this.network = network;

    this.network.setTool(this.serialize());
    this.remoteController = new EmitterPen(network);
    this.strokeBuilder = new StrokeBuilder();
  }

  options(color: RGB, width: number, zIndex: number) {
    this.color = color;
    this.width = width;
    this.zIndex = zIndex;
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    if (pressure && this.detectedLongPress) return;

    if (pressure) {
      const now = performance.now();
      if (!this.drawing) {
        const width = View.instance.getCanvasDist(this.width);
        this.timestamp = timestamp;
        this.remoteController.setWidth(width);
        this.strokeBuilder.newStroke(timestamp, this.zIndex, this.color, width);
        this.drawing = true;
        this.lastTestForLongPress = now;
      }

      this.strokeBuilder.push(x, y, pressure, timestamp);

      if (this.drawing && now - this.lastTestForLongPress > INTERVAL_TIME) {
        this.testLongPress();
        this.lastTestForLongPress = now;
      }
    } else {
      if (this.drawing) {
        this.release();
      }
    }

    this.remoteController.update(x, y, pressure, timestamp);

    // Render
    RenderLoop.render();
  }

  render(layerRendered: number): void {
    if (this.drawing && layerRendered == this.zIndex) {
      Profiler.start("vectorize");
      const vector = this.strokeBuilder.getVector();
      Profiler.stop("vectorize");
      Profiler.start("draw");
      GL.renderVector(vector, View.instance.getTransformMatrix());
      Profiler.stop("draw");
    }
  }

  private testLongPress() {
    const currentTime = performance.now();
    const points = this.strokeBuilder.getPoints();
    if (this.drawing && !this.detectedLongPress && points[0].timestamp < currentTime - LONG_PRESS_TIME) {
      const dist = View.instance.getCanvasDist(LONG_PRESS_DIST);

      let i = points.length - 1;
      let xMax = -Infinity;
      let yMax = -Infinity;
      let xMin = Infinity;
      let yMin = Infinity;
      while (
        i >= 0 &&
        points[i].timestamp > currentTime - LONG_PRESS_TIME &&
        xMax - xMin < dist &&
        yMax - yMin < dist
      ) {
        xMax = Math.max(xMax, points[i].x);
        xMin = Math.min(xMin, points[i].x);
        yMax = Math.max(yMax, points[i].y);
        yMin = Math.min(yMin, points[i].y);
        i--;
      }

      if (xMax - xMin < dist && yMax - yMin < dist) {
        this.detectedLongPress = true;
        this.convertShape();
      }
    }
  }

  private convertShape() {
    const shapePoints = DetectShape(this.strokeBuilder.getPoints());
    this.loadPoints(shapePoints.slice());
  }

  private loadPoints(newPoints: StrokePoint[]) {
    this.remoteController.loadPoints(newPoints);

    const width = View.instance.getCanvasDist(this.width);
    this.remoteController.setWidth(width);
    this.strokeBuilder.newStroke(this.timestamp, this.zIndex, this.color, width);

    for (const p of newPoints) {
      this.strokeBuilder.push(p.x, p.y, p.pressure, p.timestamp);
    }

    RenderLoop.render();
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
      this.drawing = false;
      this.detectedLongPress = false;
    }
  }
}
