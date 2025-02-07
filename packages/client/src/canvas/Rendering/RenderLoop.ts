import { TestFastRenderingSupport } from "../DeviceProps";
import { GL } from "./GL";

export class RenderLoop {
  private static renderFn: Function[];
  private static rerender: boolean;
  private static rendering: boolean;
  private static nextRender: number;
  private static fastRender: boolean;

  public static get supportsFastRender() {
    if (this.fastRender == undefined) {
      this.fastRender = TestFastRenderingSupport();
    }
    return this.fastRender;
  }

  static scheduleRender() {
    RenderLoop.rerender = true;
  }

  static render() {
    if (RenderLoop.rendering || (RenderLoop.nextRender && performance.now() < RenderLoop.nextRender)) {
      RenderLoop.scheduleRender();
      return;
    }

    RenderLoop.rendering = true;
    const renderStart = performance.now();

    GL.ensureCanvasSize();
    GL.clear();

    for (const fn of RenderLoop.renderFn) {
      fn();
    }

    RenderLoop.nextRender = performance.now() + (performance.now() - renderStart) * 3;
    RenderLoop.rendering = false;
  }

  static onRender(fn: () => void) {
    if (!RenderLoop.renderFn) {
      RenderLoop.renderFn = [];
      requestAnimationFrame(() => RenderLoop.renderLoop());
    }

    RenderLoop.renderFn.push(fn);
  }

  private static renderLoop() {
    if (RenderLoop.rerender) {
      delete RenderLoop.rerender;
      RenderLoop.render();
    }

    requestAnimationFrame(() => RenderLoop.renderLoop());
  }
}
