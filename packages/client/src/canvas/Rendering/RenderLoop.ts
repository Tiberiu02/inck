import { TestFastRenderingSupport } from "../DeviceProps";
import Profiler from "../Profiler";
import { GL } from "./GL";

export class RenderLoop {
  private static renderFns: Function[];
  private static rerender: boolean;
  private static frameRendered: boolean;
  private static rendering: boolean;
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
    if (RenderLoop.rendering) {
      RenderLoop.scheduleRender();
      return;
    }

    Profiler.start("rendering");

    RenderLoop.rendering = true;

    GL.ensureCanvasSize();

    for (const fn of RenderLoop.renderFns) {
      fn();
    }

    RenderLoop.rendering = false;
    RenderLoop.frameRendered = true;
    Profiler.stop("rendering");
  }

  static onRender(fn: () => void) {
    if (!RenderLoop.renderFns) {
      RenderLoop.renderFns = [];
      requestAnimationFrame(() => RenderLoop.renderLoop());
    }

    RenderLoop.renderFns.push(fn);
  }

  private static renderLoop() {
    if (RenderLoop.rerender && !RenderLoop.frameRendered) {
      RenderLoop.render();
      RenderLoop.rerender = false;
    }

    RenderLoop.frameRendered = false;
    requestAnimationFrame(() => RenderLoop.renderLoop());
  }
}
