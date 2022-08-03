export class Observable {
  private listeners: (() => void)[];

  constructor() {
    this.listeners = [];
  }

  onChange(listener: () => void) {
    this.listeners.push(listener);
  }

  protected registerChange() {
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
  }
}
