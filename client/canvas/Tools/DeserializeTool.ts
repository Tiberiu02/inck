import { ActionStack } from "../ActionsStack";
import { CanvasManager } from "../CanvasManager";
import { Pen } from "./Pen";
import { Tool } from "./Tool";

export function DeserializeTool(data: any, canvasManager: CanvasManager, actionStack?: ActionStack): Tool {
  if (data && data.type == "p") {
    return Pen.deserialize(data, canvasManager, actionStack);
  }
}
