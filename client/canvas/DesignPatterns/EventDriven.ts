export interface EventCore<Type = any> {
  addListener: (listener: (arg?: Type) => void) => void;
}

export type EventTrigger<Type = any> = (arg?: Type) => void;

export function CreateEvent<Type>(): [EventCore<Type>, EventTrigger<Type>] {
  let listeners: ((arg: any) => void)[] = [];

  const event = {
    addListener: (listener: (arg: any) => void) => {
      listeners.push(listener);
    },
  };
  const trigger = (arg: any) => {
    for (const listener of listeners) {
      listener(arg);
    }
  };

  return [event, trigger];
}
