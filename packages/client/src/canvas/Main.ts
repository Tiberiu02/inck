import { PageNavigation } from "./View/PageNavigation";
import { ScrollBars as ScrollHandle } from "./UI/Scrollbars";
import { NetworkStrokeContainer } from "./Network/NetworkStrokeContainer";
import { NetworkConnection } from "./Network/NetworkConnection";
import { LayeredStrokeContainer } from "./LayeredStrokeContainer";
import { PointerTracker } from "./UI/PointerTracker";
import { ToolManager } from "./Tooling/ToolManager";
import { BaseStrokeContainer } from "./Rendering/BaseStrokeContainer";
import { View } from "./View/View";
import { MutableObservableProperty, ObservableProperty } from "./DesignPatterns/Observable";
import { RenderLoop } from "./Rendering/RenderLoop";
import { PageSizeTracker } from "./Drawing/PageSizeTracker";
import { PdfBackground } from "./PDF/PdfBackground";
import GetApiPath from "../components/GetApiPath";
import { GL } from "./Rendering/GL";
import { LinesBackground } from "./Backgrounds/LinesBackground";
import { Background } from "./types";
import { GridBackground } from "./Backgrounds/GridBackground";
import { BackgroundTypes } from "@inck/common-types/Notes";
import { Toolbar } from "./UI/Toolbar";
import { CreateOptionsMenu } from "./UI/ContextMenu";
import Profiler from "./Profiler";
import { newLayer } from "./Rendering/Layer";

export const NUM_LAYERS = 2;
export const HIGHLIGHTER_OPACITY = 0.35;

export default class App {
  constructor() {
    // Pointer tracker
    const pointerTracker = new PointerTracker();

    // Init graphics
    GL.init();

    let strokeContainer: LayeredStrokeContainer = new BaseStrokeContainer(NUM_LAYERS);

    // Horizontal page size
    const yMax = new MutableObservableProperty<number>(0);
    strokeContainer = new PageSizeTracker(strokeContainer, yMax);

    // Network
    const network = new NetworkConnection();
    strokeContainer = new NetworkStrokeContainer(strokeContainer, network);

    let background: Background;
    network.on("load note", (data: any) => {
      // PDF import
      if (!background) {
        if (data.pdfUrl) {
          background = new PdfBackground(data.pdfUrl, yMax);
        } else if (data.bgPattern == BackgroundTypes.grid) {
          background = new GridBackground(data.bgSpacing || 0.015);
        } else if (data.bgPattern == BackgroundTypes.lines) {
          background = new LinesBackground(data.bgSpacing || 0.03);
        }
      }
    });

    if (background) {
      background = newLayer(() => background.render());
    }

    // Enable navigation
    const pageNavigation = new PageNavigation();
    pointerTracker.onFingerEvent((e) => pageNavigation.handleFingerEvent(e));
    View.instance.onUpdate(() => RenderLoop.scheduleRender());

    // Enable tooling
    const toolManager = new ToolManager(strokeContainer, network);

    // Create UI
    new ScrollHandle(yMax as ObservableProperty<number>);
    new Toolbar(toolManager);
    CreateOptionsMenu(toolManager);

    // Enable rendering
    RenderLoop.onRender(() => {
      if (background) {
        background.render();
      } else {
        GL.clear();
      }

      if (toolManager.hasLayer(0)) {
        GL.beginLayer();
        strokeContainer.render(0, 1);
        toolManager.render(0);
        GL.finishLayer(GL.layerTex);
        GL.layerProgram.renderLayer(GL.layerTex, HIGHLIGHTER_OPACITY);
      } else {
        strokeContainer.render(0, HIGHLIGHTER_OPACITY);
      }

      if (toolManager.hasLayer(1)) {
        GL.beginLayer();
        strokeContainer.render(1);
        toolManager.render(1);
        GL.finishLayer(GL.layerTex);
        GL.layerProgram.renderLayer(GL.layerTex);
      } else {
        strokeContainer.render(1);
      }
    });
  }
}
