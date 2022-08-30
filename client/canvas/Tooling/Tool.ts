import { ActionStack } from "./ActionsStack";
import { CanvasManager } from "../CanvasManager";
import { CollabPen, SerializedPen } from "./Pen";
import { CollabSelection, SerializedSelection } from "./Selection";

export interface SerializedTool {
  readonly deserializer: string;
}

export interface Tool {
  update(x: number, y: number, pressure: number, timestamp: number): void;
  render(): void;
  release(): void;
  serialize(): SerializedTool;
}
