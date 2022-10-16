import { CreateEvent, EventCore, EventTrigger } from "../DesignPatterns/EventDriven";
import { RenderLoop } from "../Rendering/RenderLoop";

export interface Action {
  undo: () => boolean;
  redo: () => void;
}

export class ActionStack {
  private actions: Action[];
  private indexOfLastActionDone: number;

  public onUpdate: EventCore;
  private triggerUpdate: EventTrigger;

  constructor() {
    this.actions = [];
    this.indexOfLastActionDone = -1;

    [this.onUpdate, this.triggerUpdate] = CreateEvent();
  }

  push(action: Action) {
    // Clear undone actions from the stack
    while (this.actions.length > this.indexOfLastActionDone + 1) {
      this.actions.pop();
    }

    this.indexOfLastActionDone = this.actions.length;
    this.actions.push(action);
    this.triggerUpdate();
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
      this.triggerUpdate();
    }
  }

  redo() {
    if (this.indexOfLastActionDone + 1 < this.actions.length) {
      this.indexOfLastActionDone++;
      this.actions[this.indexOfLastActionDone].redo();
      this.triggerUpdate();
    }
  }

  canRedo() {
    return this.indexOfLastActionDone + 1 < this.actions.length;
  }
}
