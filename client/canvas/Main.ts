import Profiler from "./Profiler";
import { ViewManager } from "./View/ViewManager";
import { ScrollBars } from "./UI/Scrollbars";
import ToolWheel from "./UI/ToolWheel";
import { NetworkCanvasManager } from "./Network/NetworkCanvasManager";
import { NetworkConnection } from "./Network/NetworkConnection";
import { CanvasManager } from "./CanvasManager";
import { ActionStack } from "./ActionsStack";
import { Tool } from "./Tools/Tool";
import { Vector2D } from "./types";
import { CaddieMenu } from "./UI/CaddieMenu";
import { PenEvent, PointerTracker } from "./PointerTracker";

function TestFastRenderingSupport() {
  const ua = navigator.userAgent;
  return (
    navigator.vendor != "Apple Computer, Inc." &&
    !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua) &&
    /Chrome/i.test(ua)
  );
}

export default class App {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  canvasManager: CanvasManager;
  animationFrameRequestId: number;
  viewManager: ViewManager;
  scrollBars: ScrollBars;
  wheel: ToolWheel;
  rerender: boolean;
  drawing: boolean;
  activeTool?: Tool;
  rendering: boolean;
  nextRender: number;
  network: NetworkConnection;
  actionStack: ActionStack;
  caddie: CaddieMenu;
  supportsFastRender: boolean;
  pointerTracker: PointerTracker;

  constructor() {
    this.canvas = document.createElement("canvas");
    document.body.appendChild(this.canvas);

    Object.assign(document.body.style, {
      width: "100vw",
      height: "100vh",
      "touch-action": "none",

      "-webkit-user-select": "none" /* Chrome all / Safari all */,
      "-moz-user-select": "none" /* Firefox all */,
      "-ms-user-select": "none" /* IE 10+ */,
      "user-select": "none" /* Likely future */,

      "-webkit-touch-callout": "none",
      "-webkit-tap-highlight-color": "transparent",

      overflow: "hidden",
    });

    // Create view
    this.viewManager = new ViewManager();
    this.viewManager.getView().onUpdate(() => this.scheduleRender());

    // Pointer tracker
    this.pointerTracker = new PointerTracker();
    this.pointerTracker.onPenEvent.addListener(e => this.handlePenEvent(e));
    this.pointerTracker.onFingerEvent.addListener(e => this.viewManager.handleFingerEvent(e));

    // Network
    this.network = new NetworkConnection();
    this.network.onUpdate(() => this.scheduleRender());
    window.addEventListener("pointermove", e =>
      this.network.updatePointer(new Vector2D(...this.viewManager.getView().getCanvasCoords(e.x, e.y)))
    );

    // Create canvas manager
    this.canvasManager = new NetworkCanvasManager(this.canvas, this.viewManager.getView(), this.network);
    this.canvasManager.onUpdate(() => this.scheduleRender());

    // Create scroll bars
    this.scrollBars = new ScrollBars(this.viewManager.getMutableView(), this.canvasManager.getYMax());

    window.addEventListener("wheel", e => this.viewManager.handleWheelEvent(e), { passive: false });
    window.addEventListener("mousemove", e => this.viewManager.handleMouseEvent(e));

    this.supportsFastRender = TestFastRenderingSupport();

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
    if (this.rerender) {
      delete this.rerender;
      this.render();
    }

    requestAnimationFrame(() => this.renderLoop());
  }

  handlePenEvent(e: PenEvent) {
    if (this.scrollBars.scrolling) return;

    if (!e.pressure && !this.activeTool) return;

    e.preventDefault(); // hide touch callout on iOS

    // Hide tool wheel if open
    if (e.pressure && this.wheel.isVisible()) this.wheel.close();

    let { pressure, timeStamp } = e;
    let [x, y] = this.viewManager.getView().getCanvasCoords(e.x, e.y);

    // Create new tool
    if (!this.activeTool) {
      this.activeTool = this.wheel.NewTool();
      this.network.updateTool(this.activeTool);
    }

    if (!pressure) {
      // Release tool
      this.activeTool.release();
      this.activeTool = undefined;
      this.network.updateTool(undefined);
    } else {
      // Update tool
      this.activeTool.update(x, y, pressure, timeStamp);
      this.network.updateInput(x, y, pressure, timeStamp);
    }

    // Render
    this.supportsFastRender ? this.render() : this.scheduleRender();

    this.caddie.updatePointer(pressure ? new Vector2D(e.x, e.y) : null);
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
      this.activeTool.render();
      Profiler.stop("active stroke");
    }
    this.canvasManager.render();

    this.nextRender = performance.now() + (performance.now() - renderStart) * 3;
    this.rendering = false;
  }
}
