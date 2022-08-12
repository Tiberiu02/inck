export interface Action {
  undo: () => boolean;
  redo: () => void;
}

export class ActionStack {
  private actions: Action[];
  private indexOfLastActionDone: number;

  constructor() {
    this.actions = [];
    this.indexOfLastActionDone = -1;
  }

  push(action: Action) {
    // Clear undone actions from the stack
    while (this.actions.length > this.indexOfLastActionDone + 1) {
      this.actions.pop();
    }

    this.indexOfLastActionDone = this.actions.length;
    this.actions.push(action);
  }

  undo() {
    console.log("undoing");
    if (this.indexOfLastActionDone >= 0) {
      const success = this.actions[this.indexOfLastActionDone].undo();
      if (success) {
        this.indexOfLastActionDone--;
      } else {
        // Action cannot be undone, remove from stack and retry
        this.actions.splice(this.indexOfLastActionDone, 1);
        this.indexOfLastActionDone--;
      }
    }
  }

  redo() {
    if (this.indexOfLastActionDone + 1 < this.actions.length) {
      this.indexOfLastActionDone++;
      this.actions[this.indexOfLastActionDone].redo();
    }
  }
}
