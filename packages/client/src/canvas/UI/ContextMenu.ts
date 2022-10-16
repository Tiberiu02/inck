import { V2, Vector2D } from "../Math/V2";
import { ToolManager } from "../Tooling/ToolManager";
import { FingerEvent, PointerTracker } from "./PointerTracker";

const LONG_PRESS_DURATION = 1000; // ms
const LONG_PRESS_DIST = 20; // px
const MENU_DIST_FROM_FINGER = 50; // px

export function CreateOptionsMenu(toolManager: ToolManager) {
  const menu = document.createElement("div");
  menu.style.background = "#fff";
  menu.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.1), 0px 10px 30px rgba(0, 0, 0, 0.1)";
  menu.style.position = "absolute";
  menu.style.borderRadius = "0.5em";
  menu.style.overflow = "hidden";
  menu.style.visibility = "hidden";
  menu.style.top = "10px";
  menu.style.left = "10px";
  document.body.append(menu);

  const option = document.createElement("div");
  option.style.padding = "1rem 2rem";
  option.innerHTML = "Paste";
  option.addEventListener("pointerup", () => toolManager.paste());
  menu.append(option);

  PointerTracker.instance.onFingerEvent(handleFingerEvent);

  enum States {
    NO_FINGER,
    PRESSING,
    FAILED_LONG_PRESS,
  }

  let longPressTimeout: number;
  let startingPos: Vector2D;
  let state = States.NO_FINGER;

  function handleFingerEvent(e: FingerEvent) {
    if (state == States.NO_FINGER) {
      if (e.fingers.length == 1) {
        longPressTimeout = window.setTimeout(longPressCompleted, LONG_PRESS_DURATION);

        state = States.PRESSING;
        startingPos = e.fingers[0];
      } else if (e.fingers.length > 1) {
        state = States.FAILED_LONG_PRESS;
      }
    } else if (state == States.PRESSING) {
      if (e.fingers.length != 1 || V2.dist(startingPos, e.fingers[0]) > LONG_PRESS_DIST) {
        window.clearTimeout(longPressTimeout);
        state = States.FAILED_LONG_PRESS;
      }
    } else if (state == States.FAILED_LONG_PRESS) {
      if (!e.fingers.length) {
        state = States.NO_FINGER;
      }
    }
  }

  function longPressCompleted() {
    PointerTracker.instance.pause();

    showMenu();

    const handlePointerUp = () => {
      if (state != States.NO_FINGER) {
        state = States.NO_FINGER;
      } else {
        hideMenu();
        console.log("pointer up");

        window.removeEventListener("pointerup", handlePointerUp);

        window.setTimeout(() => PointerTracker.instance.unpause(), 100);
      }
    };

    window.addEventListener("pointerup", handlePointerUp);
  }

  function showMenu() {
    const bBox = menu.getBoundingClientRect();
    let x = startingPos.x - bBox.width / 2;
    let y = startingPos.y - bBox.height - MENU_DIST_FROM_FINGER;
    x = Math.max(0, Math.min(innerWidth - bBox.width, x));
    y = Math.max(0, Math.min(innerHeight - bBox.height, y));
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.visibility = "visible";
  }

  function hideMenu() {
    menu.style.visibility = "hidden";
  }
}
