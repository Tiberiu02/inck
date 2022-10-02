import { PreloadStrokes } from "./PreloadStrokes";
import { DetectShape } from "../ShapeRecognition";
import { StrokePoint } from "../../types";
import { ELEMENTS_PER_INPUT, OFFSET_INPUT } from "../../Drawing/Stroke";

declare global {
  interface Window {
    GetAllStrokes(): void;
    GetTopStroke(): void;
    LoadStroke(stroke: number[]): void;
  }
}

function CreateCanvas(drawable = true, callback: any = undefined) {
  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 500;
  canvas.style.borderWidth = "1px";
  canvas.style.borderColor = "#aaa";
  canvas.style.borderStyle = "solid";
  canvas.style.margin = "10px";
  canvas.style.display = "inline";
  if (drawable) {
    canvas.style.touchAction = "none";
  }

  if (drawable) {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    let x: number, y: number;
    let inputs: number[] = [];
    const pointerDown = (e: PointerEvent) => {
      x = e.offsetX;
      y = e.offsetY;
      inputs.push(x / canvas.width, y / canvas.width, e.pressure, e.timeStamp);

      canvas.addEventListener("pointermove", pointerMove);
      canvas.addEventListener("pointerup", pointerUp);
    };
    const pointerMove = (e: PointerEvent) => {
      ctx.moveTo(x, y);
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
      inputs.push(x / canvas.width, y / canvas.width, e.pressure, e.timeStamp);
      x = e.offsetX;
      y = e.offsetY;
    };
    const pointerUp = (e: PointerEvent) => {
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.style.touchAction = "";

      if (callback) {
        callback(inputs);
      }
    };

    canvas.addEventListener("pointerdown", pointerDown);
  }

  return canvas;
}

function DrawStroke(canvas: HTMLCanvasElement, stroke: number[], color: string = "#000", width: number = 1) {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  ctx.beginPath();

  for (let i = 0; i < stroke.length; i += ELEMENTS_PER_INPUT) {
    const x = stroke[i + OFFSET_INPUT.X] * canvas.width;
    const y = stroke[i + OFFSET_INPUT.Y] * canvas.width;

    if (i == 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function CreateCanvasGroup(callback: any, stroke: number[] = []) {
  const detectShape = (inputs: number[]): number[] => {
    let stroke: StrokePoint[] = [];
    for (let i = 0; i < inputs.length; i += ELEMENTS_PER_INPUT)
      stroke.push({
        x: inputs[i + OFFSET_INPUT.X],
        y: inputs[i + OFFSET_INPUT.Y],
        pressure: inputs[i + OFFSET_INPUT.P],
        timestamp: inputs[i + OFFSET_INPUT.T],
      });
    const detectedShape = DetectShape(stroke);

    if (!detectedShape) return inputs;
    return ([] as number[]).concat(
      ...detectedShape.map((s: StrokePoint): number[] => [s.x, s.y, s.pressure, s.timestamp])
    );
  };

  let canvas: HTMLCanvasElement;

  const processStroke = (inputs: number[]): void => {
    DrawStroke(canvas, detectShape(inputs), "#f00", 2);

    if (callback) {
      callback(inputs);
    }
  };

  if (stroke.length) {
    canvas = CreateCanvas(false);
    DrawStroke(canvas, stroke, "#000", 1);
    DrawStroke(canvas, detectShape(stroke), "#f00", 2);
  } else {
    canvas = CreateCanvas(true, processStroke);
  }

  return canvas;
}

export function InitVisualizer() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  let strokes: number[][] = [];
  const AddCanvasGroup = () => {
    const canvasGroup = CreateCanvasGroup((s: number[]) => {
      strokes.push(s);
      AddCanvasGroup();
    });
    container.prepend(canvasGroup);
  };

  AddCanvasGroup();

  const stringifyStroke = (s: number[]): string => `window.LoadStroke(${JSON.stringify(s)})`;

  window.GetAllStrokes = () => console.log(strokes.map(stringifyStroke).join("\n"));
  window.GetTopStroke = (cnt: number = 1) =>
    console.log(
      strokes
        .slice()
        .reverse()
        .filter((_, ix) => ix < cnt)
        .map(stringifyStroke)
        .join("\n")
    );
  window.LoadStroke = inputs => {
    const canvasGroup = CreateCanvasGroup(() => {}, inputs);
    container.append(canvasGroup);
    strokes.push(inputs);
  };

  PreloadStrokes();

  return function () {
    container.remove();
  };
}
