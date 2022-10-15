import { V2, Vector2D } from "../Math/V2";
import { PenEvent, PointerTracker } from "./PointerTracker";

enum STATES {
  IDLE,
  FOLLOWING,
  FADE_OUT,
}

const MS_PER_TIME_UNIT = 1000;
const DIST_FROM_CURSOR = 150; // px
const TOP_PADDING = 10; //px
const LEFT_PADDING = 60; //px
const RIGHT_PADDING = 300; //px
const CORNER_PADDING = 10; //px
const TELEPORT_THRESHOLD = 200;

const MIN_OPACITY = 50; //%
const MAX_OPACITY = 80; //%

const PULL_FORCE = 5;

const OPACITY_SPEED = 500; // % / s
const OPACITY_SPEED_SLOW = 100; // % / s
const FADE_IN_DELAY = 200; // ms

const FRAME_SIZE = 100; // in

export interface FloatingMenu {
  setPosition(pos: Vector2D): void;
  setOpacity(opacity: number): void;
  setInteractive(interactive: boolean): void;
  width: number;
  height: number;
}

export class PenFollowingEngine {
  private menu: FloatingMenu;
  private lastUpdate: number;

  private pointer: Vector2D;
  private pos: Vector2D;

  private frame: Vector2D;
  private target: Vector2D;
  private opacity: number;
  private state: STATES;
  private enteredIdle: number;

  constructor(menu: FloatingMenu) {
    this.menu = menu;
    this.state = STATES.IDLE;

    this.frame = new Vector2D(0, 0);
    this.target = new Vector2D(LEFT_PADDING, CORNER_PADDING);
    this.pos = this.target;
    this.opacity = MAX_OPACITY;
    this.lastUpdate = performance.now();

    PointerTracker.instance.onPenEvent((e) => this.handlePenEvent(e));
    requestAnimationFrame(() => this.update());
  }

  private handlePenEvent(e: PenEvent) {
    let pointer = e.pressure ? new Vector2D(e.x, e.y) : null;

    this.pointer = pointer;

    if (pointer) {
      const displacement = new Vector2D(DIST_FROM_CURSOR, 0);

      const offset = new Vector2D(this.menu.width, this.menu.height);

      pointer = V2.sub(pointer, offset);

      // Frame = Stabilization algorithm
      this.frame = new Vector2D(
        Math.min(Math.max(this.frame.x, pointer.x - FRAME_SIZE), pointer.x),
        Math.min(Math.max(this.frame.y, pointer.y - FRAME_SIZE), pointer.y)
      );

      const frameCenter = V2.add(this.frame, V2.mul(new Vector2D(1, 1), FRAME_SIZE / 2));

      let angle = Math.PI * 1.45;
      if (V2.add(frameCenter, V2.rot(displacement, angle)).x < LEFT_PADDING) {
        angle = Math.PI + Math.acos((frameCenter.x - LEFT_PADDING) / DIST_FROM_CURSOR);
      }
      this.target = V2.add(frameCenter, V2.rot(displacement, angle));

      if (this.target.x > innerWidth - RIGHT_PADDING) {
        this.target = { x: innerWidth - RIGHT_PADDING, y: this.target.y };
      }
    }
  }

  private update() {
    const t = performance.now();
    const dt = (t - this.lastUpdate) / MS_PER_TIME_UNIT;

    const target_pull = () => {
      this.pos = V2.add(this.pos, V2.mul(V2.sub(this.target, this.pos), Math.min(1, PULL_FORCE * dt)));
    };

    if (!this.pointer && this.target.y < TOP_PADDING) {
      if (this.target.x > LEFT_PADDING) {
        this.target = new Vector2D(this.target.x - this.menu.width, TOP_PADDING);
      } else {
        this.target = new Vector2D(LEFT_PADDING + 2 * this.menu.width, TOP_PADDING);
      }
    }

    if (this.state == STATES.IDLE) {
      if (this.pointer) {
        if (V2.dist(this.pos, this.target) > TELEPORT_THRESHOLD) {
          this.state = STATES.FADE_OUT;
        } else {
          this.state = STATES.FOLLOWING;
        }
        this.menu.setInteractive(false);
      } else {
        if (performance.now() - this.enteredIdle > FADE_IN_DELAY) {
          this.opacity = Math.min(MAX_OPACITY, this.opacity + dt * OPACITY_SPEED);
        }
        target_pull();
      }
    } else if (this.state == STATES.FOLLOWING) {
      target_pull();

      if (this.opacity < MIN_OPACITY) {
        this.opacity = Math.min(MIN_OPACITY, this.opacity + dt * OPACITY_SPEED_SLOW);
      } else {
        this.opacity = Math.max(MIN_OPACITY, this.opacity - dt * OPACITY_SPEED_SLOW);
      }

      if (!this.pointer) {
        this.menu.setInteractive(true);
        this.state = STATES.IDLE;
        this.enteredIdle = performance.now();
      }
    } else if (this.state == STATES.FADE_OUT) {
      if (this.opacity > 0) {
        this.opacity -= dt * OPACITY_SPEED;
      } else {
        this.pos = this.target;
        this.state = STATES.FOLLOWING;
      }
    }

    this.menu.setPosition(this.pos);
    this.menu.setOpacity(this.opacity);

    this.lastUpdate = t;
    requestAnimationFrame(() => this.update());
  }

  translatePosition(d: Vector2D) {
    this.target = this.pos = V2.add(this.pos, d);
  }
}
