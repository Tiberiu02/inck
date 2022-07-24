import { ActionStack } from "./ActionsStack";
import { CanvasManager } from "./CanvasManager";
import { DistanceSq, LineBoundingBox, RectangleIntersectsRectangle } from "./Geometry";
import { LineSegment, Rectangle, RGB, StrokePoint } from "./types";
import { DynamicStroke, FillPath, GetStrokeRadius } from "./Vectorization";

export const ELEMENTS_PER_INPUT = 4;
export const OFFSET_INPUT = {
  X: 0,
  Y: 1,
  P: 2,
  T: 3,
};

export class Tool {
  private longPressTimeout: number;
  private releaseCallback: () => void;
  private longPressCallback: () => void;
  private xMin: number;
  private xMax: number;
  private yMin: number;
  private yMax: number;
  private startTime: number;

  canvasManager: CanvasManager;
  actionStack?: ActionStack;

  constructor(canvasManager: CanvasManager, actionStack?: ActionStack) {
    this.releaseCallback = () => {};
    this.longPressCallback = () => {};
    this.xMin = this.yMin = Infinity;
    this.xMax = this.yMax = -Infinity;

    this.canvasManager = canvasManager;
    this.actionStack = actionStack;
  }

  update(x: number, y: number, pressure: number, timeStamp: number) {
    this.xMin = Math.min(this.xMin, x);
    this.yMin = Math.min(this.yMin, y);
    this.xMax = Math.max(this.xMax, x);
    this.yMax = Math.max(this.yMax, y);

    if (!this.startTime) {
      this.startTime = timeStamp;
    }
  }

  ifLongPress(duration: number, maxDist: number, callback: () => void) {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
    }

    const cb = this.longPressCallback;
    this.longPressCallback = () => {
      if (this.xMax - this.xMin < maxDist && this.yMax - this.yMin < maxDist) {
        callback();
      }
      cb();
    };
    this.longPressTimeout = window.setTimeout(this.longPressCallback, duration);
  }

  ifQuickRelease(duration: number, fn: () => void) {
    const cb = this.releaseCallback;
    this.releaseCallback = () => {
      if (this.startTime && Date.now() - this.startTime < duration) {
        fn();
      }
      cb();
    };
  }

  release(): void {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
    }
    this.releaseCallback();
  }

  render() {}

  serialize(): any {
    return {};
  }

  static deserialize(data: any, canvasManager: CanvasManager, actionStack?: ActionStack) {
    if (data && data.type == "p") {
      return Pen.deserialize(data, canvasManager, actionStack);
    }
  }
}

export class Pen extends Tool {
  stroke: Stroke;

  constructor(width: number, color: RGB, zIndex: number, canvasManager: CanvasManager, actionStack?: ActionStack) {
    super(canvasManager, actionStack);
    this.stroke = new Stroke(color, width, zIndex);
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    super.update(x, y, pressure, timestamp);
    this.stroke.push({ x, y, pressure, timestamp });
  }

  render(): void {
    this.canvasManager.addActiveStroke(this.stroke);
  }

  release(): void {
    super.release();

    this.canvasManager.addStroke(this.stroke);
    if (this.actionStack) {
      this.actionStack.push({
        undo: (): boolean => this.canvasManager.removeStroke(this.stroke.id),
        redo: () => this.canvasManager.addStroke(this.stroke),
      });
    }
  }

  serialize(): any {
    return this.stroke.serialize();
  }

  static deserialize(data: any, canvasManager: CanvasManager, actionStack?: ActionStack): Pen {
    const stroke = Stroke.deserialize(data);
    const pen = new Pen(stroke.width, stroke.color, stroke.zIndex, canvasManager, actionStack);
    pen.stroke = stroke;
    return pen;
  }
}

export class StrokeEraser extends Tool {
  private x: number;
  private y: number;

  constructor(canvasManager: CanvasManager, actionStack: ActionStack) {
    super(canvasManager, actionStack);
  }

  update(x: number, y: number, pressure: number, timeStamp: number): void {
    super.update(x, y, pressure, timeStamp);

    const x2 = this.x ?? x;
    const y2 = this.y ?? y;

    this.x = x;
    this.y = y;

    const line = { x1: x, y1: y, x2, y2 };
    this.canvasManager
      .getStrokes()
      .filter(s => s && s.intersectsLine(line))
      .forEach(s => {
        this.canvasManager.removeStroke(s.id);
        this.actionStack.push({
          undo: () => {
            // TODO: Add stroke at the same position as before
            this.canvasManager.addStroke(s);
            return true;
          },
          redo: () => this.canvasManager.removeStroke(s.id),
        });
      });
  }
}

export class Stroke {
  color: RGB;
  width: number;
  zIndex: number;

  timestamp: number;
  id: string;

  points: StrokePoint[];
  boundingBox: Rectangle;

  private vectorizer: DynamicStroke;

  constructor(color: RGB, width: number, zIndex: number, timestamp?: number, id?: string) {
    this.color = color;
    this.width = width;
    this.zIndex = zIndex;
    this.timestamp = timestamp ?? Date.now();
    this.id = id ?? window.userId + "-" + this.timestamp;
    this.points = [];
    this.vectorizer = new DynamicStroke(width, [...color, 1]);
    this.boundingBox = {
      xMin: Infinity,
      xMax: -Infinity,
      yMin: Infinity,
      yMax: -Infinity,
    };
  }

  push(p: StrokePoint): void {
    this.points.push(p);
    this.vectorizer.push(p);

    this.boundingBox = {
      xMin: Math.min(this.boundingBox.xMin, p.x - this.width),
      xMax: Math.max(this.boundingBox.xMax, p.x + this.width),
      yMin: Math.min(this.boundingBox.yMin, p.y - this.width),
      yMax: Math.max(this.boundingBox.yMax, p.y + this.width),
    };
  }

  vectorize(): number[] {
    return this.vectorizer.getArray();
  }

  intersectsLine(line: LineSegment) {
    const rect = LineBoundingBox(line);

    if (!RectangleIntersectsRectangle(this.boundingBox, rect, this.width)) {
      return false;
    }

    for (let i = 1; i < this.points.length; i++) {
      const line: LineSegment = {
        x1: this.points[i].x,
        y1: this.points[i].y,
        x2: this.points[i - 1].x,
        y2: this.points[i - 1].y,
      };

      if (RectangleIntersectsRectangle(rect, LineBoundingBox(line))) {
        return true;
      }
    }

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const R_Sq = GetStrokeRadius(this.width, p.pressure) ** 2;

      if (DistanceSq(p.x, p.y, line.x1, line.y1) < R_Sq || DistanceSq(p.x, p.y, line.x2, line.y2) < R_Sq) {
        return true;
      }
    }

    return false;
  }

  static deserialize(data): Stroke {
    console.log(data);
    if (data.type == "e") {
      return FreeShape.deserialize(data);
    } else {
      const color = data.color.slice(0, 3);
      const zIndex = data.type == "h" ? 0 : data.zIndex ?? 1;
      const { width, timestamp, path, id } = data;

      const stroke = new Stroke(color, width, zIndex, timestamp, id);
      for (let i = 0; i < path.length; i += ELEMENTS_PER_INPUT)
        stroke.push({
          x: path[i + OFFSET_INPUT.X],
          y: path[i + OFFSET_INPUT.Y],
          pressure: path[i + OFFSET_INPUT.P],
          timestamp: path[i + OFFSET_INPUT.T],
        });
      console.log(stroke);

      return stroke;
    }
  }

  serialize(): any {
    const path = [].concat(...this.points.map(p => [p.x, p.y, p.pressure, p.timestamp]));
    return {
      type: "p",
      width: this.width,
      color: this.color,
      path: path,
      timestamp: this.timestamp,
      zIndex: this.zIndex,
      id: this.id,
    };
  }
}

export class FreeShape extends Stroke {
  constructor(color: RGB) {
    super(color, 0, 1);
  }

  vectorize(active: boolean = false): number[] {
    const color = active ? [0.95, 0.95, 0.95, 1] : [1, 1, 1, 1];

    return FillPath(this.points, color);
  }

  serialize() {
    return {
      type: "e",
      path: this.points,
    };
  }

  static deserialize({ path, color }): FreeShape {
    const stroke = new FreeShape(color ?? [0, 0, 0]);

    for (let i = 0; i < path.length; i++) {
      stroke.push(path[i]);
    }

    return stroke;
  }
}
