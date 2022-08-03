export interface EventCore {
  addListener: (listener: () => void) => void;
}

export type EventTrigger = () => void;

export function CreateEvent(): [EventCore, EventTrigger] {
  let listeners: (() => void)[] = [];

  const event = {
    addListener: (listener: () => void) => {
      listeners.push(listener);
    },
  };
  const trigger = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  return [event, trigger];
}
