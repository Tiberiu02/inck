export interface SerializedTool {
  readonly deserializer: string;
}

export interface MyTool {
  update(x: number, y: number, pressure: number, timestamp: number): void;
  render(layerRendered: number): void;
  release(): void;
  serialize(): SerializedTool;
}

export interface TheirTool {
  render(layerRendered: number): void;
  protected(): any;
}
