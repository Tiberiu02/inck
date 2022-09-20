import { useEffect, useRef } from "react";
import Main from "../canvas/Main";

export default function Canvas(props) {
  useEffect(() => {
    if (window.app) return;
    window.app = new Main();
    //return () => main.detach();
  }, []);

  return <></>;
}
