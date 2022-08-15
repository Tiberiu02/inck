import { ActionStack } from "./ActionsStack";
import { CanvasManager } from "../CanvasManager";
import { Pen, SerializedPen } from "./Pen";

export interface SerializedTool {
  readonly deserializer: string;
}

export interface Tool {
  update(x: number, y: number, pressure: number, timestamp: number): void;
  render(): void;
  serialize(): SerializedTool;
}

export function DeserializeTool(data: SerializedTool, canvasManager: CanvasManager, actionStack?: ActionStack): Tool {
  if (data.deserializer == "pen") {
    return Pen.deserialize(data as SerializedPen, canvasManager, actionStack);
  }

  return null;
}
