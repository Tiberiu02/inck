export class Observable {
  private listeners: (() => void)[];

  constructor() {
    this.listeners = [];
  }

  onUpdate(listener: () => void) {
    this.listeners.push(listener);
  }

  protected registerUpdate() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export class ObservableNumber extends Observable {
  protected value: number;

  get() {
    return this.value;
  }
}

export class MutableObservableNumber extends ObservableNumber {
  constructor(initialValue: number) {
    super();
    this.value = initialValue;
  }

  set(newValue: number) {
    this.value = newValue;
    super.registerUpdate();
  }
}
