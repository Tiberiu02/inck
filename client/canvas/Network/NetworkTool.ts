import { SerializedTool, Tool } from "../Tooling/Tool";
import { NetworkConnection } from "./NetworkConnection";

export class NetworkTool implements Tool {
  private baseTool: Tool;
  private network: NetworkConnection;
  private isPressing: boolean;

  constructor(network: NetworkConnection) {
    this.network = network;

    network.on("new collaborator", (id: string) => {
      network.updateTool(this.baseTool);
    });
  }

  setTool(tool: Tool) {
    this.baseTool = tool;
  }

  getTool() {
    return this.baseTool;
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    if (this.baseTool) {
      if (pressure && !this.isPressing) {
        this.network.updateTool(this.baseTool);
      }
      this.isPressing = pressure > 0;

      this.baseTool.update(x, y, pressure, timestamp);
      this.network.updateInput(x, y, pressure, timestamp);
    }
  }

  render(): void {
    if (this.baseTool) {
      this.baseTool.render();
    }
  }

  serialize(): SerializedTool {
    if (this.baseTool) {
      return this.baseTool.serialize();
    }
  }
}
