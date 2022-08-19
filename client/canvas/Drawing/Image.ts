import { Drawable } from "./Drawable";

export interface Image extends Drawable {
  pixels: HTMLCanvasElement | HTMLImageElement;
  texture?: WebGLTexture;
}
