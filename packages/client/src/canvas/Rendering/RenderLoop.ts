import { TestFastRenderingSupport } from "../DeviceProps";
import Profiler from "../Profiler";
import { GL } from "./GL";

export class RenderLoop {
  private static renderFns: Function[];
  private static rerender: boolean;
  private static frameRendered: boolean;
  private static rendering: boolean;
  private static fastRender: boolean;
  private static enabled: boolean;
  private static running: boolean;
  private static renderLoopFn: () => void;

  public static get supportsFastRender() {
    if (this.fastRender == undefined) {
      this.fastRender = TestFastRenderingSupport();
    }
    return this.fastRender;
  }

  public static setActive(enabled: boolean) {
    this.enabled = enabled;
  }

  static scheduleRender() {
    RenderLoop.rerender = true;
    if (this.enabled && !this.running) {
      this.running = true;
      requestAnimationFrame(this.renderLoopFn);
    }
  }

  static render() {
    if (RenderLoop.rendering) {
      RenderLoop.scheduleRender();
      return;
    }

    Profiler.start("rendering");

    RenderLoop.rendering = true;

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
      this.renderLoopFn = () => RenderLoop.renderLoop();
      this.enabled = true;
      this.running = false;
    }

    RenderLoop.renderFns.push(fn);
  }

  private static renderLoop() {
    if (RenderLoop.rerender && !RenderLoop.frameRendered) {
      RenderLoop.rerender = false;
      RenderLoop.render();
    }

    RenderLoop.frameRendered = false;

    if (this.enabled || RenderLoop.rerender) {
      requestAnimationFrame(this.renderLoopFn);
    } else {
      this.running = false;
    }
  }
}
