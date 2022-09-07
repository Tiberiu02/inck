import { CanvasManager } from "../../CanvasManager";
import { DeserializeGraphic, SerializedGraphic } from "../../Drawing/Graphic";
import { StrokePoint } from "../../types";
import { SerializedTool, TheirTool } from "../Tool";
import { Vector2D } from "../../Math/V2";
import { CreateEmitterClass, ProtectInstance } from "../../DesignPatterns/RemoteStateManagement";
import { SelectionBase } from "./SelectionBase";
import { Collaborator } from "../../Network/Collaborator";

export interface SerializedSelection extends SerializedTool {
  readonly selecting: boolean;
  readonly points: StrokePoint[];
  readonly selected: SerializedGraphic[];
  readonly toTranslateBy: Vector2D;
}

export class SelectionController {
  loadSelection(selected: SerializedGraphic[]) {}
  applyScaling() {}
  setScaling(factor: number) {}
  applyRotation() {}
  setRotation(angle: number) {}
  clearSelection() {}
  applyTranslation() {}
  setTranslation(delta: { x: number; y: number }) {}
  releaseLasso() {}
  updateLasso(x: number, y: number, pressure: number, timestamp: number) {}
}

export class TheirSelection extends SelectionBase implements SelectionController, TheirTool {
  constructor(canvasManager: CanvasManager) {
    super(canvasManager);
  }

  protected(): SelectionController {
    return ProtectInstance(this, SelectionController);
  }

  static deserialize(data: SerializedSelection, canvasManager: CanvasManager, collab: Collaborator): TheirSelection {
    const s = new TheirSelection(canvasManager);
    s.lassoColor = collab.getColor(0.8);
    s.lassoConnectorColor = collab.getColor(0.85);
    s.shadowColor = collab.getColor(0.9);
    if (data.selecting) {
      for (const p of data.points) {
        s.updateLasso(p.x, p.y, p.pressure, p.timestamp);
      }
    } else if (data.selected.length) {
      s.selected = data.selected.map(DeserializeGraphic);
      s.computeSelectionCenter();
      s.computeShadows();
    }
    return s;
  }
}

export const EmitterSelection = CreateEmitterClass(SelectionController);
