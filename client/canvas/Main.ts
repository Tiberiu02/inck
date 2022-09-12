import { PageNavigation } from "./View/PageNavigation";
import { ScrollBars } from "./UI/Scrollbars";
import ToolWheel from "./UI/ToolWheel";
import { NetworkCanvasManager } from "./Network/NetworkCanvasManager";
import { NetworkConnection } from "./Network/NetworkConnection";
import { CanvasManager } from "./CanvasManager";
import { CaddieMenu } from "./UI/CaddieMenu";
import { PenEvent, PointerTracker } from "./UI/PointerTracker";
import { ToolManager } from "./Tooling/ToolManager";
import { BaseCanvasManager } from "./Rendering/BaseCanvasManager";
import { View } from "./View/View";
import { MutableObservableProperty, ObservableProperty } from "./DesignPatterns/Observable";
import { RenderLoop } from "./Rendering/RenderLoop";
import { PageSizeTracker } from "./Drawing/PageSizeTracker";
import { PdfCanvasManager } from "./PDF";
import { Vector2D } from "./Math/V2";
import { postFetchAPI } from "../components/GetApiPath.js"

export default class App {
  private canvasManager: CanvasManager;

  private network: NetworkConnection;
  private toolManager: ToolManager;

  private pageNavigation: PageNavigation;
  private pointerTracker: PointerTracker;

  private scrollBars: ScrollBars;
  private wheel: ToolWheel;
  private caddie: CaddieMenu;

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
    window.addEventListener("contextmenu", e => e.preventDefault());

    // Canvas
    this.canvasManager = new BaseCanvasManager();

    // Horizontal page size
    const yMax = new MutableObservableProperty<number>(0);
    this.canvasManager = new PageSizeTracker(this.canvasManager, yMax);

    // Network
    this.network = new NetworkConnection();
    this.canvasManager = new NetworkCanvasManager(this.canvasManager, this.network);

    // PDF import
    const wloc = window.location.pathname.match(/\/note\/([\w\d_]+)/);
    const docId = (wloc && wloc[1]) || "";
    this.checkBackground(docId, yMax)

    // Pointer tracker
    this.pointerTracker = new PointerTracker();
    this.pointerTracker.onPenEvent.addListener(e => this.handlePenEvent(e));

    // Enable navigation
    this.pageNavigation = new PageNavigation();
    this.pointerTracker.onFingerEvent.addListener(e => this.pageNavigation.handleFingerEvent(e));
    View.onUpdate(() => RenderLoop.scheduleRender());

    // Enable tooling
    this.toolManager = new ToolManager(this.canvasManager, this.network);

    // Create UI
    this.scrollBars = new ScrollBars(yMax as ObservableProperty<number>);
    this.wheel = new ToolWheel(this.toolManager);
    this.caddie = new CaddieMenu(this.toolManager, this.wheel);

    // Enable rendering
    RenderLoop.onRender(() => this.toolManager.render());
    RenderLoop.onRender(() => this.canvasManager.render());
  }

  async handlePenEvent(e: PenEvent) {
    e.preventDefault(); // hide touch callout on iOS

    // Hide tool wheel if open
    if (e.pressure && this.wheel.isVisible()) this.wheel.close();

    let [x, y] = View.getCanvasCoords(e.x, e.y);

    this.toolManager.update(x, y, e.pressure, e.timeStamp);
    this.caddie.updatePointer(e.pressure ? new Vector2D(e.x, e.y) : null);
  }

  checkBackground(docId: String, yMax: MutableObservableProperty<number>) {

    if (docId == "pdf") {
      this.canvasManager = new PdfCanvasManager(this.canvasManager, "/demo.pdf", yMax);
    }
    else if (docId == "pdf2") {
      this.canvasManager = new PdfCanvasManager(this.canvasManager, "/demo2.pdf", yMax);
    }
    else {
      console.log("fetching")
      postFetchAPI(
        "/api/pdf/serve-pdf", {
        docId
      }).then(async response => {
        if (response.status == "success" &&
          response.backgroundType == "pdf") {
            this.canvasManager = new PdfCanvasManager(
              this.canvasManager,
              response.pdfURL,
              yMax
            )
        } else {
          console.log("error while fetching background:")
        }
      })
    }
  }
}
