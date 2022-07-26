import { ActionStack } from "../ActionsStack";
import { CanvasManager } from "../CanvasManager";
import { Pen } from "./Pen";

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
