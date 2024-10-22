import { LayeredStrokeContainer } from "../../LayeredStrokeContainer";
import { DeserializeStroke, SerializedStroke, SerializeStroke } from "../../Drawing/Stroke";
import { StrokeBuilder } from "../../Drawing/StrokeBuilder";
import { RGB, StrokePoint } from "../../types";
import { SerializedTool, MyTool, TheirTool } from "../Tool";
import { CreateEmitterClass, ProtectInstance } from "../../DesignPatterns/RemoteStateManagement";
import { RenderLoop } from "../../Rendering/RenderLoop";
import { GL } from "../../Rendering/GL";
import { View } from "../../View/View";

export interface SerializedPen extends SerializedTool {
  readonly color: RGB;
  readonly width: number;
  readonly zIndex: number;
  readonly stroke: SerializedStroke;
}

export class PenController {
  loadPoints(newPoints: StrokePoint[]) {}
  update(x: number, y: number, pressure: number, timestamp: number): void {}
  setWidth(width: number): void {}
}

export class TheirPen implements PenController, TheirTool {
  private color: RGB;
  private width: number;
  private zIndex: number;

  private strokeContainer: LayeredStrokeContainer;

  private drawing: boolean;
  private strokeBuilder: StrokeBuilder;

  constructor(color: RGB, width: number, zIndex: number, strokeContainer: LayeredStrokeContainer) {
    this.color = color;
    this.width = width;
    this.zIndex = zIndex;

    this.strokeContainer = strokeContainer;
  }

  loadPoints(newPoints: StrokePoint[]): void {
    this.strokeBuilder = new StrokeBuilder(newPoints[0].timestamp, this.zIndex, this.color, this.width);
    newPoints.forEach(p => this.strokeBuilder.push(p));
    RenderLoop.scheduleRender();
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    if (pressure) {
      if (!this.drawing) {
        this.strokeBuilder = new StrokeBuilder(timestamp, this.zIndex, this.color, this.width);
        this.drawing = true;
      }

      this.strokeBuilder.push({ x, y, pressure, timestamp });
    } else {
      if (this.drawing) {
        this.strokeBuilder = null;
        this.drawing = false;
      }
    }
  }

  setWidth(width: number) {
    this.width = width;
  }

  render(layerRendered: number): void {
    if (this.strokeBuilder && layerRendered == this.zIndex) {
      const vector = this.strokeBuilder.getGraphic().vector;
      GL.renderVector(vector, View.getTransformMatrix());
    }
  }

  protected(): PenController {
    return ProtectInstance(this, PenController);
  }

  static deserialize(data: SerializedPen, strokeContainer: LayeredStrokeContainer): TheirPen {
    const pen = new TheirPen(data.color, data.width, data.zIndex, strokeContainer);

    if (data.stroke) {
      const stroke = DeserializeStroke(data.stroke);
      for (const p of stroke.points) {
        pen.update(p.x, p.y, p.pressure, p.timestamp);
      }
    }

    return pen;
  }
}

export const EmitterPen = CreateEmitterClass(PenController);
