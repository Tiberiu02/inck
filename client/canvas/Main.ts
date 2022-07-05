import Profiler from "./Profiler";
import { GL, ELEMENTS_PER_VERTEX } from "./GL";
import { ViewManager } from "./Gestures";
import Connector from "./Connector";
import { ShowCircularWave, ScrollBars, ComputeDPI } from "./UI";
import Buffers from "./Buffers";
import ToolWheel from "./ToolWheel";
import { Tool } from "./Tools";
import { CanvasManager } from "./CanvasManager";

export default class App {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  canvasManager: CanvasManager;
  programs: { [k: string]: WebGLProgram };
  detach: () => void;
  animationFrameRequestId: number;
  view: ViewManager;
  scrollBars: ScrollBars;
  activeBuffer: WebGLBuffer;
  staticBuffers: Buffers;
  wheel: ToolWheel;
  connector: Connector;
  rerender: boolean;
  skipResizeFrames: any;
  animationId: number;
  openingWheel: any;
  drawing: boolean;
  activeTool?: Tool;
  lastLiveUpdate: any;
  rendering: boolean;
  nextRender: number;

  constructor(canvas) {
    ComputeDPI();

    this.canvas = canvas;
    Object.assign(document.body.style, {
      width: "100vw",
      height: "100vh",
      "touch-action": "none",

      "-webkit-user-select": "none" /* Chrome all / Safari all */,
      "-moz-user-select": "none" /* Firefox all */,
      "-ms-user-select": "none" /* IE 10+ */,
      "user-select": "none" /* Likely future */,

      "-webkit-touch-callout": "none",

      overflow: "hidden",
    });

    // Create WebGL
    this.gl = GL.initWebGL(this.canvas);
    this.programs = {
      canvas: GL.createProgram(this.gl),
    };

    // Create view
    this.view = new ViewManager(this);
    this.view.disableWindowOverscrolling();

    // Create canvas manager
    this.canvasManager = new CanvasManager(this.canvas, this.gl, this.programs.canvas, () => this.view.getUniforms());

    // Create scroll bars
    this.scrollBars = new ScrollBars("rgba(0, 0, 0, 0.5)", 10, 0);

    // Create buffers
    this.activeBuffer = this.gl.createBuffer();
    this.staticBuffers = new Buffers(this.gl, "DYNAMIC_DRAW");

    // Adjust canvas size
    this.resizeCanvas();

    // Add event listeners
    // Different listeners for Apple devices
    // because pointer events API is broken in Safari (yay!)
    if (navigator.vendor == "Apple Computer, Inc.") {
      this.addEventListener(window, "mousedown", this.handleMouseEvent.bind(this), false);
      this.addEventListener(window, "mousemove", this.handleMouseEvent.bind(this), false);
      this.addEventListener(window, "mouseup", this.handleMouseEvent.bind(this), false);

      this.addEventListener(window, "touchdown", this.handleTouchEvent.bind(this), false);
      this.addEventListener(window, "touchmove", this.handleTouchEvent.bind(this), false);
      this.addEventListener(window, "touchend", this.handleTouchEvent.bind(this), false);
    } else {
      this.addEventListener(window, "pointerdown", this.handlePointerEvent.bind(this));
      this.addEventListener(window, "pointermove", this.handlePointerEvent.bind(this));
      this.addEventListener(window, "pointerup", this.handlePointerEvent.bind(this));
      this.addEventListener(window, "pointerleave", this.handlePointerEvent.bind(this));
      this.addEventListener(window, "pointerout", this.handlePointerEvent.bind(this));
    }

    this.addEventListener(window, "contextmenu", e => e.preventDefault());

    // Create tool wheel
    this.wheel = new ToolWheel(this, {
      undo: () => console.log("Undo"),
      redo: () => console.log("Redo"),
      settings: () => console.log("settings"),
    });

    // Start rendering loop
    this.animationFrameRequestId = requestAnimationFrame(() => this.renderLoop());

    // Connect to the backend server
    this.connector = new Connector(this.canvasManager, () => this.scheduleRender());

    this.detach = () => {
      cancelAnimationFrame(this.animationFrameRequestId);
      console.log("detached!");
      this.scrollBars.horizontal.remove();
      this.scrollBars.vertical.remove();
      this.connector.socket.disconnect();
    };
  }

  addEventListener(target: HTMLElement | Window, type: string, handler: (e: Event) => void, options?: object | boolean) {
    target.addEventListener(type, handler, options);
    const detach = this.detach;
    this.detach = () => {
      target.removeEventListener(type, handler, options);
      detach();
    };
  }

  scheduleRender() {
    this.rerender = true;
  }

  renderLoop() {
    const isCorrectSize =
      this.canvas.width == Math.round(document.documentElement.clientWidth * devicePixelRatio) &&
      this.canvas.height == Math.round(document.documentElement.clientHeight * devicePixelRatio);

    if (!isCorrectSize && !this.skipResizeFrames) {
      console.log("detected resize");
      this.resizeCanvas();
    }

    if (this.skipResizeFrames > 0) this.skipResizeFrames--;

    if (this.rerender) {
      delete this.rerender;
      this.render();
      // For some reason, drawing and resizing very fast causes black screen.
      // Skipping resize for a few frames.
      this.skipResizeFrames = 5;
    }

    this.animationId = requestAnimationFrame(() => this.renderLoop());
  }

  resizeCanvas() {
    this.canvas.style.width = document.documentElement.clientWidth + "px";
    this.canvas.style.height = document.documentElement.clientHeight + "px";
    this.canvas.width = Math.round(document.documentElement.clientWidth * window.devicePixelRatio);
    this.canvas.height = Math.round(document.documentElement.clientHeight * window.devicePixelRatio);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    this.scheduleRender();
  }

  // to remove
  handleMouseEvent(e) {
    e.preventDefault();
    let pointerEvent = {
      x: e.x,
      y: e.y,
      pressure: e.buttons ? 0.5 : 0,
      timeStamp: performance.now(),
      target: e.target,
      pointerType: "mouse",
      preventDefault: () => e.preventDefault(),
    };
    this.handlePointerEvent(pointerEvent);
  }

  handleTouchEvent(e) {
    const t = e.changedTouches[0];
    const pointerEvent = {
      x: t.clientX,
      y: t.clientY,
      pressure: e.type == "touchend" ? 0 : t.touchType == "stylus" ? t.force : 0.5,
      timeStamp: performance.now(),
      target: t.target,
      pointerType: "pen",
      id: t.identifier,
      preventDefault: () => e.preventDefault(),
    };

    if (t.touchType === "stylus") {
      // stylus
      this.handlePointerEvent(pointerEvent);
    } else if (this.scrollBars.scrolling() || t.target == this.scrollBars.vertical || t.target == this.scrollBars.horizontal) {
      // scrollbar
      this.scrollBars.handlePointerEvent(pointerEvent, this.view, this.staticBuffers.yMax);
      this.scheduleRender();
    } // gesture
    else this.view.handleTouchEvent(e);
  }

  handlePointerEvent(e) {
    if (this.scrollBars.scrolling() || e.target == this.scrollBars.vertical || e.target == this.scrollBars.horizontal) {
      this.scrollBars.handlePointerEvent(e, this.view, this.staticBuffers.yMax);
      this.scheduleRender();
    } else if (e.target == this.canvas) {
      e.preventDefault();

      if (e.pressure && this.wheel.isVisible() && this.openingWheel) return;

      if (e.pressure && this.wheel.isVisible() && !this.openingWheel) this.wheel.hide();

      if (!e.pressure && this.openingWheel) this.openingWheel = false;

      let { type, pressure, timeStamp, pointerType } = e;
      let [x, y] = this.view.mapCoords(e.x, e.y);

      this.drawing = pressure > 0 && pointerType != "touch";

      if (pointerType != "touch") {
        if (pressure) {
          // Writing
          if (!this.activeTool) {
            // New stroke
            this.activeTool = this.wheel.NewTool();
            console.log("new tool");
            // Long press eraser gesture
            const d = pointerType == "pen" ? 15 : 1;
            this.activeTool.ifLongPress(pointerType == "pen" ? 500 : 1000, d / innerWidth / this.view.zoom, () => {
              this.activeTool.delete();
              this.openingWheel = true;
              this.activeTool = undefined;
              this.wheel.hide();
              this.wheel.show(e.x, e.y);
              console.log(e.x, e.y);
              this.render();
            });
          }

          this.activeTool.update(x, y, pressure, timeStamp);
          this.render();
        } else if (this.activeTool) {
          // Finished stroke
          this.canvasManager.addStroke(this.activeTool);
          this.connector.registerStroke(this.activeTool.serialize());

          this.activeTool.delete();
          delete this.activeTool;
          delete this.lastLiveUpdate;

          this.render();
        }

        const FPS = this.activeTool ? 20 : 60;
        if (!this.lastLiveUpdate || this.lastLiveUpdate + 1000 / FPS < performance.now()) {
          const pointer = type == "pointerleave" || type == "pointerout" ? undefined : { x, y };
          const activeStroke = this.activeTool ? this.activeTool.serialize() : undefined;
          this.connector.socket.emit("live update", pointer, activeStroke);
          this.lastLiveUpdate = performance.now();
        }
      }
    }
  }

  render() {
    if (this.rendering || (this.nextRender && performance.now() < this.nextRender)) {
      this.scheduleRender();
      return;
    }

    this.rendering = true;
    const renderStart = performance.now();
    Profiler.start("rendering");

    this.canvasManager.clearCanvas();

    if (this.activeTool) {
      this.canvasManager.addActiveStroke(this.activeTool);
    }
    this.connector.drawCollabs(this.view, (activeTool: Tool) => {
      this.canvasManager.addActiveStroke(activeTool);
    });
    this.canvasManager.render();

    this.scrollBars.update(this.view, this.staticBuffers.yMax);

    Profiler.stop("rendering");
    this.nextRender = performance.now() * 2 - renderStart;
    this.rendering = false;
  }
}
