import { useEffect, useRef } from "react";
import Main from "../canvas/Main.ts";

export default function Canvas(props) {
  const canvasRef = useRef(null);

  useEffect(() => {
    console.log(canvasRef.current);
    const main = new Main(canvasRef.current);
    return () => main.detach();
  }, [canvasRef]);

  return <canvas ref={canvasRef} />;
}
