import { ActionStack } from "./ActionsStack";
import { CanvasManager } from "../CanvasManager";
import { Pen, SerializedPen } from "./Pen";
import { Selection, SerializedSelection } from "./Selection";

export interface SerializedTool {
  readonly deserializer: string;
}

export interface Tool {
  update(x: number, y: number, pressure: number, timestamp: number): void;
  render(): void;
  release(): void;
  serialize(): SerializedTool;
}

export function DeserializeTool(data: SerializedTool, canvasManager: CanvasManager, actionStack?: ActionStack): Tool {
  if (data.deserializer == "pen") {
    return Pen.deserialize(data as SerializedPen, canvasManager, actionStack);
  } else if (data.deserializer == "selection") {
    return Selection.deserialize(data as SerializedSelection, canvasManager, actionStack);
  }

  return null;
}
