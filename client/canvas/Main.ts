import Profiler from "./Profiler";
import { ViewManager } from "./Gestures";
import { ScrollBars, ComputeDPI } from "./UI";
import ToolWheel from "./ToolWheel";
import { NetworkCanvasManager } from "./Network/NetworkCanvasManager";
import { Tool } from "./Tools";
import { NetworkConnection } from "./Network/NetworkConnection";
import { CanvasManager } from "./CanvasManager";
import { ActionStack } from "./ActionsStack";

export default class App {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  canvasManager: CanvasManager;
  animationFrameRequestId: number;
  view: ViewManager;
  scrollBars: ScrollBars;
  wheel: ToolWheel;
  rerender: boolean;
  skipResizeFrames: any;
  openingWheel: any;
  drawing: boolean;
  activeTool?: Tool;
  rendering: boolean;
  nextRender: number;
  network: NetworkConnection;
  actions: ActionStack;

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

    // Create view
    this.view = new ViewManager(this);
    this.view.disableWindowOverscrolling();

    this.network = new NetworkConnection(() => this.scheduleRender());

    // Create canvas manager
    this.canvasManager = new NetworkCanvasManager(this.canvas, this.view, this.network);

    // Create scroll bars
    this.scrollBars = new ScrollBars("rgba(0, 0, 0, 0.5)", 10, 0);

    // Adjust canvas size
    this.resizeCanvas();

    // Add event listeners
    // Different listeners for Apple devices
    // because pointer events API is broken in Safari (yay!)
    if (navigator.vendor == "Apple Computer, Inc.") {
      window.addEventListener("mousedown", this.handleMouseEvent.bind(this), false);
      window.addEventListener("mousemove", this.handleMouseEvent.bind(this), false);
      window.addEventListener("mouseup", this.handleMouseEvent.bind(this), false);

      window.addEventListener("touchdown", this.handleTouchEvent.bind(this), false);
      window.addEventListener("touchmove", this.handleTouchEvent.bind(this), false);
      window.addEventListener("touchend", this.handleTouchEvent.bind(this), false);
    } else {
      window.addEventListener("pointerdown", this.handlePointerEvent.bind(this));
      window.addEventListener("pointermove", this.handlePointerEvent.bind(this));
      window.addEventListener("pointerup", this.handlePointerEvent.bind(this));
      window.addEventListener("pointerleave", this.handlePointerEvent.bind(this));
      window.addEventListener("pointerout", this.handlePointerEvent.bind(this));
    }

    window.addEventListener("contextmenu", e => e.preventDefault());

    // Create tool wheel
    this.wheel = new ToolWheel(this, {
      undo: () => {
        this.actions.undo();
        this.render();
      },
      redo: () => {
        this.actions.redo();
        this.render();
      },
      settings: () => console.log("settings"),
    });

    this.actions = new ActionStack();

    requestAnimationFrame(() => this.renderLoop());
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

    requestAnimationFrame(() => this.renderLoop());
  }

  resizeCanvas() {
    this.canvas.style.width = document.documentElement.clientWidth + "px";
    this.canvas.style.height = document.documentElement.clientHeight + "px";
    this.canvas.width = Math.round(document.documentElement.clientWidth * window.devicePixelRatio);
    this.canvas.height = Math.round(document.documentElement.clientHeight * window.devicePixelRatio);
    this.canvasManager.viewport(0, 0, this.canvas.width, this.canvas.height);

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
    } else if (
      this.scrollBars.scrolling() ||
      t.target == this.scrollBars.vertical ||
      t.target == this.scrollBars.horizontal
    ) {
      // scrollbar
      this.scrollBars.handlePointerEvent(pointerEvent, this.view, this.canvasManager.yMax);
      this.scheduleRender();
    } // gesture
    else this.view.handleTouchEvent(e);
  }

  handlePointerEvent(e) {
    //console.log(e, e.target);
    if (this.scrollBars.scrolling() || e.target == this.scrollBars.vertical || e.target == this.scrollBars.horizontal) {
      this.scrollBars.handlePointerEvent(e, this.view, this.canvasManager.yMax);
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
            this.network.updateTool(this.activeTool);
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
          this.network.updateInput(x, y, pressure, timeStamp);
          this.render();
        } else if (this.activeTool) {
          // Finished stroke
          const stroke = this.activeTool;
          this.canvasManager.addStroke(stroke);
          console.log(stroke.zIndex, stroke.id);
          this.actions.push({
            undo: () => this.canvasManager.removeStroke(stroke.id),
            redo: () => this.canvasManager.addStroke(stroke),
          });

          this.activeTool.delete();
          this.activeTool = undefined;
          this.network.updateTool(undefined);

          this.render();
        }

        const pointer = type == "pointerleave" || type == "pointerout" ? undefined : { x, y };
        this.network.updatePointer(pointer);
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

    if (this.activeTool) {
      Profiler.start("active stroke");
      this.canvasManager.addActiveStroke(this.activeTool);
      Profiler.stop("active stroke");
    }
    this.canvasManager.render();

    this.scrollBars.update(this.view, this.canvasManager.yMax);

    this.nextRender = performance.now() * 2 - renderStart;
    this.rendering = false;
  }
}
