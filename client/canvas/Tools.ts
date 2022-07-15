import { Rectangle } from "./types";
import { DynamicStroke, FillPath } from "./Vectorization";
import { getAuthToken } from "../components/AuthToken";

export const ELEMENTS_PER_INPUT = 4;
export const OFFSET_INPUT = {
  X: 0,
  Y: 1,
  P: 2,
  T: 3,
};

export class Tool {
  inputs: any;
  width: number;
  id: string;
  zIndex: number;
  callback: () => void;
  startTime: any;
  endTime: any;
  longPressTimeout: number;
  vectorize?(active?: boolean): number[];
  serialize?(): object;
  boundingBox: Rectangle;

  constructor(inputs: number[], width: number, id?: string) {
    this.inputs = inputs;
    this.width = width;
    this.id = id ?? window.userId + "-" + Date.now();
    this.zIndex = 1;
    this.callback = () => {};

    const xValues = inputs.filter((_, i) => i % 4 == 0);
    const yValues = inputs.filter((_, i) => i % 4 == 1);
    this.boundingBox = {
      xMin: Math.min(...xValues) - width,
      xMax: Math.max(...xValues) + width,
      yMin: Math.min(...yValues) - width,
      yMax: Math.max(...yValues) + width,
    };
  }

  update(x: number, y: number, pressure: number, timeStamp: number): void {
    if (!this.startTime) this.startTime = timeStamp;
    this.endTime = timeStamp;

    this.inputs.push(x, y, pressure, timeStamp - this.startTime);

    this.boundingBox = {
      xMin: Math.min(this.boundingBox.xMin, x - this.width),
      xMax: Math.max(this.boundingBox.xMax, x + this.width),
      yMin: Math.min(this.boundingBox.yMin, y - this.width),
      yMax: Math.max(this.boundingBox.yMax, y + this.width),
    };
  }

  static deserialize(data) {
    if (data.type == "p") return Pen.deserialize(data);
    else if (data.type == "h") return HighlighterPen.deserialize(data);
    else if (data.type == "e") return Eraser.deserialize(data);
  }

  ifLongPress(duration, maxDist, callback) {
    this.longPressTimeout = window.setTimeout(() => {
      let [xMin, yMin, xMax, yMax] = [Infinity, Infinity, 0, 0];

      for (let i = 0; i < this.inputs.length; i += 4) {
        xMin = Math.min(xMin, this.inputs[i]);
        yMin = Math.min(yMin, this.inputs[i + 1]);
        xMax = Math.max(xMax, this.inputs[i]);
        yMax = Math.max(yMax, this.inputs[i + 1]);
      }

      if (xMax - xMin < maxDist && yMax - yMin < maxDist) callback();
    }, duration);
  }

  ifQuickRelease(duration, fn) {
    const cb = this.callback;
    this.callback = () => {
      if (this.startTime && this.endTime - this.startTime < duration) fn();
      cb();
    };
  }

  delete() {
    if (this.longPressTimeout) clearTimeout(this.longPressTimeout);
  }
}

export class Pen extends Tool {
  startTime: any;
  endTime: number;
  boundingBox: { xMin: number; xMax: number; yMin: number; yMax: number };
  longPressTimeout: number;
  zIndex: number;
  id: string;
  vectorizer: DynamicStroke;
  callback: () => void;
  color: number[];

  constructor(width: number, color: number[], inputs = [], id?: string) {
    super(inputs, width, id);

    this.vectorizer = new DynamicStroke(width, color, inputs);
    this.color = color;
  }

  update(x: number, y: number, pressure: number, timeStamp: number): void {
    super.update(x, y, pressure, timeStamp);
    this.vectorizer.addInput(x, y, pressure, timeStamp);
  }

  vectorize(active: boolean = false): number[] {
    return this.vectorizer.getArray();
  }

  serialize() {
    return {
      type: "p",
      width: this.width,
      color: this.color,
      path: this.inputs,
      id: this.id,
    };
  }

  static deserialize(s) {
    return new Pen(s.width, s.color, s.path, s.id);
  }
}

export class HighlighterPen extends Pen {
  constructor(width: number, color: number[], inputs = [], id?: string) {
    super(width, color, inputs, id);
    this.zIndex = 0;
  }

  serialize() {
    return {
      type: "h",
      width: this.width,
      color: this.color,
      path: this.inputs,
      id: this.id,
    };
  }

  static deserialize(s) {
    return new HighlighterPen(s.width, s.color, s.path, s.id);
  }
}

export class Eraser extends Tool {
  constructor(inputs = [], id?: string) {
    super(inputs, 0, id);
  }

  vectorize(active: boolean = false): number[] {
    const color = active ? [0.95, 0.95, 0.95, 1] : [1, 1, 1, 1];

    return FillPath(
      this.inputs.filter((_, ix) => ix % 4 < 2),
      color
    );
  }

  serialize() {
    return {
      type: "e",
      path: this.inputs,
    };
  }

  static deserialize(s) {
    return new Eraser(s.path);
  }
}
