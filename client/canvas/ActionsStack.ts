import { CanvasManager } from "./CanvasManager";
import { Action } from "./types";

export class ActionStack {
  private actions: Action[];
  private index: number; // index of the last action done

  constructor() {
    this.actions = [];
    this.index = -1;
  }

  push(action: Action) {
    // Clear undone actions from the stack
    while (this.actions.length > this.index + 1) {
      this.actions.pop();
    }

    this.index = this.actions.length;
    this.actions.push(action);
  }

  undo() {
    if (this.index >= 0) {
      this.actions[this.index].undo();
      this.index--;
    }
  }

  redo() {
    if (this.index + 1 < this.actions.length) {
      this.index++;
      this.actions[this.index].redo();
    }
  }
}
