import Profiler from "./Profiler";
import { ViewManager } from "./View/ViewManager";
import { ScrollBars } from "./UI/Scrollbars";
import ToolWheel from "./UI/ToolWheel";
import { NetworkCanvasManager } from "./Network/NetworkCanvasManager";
import { NetworkConnection } from "./Network/NetworkConnection";
import { CanvasManager } from "./CanvasManager";
import { ActionStack } from "./ActionsStack";
import { Tool } from "./Tools/Tool";
import { StrokeEraser } from "./Tools/Eraser";
import { Pen } from "./Tools/Pen";
import { iosTouch, SimplePointerEvent } from "./types";
import { CaddieMenu } from "./UI/CaddieMenu";

export default class App {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  canvasManager: CanvasManager;
  animationFrameRequestId: number;
  viewManager: ViewManager;
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
  actionStack: ActionStack;
  caddie: CaddieMenu;

  constructor(canvas) {
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
    this.viewManager = new ViewManager();
    this.viewManager.getView().onChange(() => this.scheduleRender());

    this.network = new NetworkConnection();
    this.network.onChange(() => this.scheduleRender());

    // Create canvas manager
    this.canvasManager = new NetworkCanvasManager(this.canvas, this.viewManager.getView(), this.network);
    this.canvasManager.onChange(() => this.scheduleRender());

    // Create scroll bars
    this.scrollBars = new ScrollBars(this.viewManager.getMutableView(), this.canvasManager.getYMax());

    // Adjust canvas size
    this.resizeCanvas();

    window.addEventListener("wheel", e => this.viewManager.handleWheelEvent(e), { passive: false });
    window.addEventListener("mousemove", e => this.viewManager.handleMouseEvent(e));
    this.canvas.addEventListener("touchstart", (e: TouchEvent) => this.viewManager.handleTouchEvent(e));
    this.canvas.addEventListener("touchend", (e: TouchEvent) => this.viewManager.handleTouchEvent(e));
    this.canvas.addEventListener("touchcancel", (e: TouchEvent) => this.viewManager.handleTouchEvent(e));
    this.canvas.addEventListener("touchmove", (e: TouchEvent) => this.viewManager.handleTouchEvent(e));

    // Add event listeners
    // Different listeners for Apple devices
    // because pointer events API is broken in Safari (yay!)
    if (navigator.vendor == "Apple Computer, Inc.") {
      window.addEventListener("mousedown", this.handleMouseEvent.bind(this));
      window.addEventListener("mousemove", this.handleMouseEvent.bind(this));
      window.addEventListener("mouseup", this.handleMouseEvent.bind(this));

      window.addEventListener("touchdown", this.handleTouchEvent.bind(this));
      window.addEventListener("touchmove", this.handleTouchEvent.bind(this));
      window.addEventListener("touchend", this.handleTouchEvent.bind(this));
    } else {
      window.addEventListener("pointerdown", this.handlePointerEvent.bind(this));
      window.addEventListener("pointermove", this.handlePointerEvent.bind(this));
      window.addEventListener("pointerup", this.handlePointerEvent.bind(this));
      window.addEventListener("pointerleave", this.handlePointerEvent.bind(this));
      window.addEventListener("pointerout", this.handlePointerEvent.bind(this));
    }

    window.addEventListener("contextmenu", e => e.preventDefault());

    this.actionStack = new ActionStack();

    // Create tool wheel
    this.wheel = new ToolWheel(this.viewManager.getView(), this.canvasManager, this.actionStack);

    this.caddie = new CaddieMenu(this.actionStack, this.wheel);

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

  // iOS
  handleMouseEvent(e: MouseEvent) {
    e.preventDefault();
    let pointerEvent = {
      pointerId: 0,
      type: e.type.replace("touch", "pointer").replace("end", "up"),
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

  // iOS
  handleTouchEvent(e: TouchEvent) {
    const t = e.changedTouches[0] as iosTouch;
    const pointerEvent = {
      pointerId: t.identifier,
      type: e.type.replace("touch", "pointer").replace("end", "up"),
      x: t.clientX,
      y: t.clientY,
      pressure: e.type == "touchend" ? 0 : t.touchType == "stylus" ? t.force : 0.5,
      timeStamp: performance.now(),
      target: t.target,
      pointerType: t.touchType == "stylus" ? "pen" : "touch",
      id: t.identifier,
      preventDefault: () => e.preventDefault(),
    };

    this.handlePointerEvent(pointerEvent);
  }

  handlePointerEvent(e: SimplePointerEvent) {
    //console.log(e, e.target);
    this.scrollBars.handlePointerEvent(e);

    if (!this.scrollBars.scrolling() && e.target == this.canvas) {
      e.preventDefault();

      if (e.pressure && this.wheel.isVisible() && this.openingWheel) return;

      if (e.pressure && this.wheel.isVisible() && !this.openingWheel) this.wheel.close();

      if (!e.pressure && this.openingWheel) this.openingWheel = false;

      let { type, pressure, timeStamp, pointerType } = e;
      let [x, y] = this.viewManager.getView().getCanvasCoords(e.x, e.y);

      this.drawing = pressure > 0 && pointerType != "touch";

      if (pointerType != "touch") {
        if (pressure) {
          // Writing
          if (!this.activeTool) {
            // New stroke
            this.activeTool = this.wheel.NewTool();
            if (!(this.activeTool instanceof StrokeEraser)) {
              this.network.updateTool(this.activeTool);
            }
            console.log("new tool");
            // Long press eraser gesture
            let d = pointerType == "pen" ? 15 : 1;
            d = this.viewManager.getView().getCanvasCoords(d, 0, true)[0];

            this.activeTool.ifLongPress(pointerType == "pen" ? 500 : 1000, d, () => {
              this.activeTool.release();
              if (this.activeTool instanceof Pen) {
                this.actionStack.undo();
              }
              this.openingWheel = true;
              this.activeTool = undefined;
              this.wheel.close();
              this.wheel.show(e.x, e.y);
              console.log(e.x, e.y);
              this.render();
            });
          }

          this.activeTool.update(x, y, pressure, timeStamp);
          if (!(this.activeTool instanceof StrokeEraser)) {
            this.network.updateInput(x, y, pressure, timeStamp);
          }
          this.render();
        } else if (this.activeTool) {
          // Finished stroke
          this.activeTool.release();
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

    if (this.activeTool && !(this.activeTool instanceof StrokeEraser)) {
      Profiler.start("active stroke");
      this.activeTool.render();
      Profiler.stop("active stroke");
    }
    this.canvasManager.render();

    this.nextRender = performance.now() * 2 - renderStart;
    this.rendering = false;
  }
}
