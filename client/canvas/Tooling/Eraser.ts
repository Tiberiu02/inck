import { ActionStack } from "./ActionsStack";
import { LayeredStrokeContainer } from "../LayeredStrokeContainer";
import { MyTool } from "./Tool";
import { NetworkConnection } from "../Network/NetworkConnection";
import { GenerateRandomString } from "../Math/RandomString";
import { RemovedGraphic } from "../Drawing/Graphic";

export class StrokeEraser implements MyTool {
  private x: number;
  private y: number;
  private strokeContainer: LayeredStrokeContainer;
  private actionStack: ActionStack;
  private network: NetworkConnection;

  constructor(strokeContainer: LayeredStrokeContainer, actionStack: ActionStack, network: NetworkConnection) {
    this.strokeContainer = strokeContainer;
    this.actionStack = actionStack;
    this.network = network;
  }

  update(x: number, y: number, pressure: number, timeStamp: number): void {
    if (pressure) {
      const x2 = this.x ?? x;
      const y2 = this.y ?? y;

      this.x = x;
      this.y = y;

      const line = { x1: x, y1: y, x2, y2 };
      this.strokeContainer
        .getAll()
        .filter((s) => s && s.geometry.intersectsLine(line))
        .forEach((s) => {
          this.strokeContainer.add(RemovedGraphic(s.id));
          this.actionStack.push({
            undo: () => {
              // TODO: Add stroke at the same index as before
              this.strokeContainer.add((s = { ...s, id: GenerateRandomString() }));
              return true;
            },
            redo: () => this.strokeContainer.add(RemovedGraphic(s.id)),
          });
        });
    } else {
      this.x = null;
      this.y = null;
    }
  }

  render(): void {}

  release(): void {}

  serialize() {
    return null;
  }
}
