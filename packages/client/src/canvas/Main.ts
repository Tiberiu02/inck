import { PageNavigation } from "./View/PageNavigation";
import { ScrollBars } from "./UI/Scrollbars";
import ToolWheel from "./UI/ToolWheel";
import { NetworkStrokeContainer } from "./Network/NetworkStrokeContainer";
import { NetworkConnection } from "./Network/NetworkConnection";
import { LayeredStrokeContainer } from "./LayeredStrokeContainer";
import { CaddieMenu } from "./UI/CaddieMenu";
import { PenEvent, PointerTracker } from "./UI/PointerTracker";
import { ToolManager } from "./Tooling/ToolManager";
import { BaseStrokeContainer } from "./Rendering/BaseStrokeContainer";
import { View } from "./View/View";
import { MutableObservableProperty, ObservableProperty } from "./DesignPatterns/Observable";
import { RenderLoop } from "./Rendering/RenderLoop";
import { PageSizeTracker } from "./Drawing/PageSizeTracker";
import { PdfBackground } from "./PDF/PdfBackground";
import { Vector2D } from "./Math/V2";
import GetApiPath from "../components/GetApiPath";
import { GL } from "./Rendering/GL";
import { NoteToPdf } from "./PDF/PdfExport";
import { LinesBackground } from "./Backgrounds/LinesBackground";
import { Background } from "./types";
import { Display } from "./DeviceProps";
import { GridBackground } from "./Backgrounds/GridBackground";
import { BackgroundTypes } from "@inck/common-types/Notes";

export const NUM_LAYERS = 2;
export const HIGHLIGHTER_OPACITY = 0.35;

export default class App {
  private strokeContainer: LayeredStrokeContainer;

  private network: NetworkConnection;
  private toolManager: ToolManager;

  private pageNavigation: PageNavigation;
  private pointerTracker: PointerTracker;

  private scrollBars: ScrollBars;
  private wheel: ToolWheel;
  private caddie: CaddieMenu;
  private background: Background;

  constructor() {
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
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    // Init graphics
    GL.init();

    // Canvas
    this.strokeContainer = new BaseStrokeContainer(NUM_LAYERS);

    // Horizontal page size
    const yMax = new MutableObservableProperty<number>(0);
    this.strokeContainer = new PageSizeTracker(this.strokeContainer, yMax);
    this.scrollBars = new ScrollBars(yMax as ObservableProperty<number>);

    // Network
    this.network = new NetworkConnection();
    this.strokeContainer = new NetworkStrokeContainer(this.strokeContainer, this.network);

    this.network.on("load note", (data: any) => {
      // PDF import
      if (!this.background) {
        if (data.pdfUrl) {
          this.background = new PdfBackground(GetApiPath(data.pdfUrl), yMax);
        } else if (data.bgPattern == BackgroundTypes.grid) {
          this.background = new GridBackground(data.bgSpacing || 0.015);
        } else if (data.bgPattern == BackgroundTypes.lines) {
          this.background = new LinesBackground(data.bgSpacing || 0.03);
        }
      }
    });

    // Pointer tracker
    this.pointerTracker = new PointerTracker();
    this.pointerTracker.onPenEvent.addListener((e) => this.handlePenEvent(e));
    this.pointerTracker.onPenButton.addListener((buttonState) => {
      buttonState ? this.toolManager.enableEraser() : this.toolManager.disableEraser();
      this.caddie.refreshEraserButton();
    });

    // Enable navigation
    this.pageNavigation = new PageNavigation();
    this.pointerTracker.onFingerEvent.addListener((e) => this.pageNavigation.handleFingerEvent(e));
    View.onUpdate(() => RenderLoop.scheduleRender());

    // Enable tooling
    this.toolManager = new ToolManager(this.strokeContainer, this.network);

    // Create UI
    this.wheel = new ToolWheel(this.toolManager);
    this.caddie = new CaddieMenu(this.toolManager, this.wheel);

    // Enable rendering
    RenderLoop.onRender(() => {
      if (this.background) {
        this.background.render();
      }

      GL.beginLayer();
      this.strokeContainer.render(0);
      this.toolManager.render(0);
      GL.finishLayer(HIGHLIGHTER_OPACITY);

      this.strokeContainer.render(1);
      this.toolManager.render(1);
    });

    window.addEventListener("resize", () => RenderLoop.scheduleRender());
  }

  async handlePenEvent(e: PenEvent) {
    e.preventDefault(); // hide touch callout on iOS

    // Hide tool wheel if open
    if (e.pressure && this.wheel.isVisible()) this.wheel.close();

    let [x, y] = View.getCanvasCoords(e.x, e.y);

    this.toolManager.update(x, y, e.pressure, e.timeStamp);
    this.caddie.updatePointer(e.pressure ? new Vector2D(e.x, e.y) : null);
  }
}
