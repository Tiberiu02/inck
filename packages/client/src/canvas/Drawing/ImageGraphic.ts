import { Graphic } from "./Graphic";

export interface ImageGraphic extends Graphic {
  readonly pixels: HTMLCanvasElement | HTMLImageElement;
  left: number;
  top: number;
  width: number;
  height: number;
  texture?: WebGLTexture;
}
