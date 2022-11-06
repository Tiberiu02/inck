import { RGB, StrokePoint } from "../../types";
import { V2 } from "../../Math/V2";
import { Graphic } from "../../Drawing/Graphic";
import { StrokeVectorizer } from "../../Drawing/StrokeVectorizer";
import { OptimizeDrawables } from "../../Rendering/OptimizeDrawables";

const DOT_LEN = 1;
const BREAK_LEN = 2;
const SP_DIST = 0.1;

export class DottedStrokeBuilder {
  private color: RGB;
  private width: number;
  private strokes: Graphic[];
  private currentStroke: StrokeVectorizer;
  private lastPoint: StrokePoint;
  private lastKeyPoint: StrokePoint;
  private isDotting: boolean;
  private zIndex: number;

  constructor(color: RGB, width: number, zIndex: number) {
    this.color = color;
    this.width = width;
    this.zIndex = zIndex;
    this.strokes = [];
  }

  push(p: StrokePoint): void {
    if (!this.lastPoint) {
      this.lastPoint = this.lastKeyPoint = p;
      this.isDotting = true;
      // this.currentStroke = new StrokeVectorizer(this.color, this.width);
      this.currentStroke.push(p);
      return;
    }

    while (V2.dist(p, this.lastPoint) > SP_DIST * this.width) {
      this.push({
        x: (p.x + this.lastPoint.x) / 2,
        y: (p.y + this.lastPoint.y) / 2,
        timestamp: (p.timestamp + this.lastPoint.timestamp) / 2,
        pressure: (p.pressure + this.lastPoint.pressure) / 2,
      });
    }

    if (this.isDotting) {
      if (V2.dist(p, this.lastKeyPoint) > DOT_LEN * this.width) {
        this.currentStroke.push({ ...this.lastPoint, timestamp: this.lastPoint.timestamp + 10 });

        // this.strokes = OptimizeDrawables(this.strokes.concat([this.currentStroke.getGraphic(this.zIndex)]));
        this.lastKeyPoint = this.lastPoint;
        this.isDotting = false;
      }
    } else {
      if (V2.dist(p, this.lastKeyPoint) > BREAK_LEN * this.width) {
        // this.currentStroke = new StrokeVectorizer(this.color, this.width);
        this.currentStroke.push(p);
        this.lastKeyPoint = p;
        this.isDotting = true;
      }
    }

    this.lastPoint = p;
  }

  getStrokes(): Graphic[] {
    // return this.strokes.concat(this.isDotting ? [this.currentStroke.getGraphic(this.zIndex)] : []);
    return [];
  }
}
