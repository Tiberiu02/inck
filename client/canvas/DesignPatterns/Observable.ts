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

export class ObservableProperty<Type> extends Observable {
  protected value: Type;

  get(): Type {
    return this.value;
  }
}

export class MutableObservableProperty<Type> extends ObservableProperty<Type> {
  constructor(initialValue: Type) {
    super();
    this.value = initialValue;
  }

  set(newValue: Type) {
    this.value = newValue;
    super.registerUpdate();
  }
}
