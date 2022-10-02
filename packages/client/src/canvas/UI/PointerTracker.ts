import { CreateEvent, EventCore, EventTrigger } from "../DesignPatterns/EventDriven";

export enum PenTypes {
  MOUSE,
  STYLUS,
}

export interface PenEvent {
  x: number;
  y: number;
  pressure: number;
  timeStamp: number;
  target: EventTarget;
  pointerType: PenTypes;
  preventDefault: () => void;
}

export interface Finger {
  id: number;
  x: number;
  y: number;
  pressure: number;
  target: EventTarget;
}

export interface FingerEvent {
  timeStamp: number;
  fingers: Finger[];
  changedFingers: Finger[];
  preventDefault: () => void;
}

export interface iosTouch extends Touch {
  touchType: string;
}

function Clone<Type>(obj: Type): Type {
  return Object.assign({}, obj);
}

export class PointerTracker {
  public onPenEvent: EventCore<PenEvent>;
  private triggerPenEvent: EventTrigger<PenEvent>;

  public onFingerEvent: EventCore<FingerEvent>;
  private triggerFingerEvent: EventTrigger<FingerEvent>;

  private fingers: { [id: number]: Finger };

  private trackingSufrace: HTMLDivElement;

  constructor() {
    [this.onPenEvent, this.triggerPenEvent] = CreateEvent();
    [this.onFingerEvent, this.triggerFingerEvent] = CreateEvent();

    this.fingers = {};
    this.trackingSufrace = this.createTrackingSurface();

    // Add event listeners
    // Different listeners for Apple devices because
    // pointer events API is broken in Safari and
    // won't let us hide touch callout with e.preventDefault (yay!)
    if (navigator.vendor == "Apple Computer, Inc.") {
      this.trackingSufrace.addEventListener("mousedown", this.handleMouseEvent.bind(this));
      this.trackingSufrace.addEventListener("mousemove", this.handleMouseEvent.bind(this));
      this.trackingSufrace.addEventListener("mouseup", this.handleMouseEvent.bind(this));

      this.trackingSufrace.addEventListener("touchdown", this.handleTouchEvent.bind(this));
      this.trackingSufrace.addEventListener("touchmove", this.handleTouchEvent.bind(this));
      this.trackingSufrace.addEventListener("touchend", this.handleTouchEvent.bind(this));
    } else {
      this.trackingSufrace.addEventListener("pointerdown", this.handlePointerEvent.bind(this));
      this.trackingSufrace.addEventListener("pointermove", this.handlePointerEvent.bind(this));
      this.trackingSufrace.addEventListener("pointerup", this.handlePointerEvent.bind(this));
      this.trackingSufrace.addEventListener("pointerleave", this.handlePointerEvent.bind(this));
      this.trackingSufrace.addEventListener("pointerout", this.handlePointerEvent.bind(this));
    }
  }

  private static isPaused: boolean;
  static pause() {
    this.isPaused = true;
  }
  static unpause() {
    this.isPaused = false;
  }

  // iOS
  private handleMouseEvent(e: MouseEvent) {
    let penEvent: PenEvent = {
      x: e.x,
      y: e.y,
      pressure: e.buttons ? 0.5 : 0,
      timeStamp: performance.now(),
      target: e.target,
      pointerType: PenTypes.MOUSE,
      preventDefault: () => e.preventDefault(),
    };

    if (!PointerTracker.isPaused) {
      this.triggerPenEvent(penEvent);
    }
  }

  // iOS
  private handleTouchEvent(e: TouchEvent) {
    if ((e.changedTouches[0] as iosTouch).touchType == "stylus") {
      const t = e.changedTouches[0] as iosTouch;

      const pointerEvent: PenEvent = {
        x: t.clientX,
        y: t.clientY,
        pressure: t.touchType == "stylus" ? t.force : 0.5,
        timeStamp: e.timeStamp,
        target: t.target,
        pointerType: PenTypes.MOUSE,
        preventDefault: () => e.preventDefault(),
      };

      this.triggerPenEvent(pointerEvent);
    } else {
      const touchToFinger = (t: Touch): Finger => ({
        id: t.identifier,
        x: t.clientX,
        y: t.clientY,
        pressure: t.force,
        target: t.target,
      });

      const touches = e.changedTouches;
      for (let i = 0; i < touches.length; i++) {
        const t = touches.item(i);
        if (e.type == "touchstart" || e.type == "touchmove") {
          this.fingers[t.identifier] = touchToFinger(t);
        } else {
          delete this.fingers[t.identifier];
        }
      }

      const fingerEvent: FingerEvent = {
        timeStamp: e.timeStamp,
        fingers: [...e.touches].map(touchToFinger),
        changedFingers: [...e.changedTouches].map(touchToFinger),
        preventDefault: () => e.preventDefault(),
      };

      if (!PointerTracker.isPaused) {
        this.triggerFingerEvent(fingerEvent);
      }
    }
  }

  // non iOS
  private handlePointerEvent(e: PointerEvent) {
    if (e.pointerType == "mouse" || e.pointerType == "pen") {
      const penEvent: PenEvent = {
        x: e.clientX,
        y: e.clientY,
        pressure: e.pressure,
        timeStamp: e.timeStamp,
        target: e.target,
        pointerType: e.pointerType == "mouse" ? PenTypes.MOUSE : PenTypes.STYLUS,
        preventDefault: () => e.preventDefault(),
      };

      if (!PointerTracker.isPaused) {
        this.triggerPenEvent(penEvent);
      }
    } else {
      const finger: Finger = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        pressure: e.pressure,
        target: e.target,
      };

      if (e.type == "pointerdown" || e.type == "pointermove") {
        this.fingers[finger.id] = finger;
      } else {
        delete this.fingers[finger.id];
      }

      const fingerEvent: FingerEvent = {
        timeStamp: e.timeStamp,
        fingers: Object.values(this.fingers).map(Clone),
        changedFingers: [Clone(finger)],
        preventDefault: () => e.preventDefault(),
      };

      if (!PointerTracker.isPaused) {
        this.triggerFingerEvent(fingerEvent);
      }
    }
  }

  private createTrackingSurface() {
    let s = document.createElement("div");

    s.style.position = "absolute";
    s.style.top = "0px";
    s.style.left = "0px";
    s.style.width = "100%";
    s.style.height = "100%";

    document.body.appendChild(s);

    return s;
  }
}
