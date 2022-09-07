import { RGB } from "../types";
import { Display } from "../DeviceProps";
import { CreateEvent, EventCore, EventTrigger } from "../DesignPatterns/EventDriven";
import { ToolManager } from "../Tooling/ToolManager";

const RES_ROOT = "/wheel/";

const COLORS_NAMES = ["Black", "Red", "Orange", "Yellow", "Green", "Blue", "Purple"];
const COLORS_PEN_HEX = ["#000000", "#ff0000", "#f8972c", "#fcfc00", "#149618", "#353eff", "#dd09bf"];
//const COLORS_HIGHLIGHTER_HEX = ["#b9b9b9", "#ffa3a3", "#fdca91", "#ffff94", "#9df19f", "#bdc0ff", "#f797e9"];
const COLORS_HIGHLIGHTER_HEX = ["#000000", "#ff0000", "#f8972c", "#fcfc00", "#2de032", "#353eff", "#dd09bf"];

const SHAPES = ["Circle", "Arrow", "Triangle", "Rectangle"];

const N_SHAPES = SHAPES.length;

const N = COLORS_NAMES.length;
const SLICE_ANGLE = (Math.PI * 7) / 6 / N;
const COLORS_START_ANGLE = -(SLICE_ANGLE * (N + 1) - Math.PI) / 2;

const WIDTHS = [0.005, 0.01, 0.02, 0.03, 0.045, 0.06, 0.09];
const H_WIDTHS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
const N_WIDTHS = WIDTHS.length;

function createElement(tag, attributes = {}) {
  let el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (let a in attributes) el.setAttribute(a, attributes[a]);
  return el;
}

export default class ToolWheel {
  onClose: EventCore;
  private registerClose: EventTrigger;

  onOpenSettings: EventCore;
  private registerOpenSettings: EventTrigger;

  private toolManager: ToolManager;
  private R: number;
  private wheel: any;
  private widthsWheels: { pen: any; highlighter: any; shapes: any };
  private width: any;
  private widthsContainer: HTMLDivElement;
  private color: string;
  private tool: string;
  private shape: any;

  constructor(toolManager: ToolManager) {
    [this.onClose, this.registerClose] = CreateEvent();
    [this.onOpenSettings, this.registerOpenSettings] = CreateEvent();

    this.toolManager = toolManager;
    this.R = Math.min(3 * Display.DPI, innerWidth / 2, innerHeight / 2);

    this.wheel = this.buildToolWheel(this.R);

    ToolWheel.addStyleSheets();
    this.hide();
    document.body.appendChild(this.wheel);

    this.widthsWheels = {
      pen: this.buildWidthsWheel(this.R, "pen", w => (this.width.pen = w)),
      highlighter: this.buildWidthsWheel(this.R, "highlighter", w => (this.width.highlighter = w)),
      shapes: this.buildWidthsWheel(this.R, "shapes", w => (this.width.shapes = w)),
    };
    this.widthsContainer = document.createElement("div");
    Object.assign(this.widthsContainer.style, {
      width: "100vw",
      height: "100vh",
      position: "absolute",
      top: "0px",
      left: "0px",
      overflow: "hidden",
      "pointer-events": "none",
    });
    for (const wheel of Object.values(this.widthsWheels)) {
      this.widthsContainer.appendChild(wheel);
    }
    document.body.appendChild(this.widthsContainer);

    this.color = "#000000";
    this.tool = "pen";
    this.width = {
      pen: 3,
      highlighter: 3,
      shapes: 3,
    };

    this.toolManager.selectPen([0, 0, 0], WIDTHS[this.width.pen], 1);
    //this.toolManager.selectSelection();
  }

  NewTool() {
    const color = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i
      .exec(this.color)
      .slice(1)
      .map(v => parseInt(v, 16) / 255) as RGB;

    if (this.tool == "pen") {
      this.toolManager.selectPen(color, WIDTHS[this.width.pen], 1);
    } else if (this.tool == "highlighter") {
      this.toolManager.selectPen(color, H_WIDTHS[this.width.highlighter], 0);
    } else if (this.tool == "eraser") {
      this.toolManager.enableEraser();
    } else if (this.tool == "selection") {
      this.toolManager.selectSelection();
    }
  }

  setColor(color: string) {
    this.color = color;
  }

  setTool(tool: string) {
    this.tool = tool;
  }

  setShape(shape) {
    this.shape = shape;
  }

  isVisible() {
    return this.wheel.style.display != "none";
  }

  show(e: PointerEvent) {
    const { x, y, pointerId } = e;
    let transform = "scale(1)";
    if (x != undefined && y != undefined) {
      const x1 = Math.max(this.R, Math.min(innerWidth - this.R, x));
      const y1 = Math.max(this.R, Math.min(innerHeight - this.R, y));

      this.wheel.style.position = "fixed";
      this.wheel.style.zIndex = "20";
      this.wheel.style.left = `${x - this.R}px`;
      this.wheel.style.top = `${y - this.R}px`;

      transform += ` translate(${x1 - x}px, ${y1 - y}px)`;

      for (const wheel of Object.values(this.widthsWheels)) {
        wheel.style.display = "none";
        wheel.style.position = "fixed";
        wheel.style.zIndex = "20";
        wheel.style.left = `${x1 - this.R}px`;
        wheel.style.top = `${y1 - this.R}px`;
      }
    }

    this.wheel.classList.remove("wheel-hidden");
    this.wheel.classList.remove("wheel-active");
    this.wheel.setPointerCapture(pointerId); // useless
    setTimeout(() => this.wheel.classList.add("wheel-active"), 500 + 50);
    setTimeout(() => (this.wheel.style.transform = transform), 50);
  }

  private hide() {
    this.wheel.classList.add("wheel-hidden");
  }

  close() {
    this.hide();
    this.registerClose();
  }

  showWidths(a, type) {
    console.log(a);

    this.widthsWheels[type].style.display = "";
    this.widthsWheels[type].style.transform = `rotate(${a - SLICE_ANGLE * this.width[type]}rad)`;
    const w = this.width[type];
    for (let i = 0; i < this.widthsWheels[type].children.length; i++)
      this.widthsWheels[type].children[i].children[0].style.fill =
        i == w ? "rgba(220, 220, 220, 1)" : "rgba(240, 240, 240, 1)";
  }

  static addStyleSheets() {
    let e = document.createElement("link");
    e.rel = "stylesheet";
    e.href = RES_ROOT + "styles.css";
    document.head.appendChild(e);
  }

  private buildToolWheel(R) {
    const apple = navigator.vendor == "Apple Computer, Inc.";

    const spin = (r, a, d = 0) => [R - r * Math.cos(a + d / r), R - r * Math.sin(a + d / r)];
    const spinO = (r, a, d = 0) => ({ x: R - r * Math.cos(a + d / r), y: R - r * Math.sin(a + d / r) });

    const r1 = R / 5;
    const r2 = (R / 3) * 2;
    const r3 = (R / 3) * 2.7; // 2.55
    const r4 = (R / 3) * 2.7; // 2.9

    let menu = createElement("svg", { width: 2 * R, height: 2 * R, class: "wheel" });

    // Colors
    for (let i = 0; i < N; i++) {
      let part = createElement("g", { class: apple ? "" : "color_slice" });

      // Main color slice
      const a1 = SLICE_ANGLE * i + COLORS_START_ANGLE;
      const a2 = SLICE_ANGLE * (i + 1) + COLORS_START_ANGLE;
      const a = (a1 + a2) / 2;

      let pen = createElement("g", { class: apple ? "" : "pen" });
      pen.addEventListener("pointerdown", e => {
        this.setColor(COLORS_PEN_HEX[i]);
        this.setTool("pen");
        this.hide();
        this.showWidths(a1, "pen");
        this.widthsWheels.pen.setPointerCapture(e.pointerId);
      });

      // Color slice
      let path1 = `
        M ${spin(r1, a2)}
        A ${r1} ${r1} 0 0 0 ${spin(r1, a1)}
        L ${spin(r2, a1)}
        A ${r2} ${r2} 0 0 1 ${spin(r2, a2)}
        L ${spin(r1, a2)}
      `;
      pen.appendChild(
        createElement("path", { class: "", d: path1, fill: COLORS_PEN_HEX[i], stroke: COLORS_PEN_HEX[i] })
      );

      // Pen icon
      const iconSize = R / 6;
      const ai = a + 0.03;
      const r = apple ? r1 * 0.3 + r2 * 0.7 : (r1 + r2) / 2;
      pen.appendChild(
        createElement("image", {
          class: "pen-img",
          href: RES_ROOT + `Tool_Pen_${COLORS_NAMES[i]}.png`,
          transform: `rotate(${30 + (ai / Math.PI) * 180} ${spin(r, ai)}) translate(${-iconSize / 2}, ${
            -iconSize / 2
          })`,
          height: iconSize,
          width: iconSize,
          ...spinO(r, ai),
        })
      );

      let highlighter = createElement("g", { class: "button_group" });
      highlighter.addEventListener("pointerdown", e => {
        this.setColor(COLORS_HIGHLIGHTER_HEX[i]);
        this.setTool("highlighter");
        this.hide();
        this.showWidths(a1, "highlighter");
        this.widthsWheels.highlighter.setPointerCapture(e.pointerId);
      });

      // Highlighter shape
      let path2 = `
        M ${spin(r2, a2)}
        A ${r2} ${r2} 0 0 0 ${spin(r2, a1)}
        L ${spin(r3, a1)}
        A ${r3} ${r3} 0 0 1 ${spin(r3, a2)}
        L ${spin(r2, a2)}
      `;
      highlighter.appendChild(createElement("path", { class: "button", d: path2, fill: "rgba(230, 230, 230, 1)" }));

      // Highlighter icon
      highlighter.appendChild(
        createElement("image", {
          href: RES_ROOT + `Tool_Highlighter_${COLORS_NAMES[i]}.png`,
          transform: `rotate(${320 + (ai / Math.PI) * 180} ${spin((r2 + r3) / 2, ai)}) translate(${-iconSize / 2}, ${
            -iconSize / 2
          })`,
          height: iconSize,
          width: iconSize,
          ...spinO((r2 + r3) / 2, ai),
        })
      );

      // Shapes
      for (let j = 0; j < N_SHAPES; j++) {
        const ang1 = a1 + (SLICE_ANGLE / N_SHAPES) * j;
        const ang2 = a1 + (SLICE_ANGLE / N_SHAPES) * (j + 1);
        const ang = a1 + (SLICE_ANGLE / N_SHAPES) * (j + 0.5);

        let g = createElement("g", { class: "button_group" });
        g.addEventListener("pointerdown", e => {
          this.setColor(COLORS_PEN_HEX[i]);
          this.setTool("shapes");
          this.setShape(SHAPES[j].toLowerCase());
          this.hide();
          this.showWidths(a1, "shapes");
          this.widthsWheels.shapes.setPointerCapture(e.pointerId);
        });

        let path3 = `
          M ${spin(r3, ang2)}
          A ${r3} ${r3} 0 0 0 ${spin(r3, ang1)}
          L ${spin(r4, ang1)}
          A ${r4} ${r4} 0 0 1 ${spin(r4, ang2)}
          L ${spin(r3, ang2)}
        `;
        g.appendChild(createElement("path", { class: "", d: path3 }));

        const iconSize = R / 18;
        g.appendChild(
          createElement("image", {
            href: RES_ROOT + `${SHAPES[j]}_${COLORS_NAMES[i]}.png`,
            transform: `rotate(${270 + (ang / Math.PI) * 180} ${spin((r3 + r4) / 2, ang)}) translate(${
              -iconSize / 2
            }, ${-iconSize / 2})`,
            height: iconSize,
            width: iconSize,
            ...spinO((r3 + r4) / 2, ang),
          })
        );

        // Shapes disabled for now
        //part.appendChild(g);
      }

      part.appendChild(pen);
      part.appendChild(highlighter);
      menu.appendChild(part);
    }

    // Eraser
    if (false) {
      const a1 = COLORS_START_ANGLE - SLICE_ANGLE;
      const a2 = COLORS_START_ANGLE;
      const a = (a1 + a2) / 2;

      let eraser = createElement("g", { class: "tool_button" });
      eraser.addEventListener("pointerdown", () => {
        this.toolManager.enableEraser();
        this.hide();
        this.registerClose();
      });

      // Eraser slice
      let path_e = `
        M ${spin(r1, a2)}
        A ${r1} ${r1} 0 0 0 ${spin(r1, a1)}
        L ${spin(r2, a1)}
        A ${r2} ${r2} 0 0 1 ${spin(r2, a2)}
        L ${spin(r1, a2)}
      `;
      eraser.appendChild(createElement("path", { class: "", d: path_e }));

      // Eraser icon
      const iconSize = R / 6;
      const ai = a + 0.03;
      eraser.appendChild(
        createElement("image", {
          href: RES_ROOT + `Tool_Eraser.png`,
          transform: `translate(${-iconSize / 2}, ${-iconSize / 2})`,
          height: iconSize,
          width: iconSize,
          ...spinO((r1 + r2) / 2, ai),
        })
      );

      menu.appendChild(eraser);
    }

    // Selection
    {
      const a1 = COLORS_START_ANGLE + SLICE_ANGLE * N;
      const a2 = COLORS_START_ANGLE + SLICE_ANGLE * (N + 1);
      const a = (a1 + a2) / 2;

      let selection = createElement("g", { class: "tool_button" });
      selection.addEventListener("pointerdown", () => {
        this.setTool("selection");
        this.NewTool();
        this.hide();
        this.registerClose();
      });

      // Selection slice
      let path_e = `
        M ${spin(r1, a2)}
        A ${r1} ${r1} 0 0 0 ${spin(r1, a1)}
        L ${spin(r2, a1)}
        A ${r2} ${r2} 0 0 1 ${spin(r2, a2)}
        L ${spin(r1, a2)}
      `;
      selection.appendChild(createElement("path", { class: "", d: path_e }));

      // Selection icon
      const iconSize = R / 7;
      const ai = a;
      selection.appendChild(
        createElement("image", {
          href: RES_ROOT + `Tool_Selection.png`,
          transform: `translate(${-iconSize / 2}, ${-iconSize / 2})`,
          height: iconSize,
          width: iconSize,
          ...spinO((r1 + r2) / 2, ai),
        })
      );

      menu.appendChild(selection);
    }

    {
      // Close button

      let close_button = createElement("g", { class: "close_button" });

      // Center Circle
      close_button.appendChild(createElement("circle", { cx: R, cy: R, r: r1 * 1.04 }));

      // Center X icon
      const path_x = `
      M ${R * 0.93} ${R * 0.93}
      L ${R * 1.07} ${R * 1.07}
      M ${R * 1.07} ${R * 0.93}
      L ${R * 0.93} ${R * 1.07}
      `;
      close_button.appendChild(
        createElement("path", {
          class: "",
          stroke: "red",
          "stroke-width": R * 0.04,
          "stroke-linecap": "round",
          d: path_x,
        })
      );
      close_button.addEventListener("pointerup", () => {
        this.hide();
        this.registerClose();
      });

      menu.appendChild(close_button);
    }

    function AddOptionButton(img, angle, action) {
      const iconSize = R / 14;
      const [x, y] = spin((r1 + r2 * 2) / 3, angle);

      let option = createElement("g", { class: "option_button" });

      option.appendChild(
        createElement("circle", {
          cx: x,
          cy: y,
          r: iconSize * 0.9,
        })
      );

      option.appendChild(
        createElement("image", {
          href: img,
          transform: `translate(${-iconSize / 2}, ${-iconSize / 2})`,
          height: iconSize,
          width: iconSize,
          x: x,
          y: y,
        })
      );

      option.addEventListener("click", action);

      menu.appendChild(option);
    }

    AddOptionButton(RES_ROOT + "material_redo.png", Math.PI * 1.37, () => this.toolManager.redo());
    AddOptionButton(RES_ROOT + "material_paste.png", Math.PI * 1.5, () => {
      this.close();
      this.toolManager.paste();
    });
    AddOptionButton(RES_ROOT + "material_undo.png", Math.PI * 1.63, () => this.toolManager.undo());

    return menu;
  }

  buildWidthsWheel(R: number, type: string, setW) {
    const spin = (r, a, d = 0) => [R - r * Math.cos(a + d / r), R - r * Math.sin(a + d / r)];
    const spinO = (r, a, d = 0) => ({ x: R - r * Math.cos(a + d / r), y: R - r * Math.sin(a + d / r) });

    let menu = createElement("svg", { width: 2 * R, height: 2 * R, class: "" });

    // Colors
    for (let i = 0; i < N_WIDTHS; i++) {
      const a1 = SLICE_ANGLE * i;
      const a2 = SLICE_ANGLE * (i + 1);
      const a = (a1 + a2) / 2;
      const w = (type == "highlighter" ? H_WIDTHS[i] : WIDTHS[i]) * Display.DPI;

      let part = createElement("g", { class: "button_group" });
      part.addEventListener("pointerup", () => {
        setW(i);
        console.log("width", i);
        menu.style.display = "none";
        this.registerClose();
      });

      // part shape
      let path = `
        M ${R} ${R}
        L ${spin(R * 0.99, a2)}
        A ${R} ${R} 0 0 0 ${spin(R * 0.99, a1)}
        L ${R} ${R}
      `;
      part.appendChild(createElement("path", { class: "button", d: path }));

      // part icon
      let g = createElement("g");
      if (type == "highlighter") {
        const [x, y] = spin(R * 0.8, a);
        g.appendChild(
          createElement("circle", {
            cx: x,
            cy: y,
            r: Math.min(w / 2, SLICE_ANGLE * R * 0.3),
            fill: "#999",
          })
        );
      } else {
        let path2 = `
          M ${spin(R * 0.85, a1 * 0.6 + a2 * 0.4)}
          Q ${spin(R * 0.88, a1 * 0.22 + a2 * 0.78)} ${spin(R * 0.7, a)}
          Q ${spin(R * 0.63, a1 * 0.65 + a2 * 0.35)} ${spin(R * 0.55, a)}
          Q ${spin(R * 0.487, a1 * 0.3 + a2 * 0.7)} ${spin(R * 0.35, a)}
        `;

        g.appendChild(
          createElement("path", {
            d: path2,
            class: "width",
            stroke: "#000",
            fill: "none",
            "stroke-width": w + "px",
            "stroke-linecap": "round",
          })
        );
      }
      part.appendChild(g);

      menu.appendChild(part);
    }

    const getHoverW = (x, y) => {
      const regex = /rotate\((-*[0-9\.]+)rad\)/.exec(menu.style.transform);
      const a = regex ? parseFloat(regex[1]) : 0;
      const a_rel =
        Math.atan2(y - parseFloat(menu.style.top) - R, x - parseFloat(menu.style.left) - R) - a + Math.PI * 5;
      return Math.floor((a_rel % (2 * Math.PI)) / SLICE_ANGLE);
    };

    menu.addEventListener("pointerleave", () => {
      menu.style.display = "none";
      this.NewTool();
      this.registerClose();
    });
    menu.addEventListener("pointerup", e => {
      const w = getHoverW(e.x, e.y);
      if (w >= 0 && w < N_WIDTHS) setW(w);
      menu.style.display = "none";
      this.NewTool();
      this.registerClose();
    });
    menu.addEventListener("pointermove", e => {
      const w = getHoverW(e.x, e.y);
      for (let i = 0; i < menu.children.length; i++)
        menu.children[i].children[0].style.fill = i == w ? "rgba(220, 220, 220, 1)" : "rgba(240, 240, 240, 1)";
    });

    menu.style.display = "none";
    menu.style["pointer-events"] = "auto";

    return menu;
  }
}
