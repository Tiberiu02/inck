import tailwind from "../../tailwind.config";
import { ActionStack } from "../ActionsStack";
import { Vector2D } from "../types";
import { Display } from "./DisplayProps";
import ToolWheel from "./ToolWheel";

export class CaddieMenu {
  private el: HTMLElement;
  private actionStack: ActionStack;
  private wheel: ToolWheel;
  private pointer: Vector2D;
  private lastUpdate: number;

  constructor(actionStack: ActionStack, wheel: ToolWheel) {
    this.actionStack = actionStack;
    this.wheel = wheel;

    this.el = this.createMenu();

    this.pointer = { x: 0, y: 0 };
    this.lastUpdate = performance.now();
    requestAnimationFrame(() => this.update());
  }

  update() {
    const t = performance.now();
    const dt = t - this.lastUpdate;

    const DIST = 1; // inc
    this.el.style.top = this.pointer.y - this.el.getBoundingClientRect().height / 2 - DIST * Display.DPI() + "px";
    this.el.style.left = this.pointer.x - this.el.getBoundingClientRect().width / 2 - DIST * Display.DPI() + "px";

    this.lastUpdate = t;
    requestAnimationFrame(() => this.update());
  }

  updatePointer(x: number, y: number) {
    this.pointer = { x, y };
  }

  private createMenu() {
    const primary = tailwind.theme.extend.colors["primary"];
    const primaryDark = tailwind.theme.extend.colors["primary-dark"];

    const div = document.createElement("div");
    div.style.zIndex = "20";
    div.style.position = "fixed";
    div.style.boxShadow = "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);";
    div.style.opacity = "0.8";
    div.style.color = "#FFF";
    div.style.backgroundColor = primary;
    div.style.borderRadius = "1rem";
    div.style.overflow = "hidden";
    div.style.display = "flex";
    div.style.top = "0.5rem";
    div.style.left = "5rem";

    const button = () => {
      const div = document.createElement("div");
      div.style.padding = "0.75rem";
      div.style.cursor = "pointer";
      div.addEventListener("pointerdown", () => (div.style.backgroundColor = primaryDark));
      div.addEventListener("pointerup", () => (div.style.backgroundColor = primary));
      div.addEventListener("pointerout", () => (div.style.backgroundColor = primary));
      return div;
    };

    const undoBtn = button();
    undoBtn.innerHTML = CaddieMenu.UndoIcon();
    undoBtn.addEventListener("pointerup", () => this.actionStack.undo());
    div.appendChild(undoBtn);

    const toolBtn = button();
    toolBtn.style.borderWidth = "2px";
    toolBtn.style.borderColor = primaryDark;
    toolBtn.style.borderStyle = "none solid";
    toolBtn.innerHTML = CaddieMenu.MenuIcon();
    toolBtn.addEventListener("pointerup", (e: PointerEvent) => {
      if (lastTool) {
        this.wheel.setTool(lastTool);
        lastTool = null;
        eraseBtn.innerHTML = CaddieMenu.EraserIcon();
      }
      div.style.visibility = "hidden";
      this.wheel.show(e.x, e.y);
    });
    this.wheel.onClose.addListener(() => (div.style.visibility = "visible"));
    div.appendChild(toolBtn);

    const eraseBtn = button();
    eraseBtn.innerHTML = CaddieMenu.EraserIcon();
    let lastTool = null;
    eraseBtn.addEventListener("pointerup", () => {
      console.log(lastTool);
      if (lastTool) {
        this.wheel.setTool(lastTool);
        lastTool = null;
        eraseBtn.innerHTML = CaddieMenu.EraserIcon();
      } else {
        lastTool = this.wheel.tool;
        this.wheel.setTool("eraser");
        eraseBtn.innerHTML = CaddieMenu.EraserOffIcon();
      }
    });
    div.appendChild(eraseBtn);

    document.body.appendChild(div);

    return div;
  }

  private static UndoIcon() {
    return `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" style="width: 1.5rem; height: 1.5rem;" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M479.9 394.9c0-19.6 4.2-97.1-56.8-158.7-40.4-40.7-91.9-61.7-163.4-65.5-2.1-.1-3.8-1.9-3.8-4V84c0-3.2-3.5-5.1-6.2-3.4L33.8 222.8c-2.4 1.6-2.4 5.1 0 6.7l215.9 142.2c2.7 1.8 6.2-.1 6.2-3.4v-81.6c0-2.3 1.9-4.1 4.2-4 44.1 1.7 69.5 10.9 97.1 23.2 36.1 16.2 72.9 50.9 94.5 83.5 13.1 19.9 19.2 33.9 21.4 39.7.7 1.7 2.3 2.8 4.1 2.8h2.9c-.1-11.7-.2-26.7-.2-37z"></path></svg>`;
  }

  private static MenuIcon() {
    return `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" style="width: 1.5rem; height: 1.5rem;" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M497.9 142.1l-46.1 46.1c-4.7 4.7-12.3 4.7-17 0l-111-111c-4.7-4.7-4.7-12.3 0-17l46.1-46.1c18.7-18.7 49.1-18.7 67.9 0l60.1 60.1c18.8 18.7 18.8 49.1 0 67.9zM284.2 99.8L21.6 362.4.4 483.9c-2.9 16.4 11.4 30.6 27.8 27.8l121.5-21.3 262.6-262.6c4.7-4.7 4.7-12.3 0-17l-111-111c-4.8-4.7-12.4-4.7-17.1 0zM124.1 339.9c-5.5-5.5-5.5-14.3 0-19.8l154-154c5.5-5.5 14.3-5.5 19.8 0s5.5 14.3 0 19.8l-154 154c-5.5 5.5-14.3 5.5-19.8 0zM88 424h48v36.3l-64.5 11.3-31.1-31.1L51.7 376H88v48z"></path></svg>`;
  }

  private static EraserIcon() {
    return `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" style="width: 1.5rem; height: 1.5rem;" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><desc></desc><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l10 -10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41l-9.2 9.3"></path><path d="M18 13.3l-6.3 -6.3"></path></svg>`;
  }

  private static EraserOffIcon() {
    return `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" style="width: 1.5rem; height: 1.5rem;" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><desc></desc><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M3 3l18 18"></path><path d="M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l4.995 -4.993m2.009 -2.01l2.997 -2.996a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41c-1.417 1.431 -2.406 2.432 -2.97 3m-2.02 2.043l-4.211 4.256"></path><path d="M18 13.3l-6.3 -6.3"></path></svg>`;
  }
}
