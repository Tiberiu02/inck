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

  public onPenButton: EventCore<boolean>;
  private triggerPenButton: EventTrigger<boolean>;

  private fingers: { [id: number]: Finger };

  private trackingSufrace: HTMLDivElement;

  private isPaused: boolean;

  public static instance: PointerTracker;

  private penEvent: PenEvent;
  private fingerEvent: FingerEvent;

  constructor() {
    Object.assign(document.body.style, {
      width: "100vw",
      height: "100vh",
      "touch-action": "none",

      "-webkit-user-select": "none" /* Chrome all / Safari all */,
      "-moz-user-select": "none" /* Firefox all */,
      "-ms-user-select": "none" /* IE 10+ */,
      "user-select": "none" /* Likely future */,

      "-webkit-touch-callout": "none",
      "-webkit-tap-highlight-color": "transparent",

      overflow: "hidden",
    });
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    [this.onPenEvent, this.triggerPenEvent] = CreateEvent();
    [this.onFingerEvent, this.triggerFingerEvent] = CreateEvent();
    [this.onPenButton, this.triggerPenButton] = CreateEvent();

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

    PointerTracker.instance = this;
    this.penEvent = {} as PenEvent;
    this.fingerEvent = {} as FingerEvent;
  }

  pause() {
    this.isPaused = true;

    if (Object.values(this.fingers).length) {
      const fingerEvent: FingerEvent = {
        timeStamp: Date.now(),
        fingers: [],
      };

      this.triggerFingerEvent(fingerEvent);
      this.fingers = {};
    }
  }
  unpause() {
    this.isPaused = false;
  }

  // iOS
  private handleMouseEvent(e: MouseEvent) {
    if (this.isPaused) return;

    e.preventDefault();

    this.penEvent.x = e.x;
    this.penEvent.y = e.y;
    this.penEvent.pressure = e.buttons ? 0.5 : 0;
    this.penEvent.timeStamp = e.timeStamp;
    this.penEvent.target = e.target;
    this.penEvent.pointerType = PenTypes.MOUSE;

    this.triggerPenEvent(this.penEvent);
  }

  // iOS
  private handleTouchEvent(e: TouchEvent) {
    if (this.isPaused) return;

    e.preventDefault();

    if ((e.changedTouches[0] as iosTouch).touchType == "stylus") {
      const t = e.changedTouches[0] as iosTouch;

      const pointerEvent: PenEvent = {
        x: t.clientX,
        y: t.clientY,
        pressure: t.touchType == "stylus" ? t.force : 0.5,
        timeStamp: e.timeStamp,
        target: t.target,
        pointerType: PenTypes.MOUSE,
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
      };

      this.triggerFingerEvent(fingerEvent);
    }
  }

  static penButton: boolean = false;
  // non iOS
  private handlePointerEvent(e: PointerEvent) {
    if (this.isPaused) return;

    e.preventDefault();

    if (e.pointerType == "mouse" || e.pointerType == "pen") {
      const oldPenButton = PointerTracker.penButton;
      PointerTracker.penButton = PointerTracker.penButton
        ? e.buttons > 0
        : e.buttons > 1 || (e.buttons == 1 && !e.pressure);

      if (PointerTracker.penButton != oldPenButton) {
        this.triggerPenButton(PointerTracker.penButton);
      }

      this.penEvent.x = e.x;
      this.penEvent.y = e.y;
      this.penEvent.pressure = PointerTracker.penButton ? 0.5 : e.pressure;
      this.penEvent.timeStamp = e.timeStamp;
      this.penEvent.target = e.target;
      this.penEvent.pointerType = e.pointerType == "mouse" ? PenTypes.MOUSE : PenTypes.STYLUS;

      this.triggerPenEvent(this.penEvent);
    } else {
      if (e.type == "pointerdown") {
        this.fingers[e.pointerId] = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          pressure: e.pressure,
          target: e.target,
        };
      } else if (e.type == "pointermove") {
        const finger = this.fingers[e.pointerId];
        finger.x = e.clientX;
        finger.y = e.clientY;
        finger.pressure = e.pressure;
        finger.target = e.target;
      } else {
        delete this.fingers[e.pointerId];
      }

      const fingerEvent: FingerEvent = {
        timeStamp: e.timeStamp,
        fingers: Object.values(this.fingers),
      };

      this.triggerFingerEvent(fingerEvent);
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
