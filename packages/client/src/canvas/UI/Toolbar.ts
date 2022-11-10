import { V2, Vector2D } from "../Math/V2";
import type { ToolManager } from "../Tooling/ToolManager";
import type { RGB } from "../types";
import { FloatingMenu, PenFollowingEngine } from "./PenFollowing";
import { PointerTracker } from "./PointerTracker";

const toolmenuHeight = 48; // height of the toolbar
const PEN_Z_INDEX = 1;
const HIGHLIGHTER_Z_INDEX = 0;

const SELECTED_ICON_BORDER = "2px solid #000";
const UNSELECTED_ICON_BORDER = "1px solid #EAEAEA";

const penColors = [
  "#000", // black
  "#ff5544", // red
  "#289EFA", // blue
  "#2eb700", // green
  "#F7E054", // yellow
  "#ff9c48", // orange
  "#f982e5", // pink
];

const highlighterColors = [
  "#F7E054", // yellow
  "#2eb700", // green
  "#289EFA", // blue
  "#ff9c48", // orange
  "#ff5544", // red
  "#c96ae2", // purple
  "#f982e5", // pink
];

const penWidths = [6, 4, 2.7];
const highlighterWidths = [150, 100, 50];

const dotSizes = [1, 0.7, 0.4];

enum ToolTypes {
  PEN,
  HIGHLIGHTER,
  SELECTION,
  ERASER,
}

export class Toolbar implements FloatingMenu {
  private toolManager: ToolManager;
  private penFollowingEngine: PenFollowingEngine;

  private penWidth: number;
  private penColor: string;
  private highlighterWidth: number;
  private highlighterColor: string;
  private currentTool: ToolTypes;
  private lastTool: ToolTypes;

  private container: HTMLDivElement;
  private buttonImgs: { [tool in ToolTypes]?: HTMLElement };
  private toolbar: HTMLDivElement;
  private pinButton: HTMLElement;

  public isPinned: boolean;

  constructor(toolManager: ToolManager) {
    this.toolManager = toolManager;
    this.penFollowingEngine = new PenFollowingEngine(this);

    this.penWidth = penWidths[1];
    this.penColor = penColors[0];
    this.highlighterWidth = highlighterWidths[1];
    this.highlighterColor = highlighterColors[0];

    this.container = document.createElement("div");
    this.container.style.position = "absolute";
    this.container.style.top = "0px";
    this.container.style.left = "0px";
    document.body.appendChild(this.container);

    this.buttonImgs = {};
    this.toolbar = this.createToolbar();
    this.container.appendChild(this.toolbar);

    this.selectPen(this.penColor, this.penWidth);

    // Automatically disable eraser after one stroke
    let erasing = false;
    PointerTracker.instance.onPenEvent((e) => {
      if (this.currentTool == ToolTypes.ERASER) {
        if (!e.pressure && erasing) {
          this.disableEraser();
        }
        erasing = e.pressure > 0;
      }
    });

    // Enable eraser on pen button
    PointerTracker.instance.onPenButton((buttonState) => {
      buttonState ? this.enableEraser() : this.disableEraser();
    });
  }

  private createToolbar() {
    const toolbar = document.createElement("div");
    toolbar.setAttribute("id", "toolbar");
    toolbar.style.position = "fixed";
    toolbar.style.overflow = "hidden";
    toolbar.style.display = "flex";
    toolbar.style.zIndex = "10";
    toolbar.style.alignItems = "center";
    toolbar.style.paddingLeft = `${toolmenuHeight * 0.1}px`;
    toolbar.style.height = `${toolmenuHeight}px`;
    toolbar.style.borderRadius = `${toolmenuHeight * 0.5}px`;
    toolbar.style.backgroundColor = "#fff";
    toolbar.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.1), 0px 10px 30px rgba(0, 0, 0, 0.1)";

    toolbar.append(this.createToolButton(ToolTypes.SELECTION, Icons.Select, this.selectSelection.bind(this)));
    toolbar.append(
      this.createPenButton(
        ToolTypes.HIGHLIGHTER,
        Icons.Highlighter,
        highlighterColors,
        highlighterWidths,
        () => this.highlighterColor,
        () => this.highlighterWidth,
        this.selectHighlighter.bind(this)
      )
    );
    toolbar.append(
      this.createPenButton(
        ToolTypes.PEN,
        Icons.Pen,
        penColors,
        penWidths,
        () => this.penColor,
        () => this.penWidth,
        this.selectPen.bind(this)
      )
    );
    toolbar.append(
      this.createToolButton(ToolTypes.ERASER, Icons.Eraser, () => {
        if (this.currentTool != ToolTypes.ERASER) {
          this.enableEraser();
        } else {
          this.disableEraser();
        }
      })
    );
    toolbar.append(...this.createUndoRedoButtons());
    toolbar.append(this.createSpacer());
    this.pinButton = this.createPinButton();
    toolbar.append(this.pinButton);
    toolbar.append(this.createDragHandle());

    return toolbar;
  }

  private createPenButton(
    penType: ToolTypes,
    penIcon: HTMLElement,
    colors: string[],
    widths: number[],
    getColor: () => string,
    getWidth: () => number,
    setPen: (color: string, width: number) => void
  ) {
    const PADDING = 0.2;

    const [penBtn, penImg] = this.createButton(penIcon);

    this.buttonImgs[penType] = penImg;

    const widthIndicator = document.createElement("div");
    widthIndicator.style.borderRadius = "50%";
    widthIndicator.style.border = `2px solid #fff`;
    widthIndicator.style.position = "absolute";
    widthIndicator.style.transform = "translate(50%, -50%)";
    widthIndicator.style.top = widthIndicator.style.right = `${Math.ceil(toolmenuHeight * 0.25)}px`;
    penBtn.append(widthIndicator);

    const sortedWidths = [...widths].sort((a, b) => a - b);
    const updateIndicators = () => {
      widthIndicator.style.background = getColor();
      widthIndicator.style.width = widthIndicator.style.height = `${sortedWidths.indexOf(getWidth()) * 4 + 8}px`;

      // Update pen tip color
      penImg.style.color = getColor();
    };
    updateIndicators();

    const colorBar = document.createElement("div");
    colorBar.style.position = "fixed";
    colorBar.style.background = "#fff";
    colorBar.style.boxShadow = "0px 0px 30px rgba(0, 0, 0, 0.1)";
    colorBar.style.borderRadius = "9999px";
    colorBar.style.zIndex = "20";
    colorBar.style.display = "flex";
    colorBar.style.flexDirection = "column";
    colorBar.style.width = `${toolmenuHeight}px`;
    colorBar.style.visibility = "hidden";
    colorBar.style.paddingTop = colorBar.style.paddingBottom = `${toolmenuHeight * PADDING}px`;
    this.container.appendChild(colorBar);

    const selectPen = (color, width) => {
      setPen(color, width);

      updateIndicators();
    };

    let widthBar, widthIcons, currentWidth, otherWidths;
    const showWidthBar = (colorIcon, color) => {
      currentWidth = getWidth();
      otherWidths = widths.filter((s) => s != currentWidth);

      if (widthBar) {
        this.container.removeChild(widthBar);
        widthBar = null;
      }
      widthBar = document.createElement("div");
      widthBar.style.background = "#fff";
      widthBar.style.boxShadow = "0px 0px 30px rgba(0, 0, 0, 0.1)";
      widthBar.style.borderRadius = "9999px 0px 0px 9999px";
      widthBar.style.zIndex = "10";
      widthBar.style.display = "flex";
      widthBar.style.position = "fixed";
      widthBar.style.paddingTop = widthBar.style.paddingBottom = `${toolmenuHeight * PADDING}px`;
      widthBar.style.width = `${toolmenuHeight * (otherWidths.length + 0.5)}px`;

      widthIcons = otherWidths.map((width) => this.generatePenColorWidthDot(color, width, widths));
      widthBar.append(...widthIcons.map(([icon, outline]) => icon));

      const bBox = colorIcon.getBoundingClientRect();
      widthBar.style.top = `${bBox.top - toolmenuHeight * PADDING}px`;
      widthBar.style.left = `${bBox.left - toolmenuHeight * widthIcons.length}px`;
      this.container.appendChild(widthBar);
    };

    let colorIcons, colorsList: string[];
    const handlePointer = (e: PointerEvent) => {
      // Remove outline on previous combination
      [...colorIcons, ...widthIcons].forEach(([icon, outline]) => (outline.style.visibility = "hidden"));

      // Find current combination
      if (e.x > colorIcons[0][0].getBoundingClientRect().left) {
        let i = 0;
        while (i < colorIcons.length - 1 && e.y >= colorIcons[i + 1][0].getBoundingClientRect().top) {
          i++;
        }
        colorIcons[i][1].style.visibility = "";

        selectPen(colorsList[i], currentWidth);
        showWidthBar(colorIcons[i][0], colorsList[i]);
      } else {
        let i = 0;
        while (i < widthIcons.length - 1 && e.x >= widthIcons[i + 1][0].getBoundingClientRect().left) {
          i++;
        }
        widthIcons[i][1].style.visibility = "";

        selectPen(getColor(), otherWidths[i]);
      }

      e.stopPropagation();
    };

    penBtn.addEventListener("pointerdown", (e) => {
      // Hide toolbar
      this.toolbar.style.visibility = "hidden";

      // Update color icons in color bar
      colorsList = [getColor(), ...colors.filter((c) => c != getColor())];
      if (this.penFollowingEngine.menuIsBelowPen) {
        colorsList.reverse();
      }
      colorIcons = colorsList.map((color) => this.generatePenColorWidthDot(color, getWidth(), widths));
      colorBar.replaceChildren(...colorIcons.map(([icon]) => icon));

      // Position & Show color bar
      const bBox = penBtn.getBoundingClientRect();
      colorBar.style.visibility = "visible";
      colorBar.style.left = `${bBox.left + bBox.width / 2 - toolmenuHeight / 2}px`;
      if (this.penFollowingEngine.menuIsBelowPen) {
        colorBar.style.top = `${bBox.top + bBox.height - colorBar.getBoundingClientRect().height}px`;
      } else {
        colorBar.style.top = `${bBox.top}px`;
      }

      // Show widths bar
      showWidthBar(colorIcons[0][0], colorsList[0]);

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointer);
        window.removeEventListener("pointerup", handlePointerUp);
        PointerTracker.instance.unpause();

        // Destroy widths bar
        this.container.removeChild(widthBar);
        widthBar = null;
        // Hide colors bar
        colorBar.style.visibility = "hidden";

        // Show toolbar
        this.toolbar.style.visibility = "visible";
      };

      handlePointer(e);

      PointerTracker.instance.pause();
      window.addEventListener("pointermove", handlePointer);
      window.addEventListener("pointerup", handlePointerUp);
    });

    return penBtn;
  }

  private createUndoRedoButtons() {
    const redoBtn = this.createActionButton(Icons.Redo, () => {
      this.toolManager.actionStack.redo();
    });
    const undoBtn = this.createActionButton(Icons.Undo, () => {
      this.toolManager.actionStack.undo();
    });

    redoBtn.style.display = "none";
    this.toolManager.actionStack.onUpdate(() => {
      if (!this.toolManager.actionStack.canRedo()) {
        redoBtn.style.display = "none";
      } else {
        redoBtn.style.display = "flex";
      }
    });

    return [undoBtn, redoBtn];
  }

  private createPinButton() {
    const [btn, img] = this.createButton(Icons.Pin);
    img.style.color = "#e0e0e0";
    img.style.border = "";
    img.style.transitionProperty = "transform, color";
    img.style.transitionDuration = "200ms";
    btn.style.display = "none";
    btn.style.width = "";
    btn.style.paddingRight = `${toolmenuHeight * 0.05}px`;
    btn.style.marginLeft = `${-toolmenuHeight * 0.05}px`;

    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.isPinned = !this.isPinned;
      if (this.isPinned) {
        img.style.color = "#777";
        img.style.transform = "rotate(-45deg) scale(0.9)";
      } else {
        img.style.color = "#e4e2e2";
        img.style.backgroundColor = "";
        img.style.transform = "";
      }
    });

    PointerTracker.instance.onPenEvent((e) => {
      if (!this.isPinned && e.pressure && btn.style.display != "none") {
        const w0 = this.toolbar.getBoundingClientRect().width;
        btn.style.display = "none";
        const w1 = this.toolbar.getBoundingClientRect().width;
        this.penFollowingEngine.translatePosition(new Vector2D(w0 - w1, 0), false);
      }
    });

    return btn;
  }

  private createActionButton(icon: HTMLElement, onClick: Function) {
    const [btn, img] = this.createButton(icon);
    img.style.color = "#C2C2C2";

    let isPressing = false;
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      img.style.backgroundColor = "#EAEAEA";
      img.style.color = "#fff";
      isPressing = true;
    });
    btn.addEventListener("pointerup", () => {
      img.style.border = UNSELECTED_ICON_BORDER;
      img.style.backgroundColor = "#fff";
      img.style.color = "#C2C2C2";
      if (isPressing) {
        onClick();
        isPressing = false;
      }
    });
    btn.addEventListener("pointerleave", () => {
      img.style.border = UNSELECTED_ICON_BORDER;
      img.style.backgroundColor = "#fff";
      img.style.color = "#C2C2C2";
      isPressing = false;
    });

    return btn;
  }

  private createToolButton(tool: ToolTypes, icon: HTMLElement, onClick: Function) {
    const [btn, img] = this.createButton(icon);

    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();

      onClick();
    });

    this.buttonImgs[tool] = img;

    return btn;
  }

  private createButton(icon: HTMLElement): [HTMLElement, HTMLElement] {
    let btn = document.createElement("span");
    btn.style.cursor = "pointer";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.position = "relative";
    btn.style.height = "100%";
    btn.style.width = `${toolmenuHeight * 0.9}px`;

    icon.style.borderRadius = "99999px";
    icon.style.height = `${toolmenuHeight * 0.62}px`;
    icon.style.border = UNSELECTED_ICON_BORDER;
    btn.appendChild(icon);

    return [btn, icon];
  }

  private refreshButtonsOutlines() {
    Object.entries(this.buttonImgs).forEach(([tool, img]) => {
      img.style.border = UNSELECTED_ICON_BORDER;
    });
    this.buttonImgs[this.currentTool].style.border = SELECTED_ICON_BORDER;
  }

  private generatePenColorWidthDot(
    color: string,
    width: number,
    widths: number[]
  ): [HTMLElement, HTMLElement, (s: number) => void] {
    const icon = document.createElement("div");
    icon.style.position = "absolute";
    icon.style.top = icon.style.left = "50%";
    icon.style.transform = "translate(-50%, -50%)";
    icon.style.borderRadius = "50%";
    icon.style.backgroundColor = color;

    const outline = document.createElement("div");
    outline.style.position = "absolute";
    outline.style.top = outline.style.left = "50%";
    outline.style.transform = "translate(-50%, -50%)";
    outline.style.border = `2px solid ${color}`;
    outline.style.borderRadius = `50%`;
    outline.style.visibility = "hidden";

    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "flex";
    wrapper.style.justifyContent = "center";
    wrapper.style.alignItems = "center";
    wrapper.style.cursor = "pointer";
    wrapper.style.width = `${toolmenuHeight}px`;
    wrapper.style.height = `${toolmenuHeight * 0.7}px`;
    wrapper.appendChild(icon);
    wrapper.appendChild(outline);

    const updateSize = (newSize: number) => {
      const s = dotSizes[widths.indexOf(newSize)] * toolmenuHeight * 0.5;
      icon.style.width = `${Math.ceil(s)}px`;
      icon.style.height = `${Math.ceil(s)}px`;
      icon.style.borderRadius = `9999px`;
      outline.style.width = `${Math.ceil(s + 10)}px`;
      outline.style.height = `${Math.ceil(s + 10)}px`;
      outline.style.borderRadius = `9999px`;
    };
    updateSize(width);

    return [wrapper, outline, updateSize];
  }

  private createSpacer() {
    let spacer = document.createElement("span");
    spacer.style.height = `${toolmenuHeight}px`;
    spacer.style.width = `${toolmenuHeight * 0.2}px`;
    return spacer;
  }
  private createDragHandle() {
    let handle = document.createElement("span");
    handle.style.cursor = "pointer";
    handle.style.padding = `${toolmenuHeight * 0.3}px`;
    handle.style.paddingLeft = `${toolmenuHeight * 0.1}px`;

    const icon = Icons.Handle;
    icon.style.height = `${toolmenuHeight * 0.4}px`;

    let x: number, y: number, dragging: boolean;
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);

      x = e.x;
      y = e.y;
      dragging = true;

      this.penFollowingEngine.menuIsBelowPen = false;

      // Show pin buttton
      const w0 = this.toolbar.getBoundingClientRect().width;
      this.pinButton.style.display = "flex";
      const w1 = this.toolbar.getBoundingClientRect().width;
      this.penFollowingEngine.translatePosition(new Vector2D(w0 - w1, 0));
    });
    handle.addEventListener("pointermove", (e) => {
      if (dragging) {
        e.preventDefault();

        this.penFollowingEngine.translatePosition(V2.sub(e, { x, y }));

        x = e.x;
        y = e.y;
      }
    });
    handle.addEventListener("pointerup", (e) => {
      if (dragging) {
        e.preventDefault();
        dragging = false;
      }
    });

    handle.appendChild(icon);

    return handle;
  }

  setPosition({ x, y }: Vector2D) {
    this.toolbar.style.left = `${x}px`;
    this.toolbar.style.top = `${y}px`;
  }

  setOpacity(opacity: number) {
    this.toolbar.style.opacity = `${opacity}%`;
  }

  selectPen(color: string, width: number) {
    if (this.penColor != color || this.penWidth != width || this.currentTool != ToolTypes.PEN) {
      this.penColor = color;
      this.penWidth = width;

      const rgb = hexToRGB(this.penColor);

      this.toolManager.selectPen(rgb, this.penWidth, PEN_Z_INDEX);

      this.currentTool = ToolTypes.PEN;
      this.refreshButtonsOutlines();
    }
  }

  selectHighlighter(color: string, width: number) {
    if (this.highlighterColor != color || this.highlighterWidth != width || this.currentTool != ToolTypes.HIGHLIGHTER) {
      this.highlighterColor = color;
      this.highlighterWidth = width;

      const rgb = hexToRGB(this.highlighterColor);

      this.toolManager.selectPen(rgb, this.highlighterWidth, HIGHLIGHTER_Z_INDEX);

      this.currentTool = ToolTypes.HIGHLIGHTER;
      this.refreshButtonsOutlines();
    }
  }

  selectSelection() {
    this.toolManager.selectSelection();
    this.currentTool = ToolTypes.SELECTION;
    this.refreshButtonsOutlines();
  }

  enableEraser() {
    if (this.currentTool != ToolTypes.ERASER) {
      this.lastTool = this.currentTool;
      this.currentTool = ToolTypes.ERASER;
      this.refreshButtonsOutlines();

      this.toolManager.selectEraser();
    }
  }

  disableEraser() {
    if (this.currentTool == ToolTypes.ERASER) {
      if (this.lastTool == ToolTypes.PEN) {
        this.selectPen(this.penColor, this.penWidth);
      } else if (this.lastTool == ToolTypes.HIGHLIGHTER) {
        this.selectHighlighter(this.highlighterColor, this.highlighterWidth);
      } else if (this.lastTool == ToolTypes.SELECTION) {
        this.selectSelection();
      }
      this.refreshButtonsOutlines();
    }
  }

  setInteractive(interactive: boolean) {
    this.toolbar.style.pointerEvents = interactive ? "all" : "none";
  }

  get width() {
    return this.toolbar.getBoundingClientRect().width / 2;
  }

  get height() {
    return this.toolbar.getBoundingClientRect().height / 2;
  }
}

function hexToRGB(hex: string): RGB {
  let r: string, g: string, b: string;
  // handling 3 digit hex
  if (hex.length == 4) {
    r = "0x" + hex[1] + hex[1];
    g = "0x" + hex[2] + hex[2];
    b = "0x" + hex[3] + hex[3];
    // handling 6 digit hex
  } else if (hex.length == 7) {
    r = "0x" + hex[1] + hex[2];
    g = "0x" + hex[3] + hex[4];
    b = "0x" + hex[5] + hex[6];
  } else {
    throw new Error(`Invalid color code '${hex}', please use hex codes of length 3 or 6 preceded by '#'`);
  }

  return [+r / 255, +g / 255, +b / 255];
}

function HtmlFromStr(str: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = str;
  return el.children[0] as HTMLElement;
}

class Icons {
  static get Pen() {
    return HtmlFromStr(`
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#filter0_d_234_1210)">
      <rect x="27.6008" y="39.9428" width="16.8667" height="40.6333" transform="rotate(-45 27.6008 39.9428)" fill="#D3D3D3"/>
      <path d="M24.0443 36.3858L26.5179 38.8594L38.4444 26.9329L35.9709 24.4593C34.8881 23.3765 33.6779 22.4291 32.3668 21.638L7.65819 6.72857C7.27262 6.49591 6.77808 6.55616 6.45965 6.87459C6.14122 7.19302 6.08097 7.68756 6.31363 8.07313L21.2231 32.7817C22.0142 34.0928 22.9616 35.303 24.0443 36.3858Z" fill="url(#paint0_linear_234_1210)"/>
      <mask id="mask0_234_1210" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="6" y="6" width="33" height="33">
      <path d="M23.5277 35.8692L26.5179 38.8594L38.4444 26.9329L35.4543 23.9427C34.7146 23.203 33.8879 22.5559 32.9923 22.0155L7.65819 6.72857C7.27262 6.49591 6.77808 6.55616 6.45965 6.87459C6.14122 7.19302 6.08097 7.68756 6.31363 8.07313L21.6005 33.4072C22.1409 34.3029 22.7881 35.1296 23.5277 35.8692Z" fill="black"/>
      </mask>
      <g mask="url(#mask0_234_1210)">
      <rect x="3.20643" y="9.04155" width="8.43333" height="8.43333" transform="rotate(-45 3.20643 9.04155)" fill="currentColor" />
      <rect x="26.5171" y="38.8592" width="16.8667" height="1.53333" transform="rotate(-45 26.5171 38.8592)" fill="black"/>
      </g>
      </g>
      <defs>
      <filter id="filter0_d_234_1210" x="0.172771" y="0.587708" width="74.0867" height="74.0872" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feFlood flood-opacity="0" result="BackgroundImageFix"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset/>
      <feGaussianBlur stdDeviation="3"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0"/>
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_234_1210"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_234_1210" result="shape"/>
      </filter>
      <linearGradient id="paint0_linear_234_1210" x1="30.4169" y1="17.6383" x2="17.6391" y2="30.416" gradientUnits="userSpaceOnUse">
      <stop stop-color="#bbb"/>
      <stop offset="0.505208" stop-color="#eee"/>
      <stop offset="1" stop-color="#bbb"/>
      </linearGradient>
      </defs>
      </svg>
    `);
  }

  static get Highlighter() {
    return HtmlFromStr(`
      <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.99342 13.8916L10.1697 16.5481L16.0721 9.49112L9.51111 4.00361C9.01723 3.59054 8.26126 3.84831 8.12263 4.47706L6.41854 12.2056C6.28069 12.8309 6.50232 13.4808 6.99342 13.8916Z" fill="currentColor"/>
      <g filter="url(#filter0_d_234_883)">
      <path d="M22.7462 32.0649L28.2938 36.7048L39.1149 23.7669L33.5673 19.127C32.1928 17.9773 30.542 17.2063 28.7781 16.8901L28.0773 16.7644C26.3135 16.4482 24.6627 15.6772 23.2881 14.5275L16.5644 8.90387L9.67825 17.1371L16.402 22.7607C17.7765 23.9104 18.8273 25.3988 19.4503 27.079L19.6979 27.7466C20.3209 29.4267 21.3717 30.9152 22.7462 32.0649Z" fill="url(#paint0_linear_234_883)"/>
      <path d="M28.2935 36.7033L39.1146 23.7654L65.5784 45.8995L54.7573 58.8374L28.2935 36.7033Z" fill="#D3D3D3"/>
      <rect x="28.2935" y="36.7033" width="16.8667" height="6.9" transform="rotate(-50.0913 28.2935 36.7033)" fill="black"/>
      </g>
      <defs>
      <filter id="filter0_d_234_883" x="6.67825" y="5.90387" width="61.9002" height="55.9335" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feFlood flood-opacity="0" result="BackgroundImageFix"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset/>
      <feGaussianBlur stdDeviation="1.5"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0"/>
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_234_883"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_234_883" result="shape"/>
      </filter>
      <linearGradient id="paint0_linear_234_883" x1="32.8387" y1="17.3497" x2="21.2453" y2="31.211" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ccc"/>
      <stop offset="0.505208" stop-color="#eee"/>
      <stop offset="1" stop-color="#ccc"/>
      </linearGradient>
      </defs>
      </svg>        
    `);
  }

  static get Eraser() {
    return HtmlFromStr(`
      <svg viewBox="-5 -5 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#filter0_d_234_893)">
      <path d="M5.0338 16.9603C3.35828 15.2848 3.35829 12.5683 5.03381 10.8927L10.8927 5.03381C12.5683 3.35829 15.2848 3.35829 16.9603 5.03381L24.2267 12.3002L12.3002 24.2267L5.0338 16.9603Z" fill="#f99"/>
      <rect x="12" y="23.9265" width="16.8667" height="24.3759" transform="rotate(-45 12 23.9265)" fill="url(#paint0_linear_234_893)"/>
      <path d="M26.4708 23.96C26.867 23.96 27.1881 23.6388 27.1881 23.2427C27.1881 22.8465 26.867 22.5253 26.4708 22.5253L23.96 22.5253L23.96 20.0145C23.96 19.6183 23.6388 19.2971 23.2426 19.2971C22.8465 19.2971 22.5253 19.6183 22.5253 20.0145L22.5253 22.5253L20.0145 22.5253C19.6183 22.5253 19.2971 22.8465 19.2971 23.2426C19.2971 23.6388 19.6183 23.96 20.0145 23.96L22.5253 23.96L22.5253 26.4708C22.5253 26.867 22.8465 27.1881 23.2427 27.1881C23.6388 27.1881 23.96 26.867 23.96 26.4708L23.96 23.96L26.4708 23.96Z" fill="url(#paint1_linear_234_893)"/>
      </g>
      <defs>
      <filter id="filter0_d_234_893" x="0.777168" y="0.777168" width="43.3857" height="43.3857" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feFlood flood-opacity="0" result="BackgroundImageFix"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset/>
      <feGaussianBlur stdDeviation="1.5"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0"/>
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_234_893"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_234_893" result="shape"/>
      </filter>
      <linearGradient id="paint0_linear_234_893" x1="29.7625" y1="40.1891" x2="11.692" y2="40.1891" gradientUnits="userSpaceOnUse">
      <stop stop-color="#D3D3D3"/>
      <stop offset="0.505208" stop-color="#EEEEEE"/>
      <stop offset="1" stop-color="#D3D3D3"/>
      </linearGradient>
      <linearGradient id="paint1_linear_234_893" x1="21.357" y1="25.5997" x2="25.5997" y2="21.357" gradientUnits="userSpaceOnUse">
      <stop stop-color="#666"/>
      <stop offset="0.497299" stop-color="#999"/>
      <stop offset="1" stop-color="#777"/>
      </linearGradient>
      </defs>
      </svg>        
    `);
  }

  static get Select() {
    return HtmlFromStr(`
      <svg viewBox="-10 -10 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0.284281 11.5306C0.472269 13.5155 2.15075 15.0231 4.14428 15H6.875V16.25C6.875 16.582 6.74316 16.8994 6.50878 17.1338C6.2744 17.3682 5.95703 17.5 5.625 17.5H1.875C1.18409 17.5 0.625 18.0591 0.625 18.75C0.625 19.4409 1.18409 20 1.875 20H5.625C7.69653 20 9.375 18.3215 9.375 16.25V15H10C15.515 15 20 11.6344 20 7.5C20 3.36563 15.515 0 10 0C4.485 0 0 3.36563 0 7.5C0.00122063 8.33253 0.179444 9.15406 0.522469 9.91212C0.324716 10.4285 0.242928 10.9802 0.284432 11.5308L0.284281 11.5306ZM4.03428 12.4999C3.34338 12.4999 2.78428 11.9408 2.78428 11.2499C2.78428 10.559 3.34338 9.99988 4.03428 9.99988C5.47228 10.0023 6.68322 11.0741 6.86266 12.4999H4.03428ZM9.99991 2.49987C14.0624 2.49987 17.4999 4.78991 17.4999 7.49988C17.4999 10.2098 14.0624 12.4999 9.99991 12.4999H9.37491C9.28458 11.1424 8.68153 9.87169 7.68791 8.94269C6.69425 8.01372 5.38444 7.49859 4.02447 7.49981C3.49956 7.49493 2.98078 7.60235 2.49981 7.81231V7.49981C2.49981 4.78984 5.93731 2.49981 9.99981 2.49981L9.99991 2.49987Z" fill="#C2C2C2"/>
      </svg>        
    `);
  }

  static get Undo() {
    return HtmlFromStr(`
      <svg viewBox="-10 -10 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.1432 4.73819H4.87955L7.73642 1.9633L5.71511 0L0.41989 5.14464C0.150661 5.40479 0 5.75706 0 6.1256C0 6.49414 0.150658 6.84641 0.41989 7.10655L5.71511 12.2512L7.73642 10.2879L4.87955 7.51301H12.1432C14.9038 7.51301 17.1427 9.68765 17.1427 12.3691C17.1427 15.0505 14.9038 17.2251 12.1432 17.2251H5.71518V20H12.1432C14.9498 20 17.543 18.5462 18.9465 16.1845C20.3512 13.8229 20.3512 10.9154 18.9465 8.55359C17.5431 6.19195 14.95 4.73812 12.1432 4.73812V4.73819Z" fill="currentColor"/>
      </svg>
    `);
  }

  static get Redo() {
    const icon = Icons.Undo;
    icon.style.transform = "scale(-1, 1)";
    return icon;
  }

  static get Handle() {
    return HtmlFromStr(`
      <svg viewBox="0 0 18 30" xmlns="http://www.w3.org/2000/svg">
        <g fill="#e7e6e6" stroke-width=".027335">
        <path d="m0 3c0-0.51818 0.13697-1.0364 0.41096-1.5 0.24658-0.46364 0.63014-0.84545 1.0959-1.0909 0.43836-0.27273 0.9589-0.40909 1.4795-0.40909 0.54794 0 1.0685 0.13637 1.5068 0.40909 0.46576 0.24544 0.84932 0.62727 1.0959 1.0909 0.27398 0.46363 0.41096 0.98182 0.41096 1.5s-0.13697 1.0364-0.41096 1.5c-0.24658 0.46363-0.63013 0.84545-1.0959 1.0909-0.43835 0.27273-0.9589 0.40909-1.5068 0.40909-0.52055 0-1.0411-0.13637-1.4795-0.40909-0.46576-0.24545-0.84932-0.62727-1.0959-1.0909-0.27397-0.46364-0.41096-0.98182-0.41096-1.5z"/>
        <path d="m0 15c0-0.51818 0.13697-1.0364 0.41096-1.5 0.24658-0.46364 0.63014-0.84545 1.0959-1.0909 0.43836-0.27273 0.9589-0.40909 1.4795-0.40909 0.54794 0 1.0685 0.13636 1.5068 0.40909 0.46576 0.24544 0.84932 0.62727 1.0959 1.0909 0.27398 0.46364 0.41096 0.98182 0.41096 1.5s-0.13697 1.0364-0.41096 1.5c-0.24658 0.46364-0.63013 0.84545-1.0959 1.0909-0.43835 0.27273-0.9589 0.40909-1.5068 0.40909-0.52055 0-1.0411-0.13636-1.4795-0.40909-0.46576-0.24545-0.84932-0.62727-1.0959-1.0909-0.27397-0.46364-0.41096-0.98182-0.41096-1.5z"/>
        <path d="m0 27c0-0.51818 0.13697-1.0364 0.41096-1.5 0.24658-0.46364 0.63014-0.84545 1.0959-1.0909 0.43836-0.27273 0.9589-0.40909 1.4795-0.40909 0.54794 0 1.0685 0.13636 1.5068 0.40909 0.46576 0.24544 0.84932 0.62727 1.0959 1.0909 0.27398 0.46364 0.41096 0.98182 0.41096 1.5 0 0.51818-0.13697 1.0364-0.41096 1.5-0.24658 0.46364-0.63013 0.84545-1.0959 1.0909-0.43835 0.27273-0.9589 0.40909-1.5068 0.40909-0.52055 0-1.0411-0.13636-1.4795-0.40909-0.46576-0.24545-0.84932-0.62727-1.0959-1.0909-0.27397-0.46364-0.41096-0.98182-0.41096-1.5z"/>
        <path d="m12 3c0-0.51818 0.13697-1.0364 0.41096-1.5 0.24658-0.46364 0.63014-0.84545 1.0959-1.0909 0.43836-0.27273 0.9589-0.40909 1.4795-0.40909 0.54794 0 1.0685 0.13637 1.5068 0.40909 0.46575 0.24544 0.84932 0.62727 1.0959 1.0909 0.27398 0.46363 0.41096 0.98182 0.41096 1.5 0 0.51818-0.13697 1.0364-0.41096 1.5-0.24658 0.46363-0.63014 0.84545-1.0959 1.0909-0.43836 0.27273-0.9589 0.40909-1.5068 0.40909-0.52055 0-1.0411-0.13637-1.4795-0.40909-0.46576-0.24544-0.84932-0.62728-1.0959-1.0909-0.27398-0.46364-0.41096-0.98182-0.41096-1.5z"/>
        <path d="m12 15c0-0.51818 0.13697-1.0364 0.41096-1.5 0.24658-0.46364 0.63014-0.84546 1.0959-1.0909 0.43836-0.27273 0.9589-0.40909 1.4795-0.40909 0.54794 0 1.0685 0.13636 1.5068 0.40909 0.46575 0.24544 0.84932 0.62727 1.0959 1.0909 0.27398 0.46364 0.41096 0.98182 0.41096 1.5 0 0.51818-0.13697 1.0364-0.41096 1.5-0.24658 0.46364-0.63014 0.84545-1.0959 1.0909-0.43836 0.27273-0.9589 0.40909-1.5068 0.40909-0.52055 0-1.0411-0.13636-1.4795-0.40909-0.46576-0.24544-0.84932-0.62727-1.0959-1.0909-0.27398-0.46364-0.41096-0.98182-0.41096-1.5z"/>
        <path d="m12 27c0-0.51818 0.13697-1.0364 0.41096-1.5 0.24658-0.46364 0.63014-0.84546 1.0959-1.0909 0.43836-0.27273 0.9589-0.40909 1.4795-0.40909 0.54794 0 1.0685 0.13636 1.5068 0.40909 0.46575 0.24544 0.84932 0.62727 1.0959 1.0909 0.27398 0.46364 0.41096 0.98182 0.41096 1.5 0 0.51818-0.13697 1.0364-0.41096 1.5-0.24658 0.46364-0.63014 0.84545-1.0959 1.0909-0.43836 0.27273-0.9589 0.40909-1.5068 0.40909-0.52055 0-1.0411-0.13636-1.4795-0.40909-0.46576-0.24544-0.84932-0.62727-1.0959-1.0909-0.27398-0.46364-0.41096-0.98182-0.41096-1.5z"/>
        </g>
      </svg>
    `);
  }

  static get Pin() {
    return HtmlFromStr(`
      <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="-8 -5 36 36" xmlns="http://www.w3.org/2000/svg">
        <path fill="none" stroke="currentColor" stroke-width="2.5" d="M16,3 L10,9 C10,9 6,8 3,11 C3,11 13,21 13,21 C16,18 15,14 15,14 L21,8 L16,3 Z"></path>
        <path fill="none" stroke="currentColor" stroke-width="4" d="M2,22 L8,16"></path>
        <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="4" d="M1,23 L2,22"></path>
      </svg>
    `);
  }
}
