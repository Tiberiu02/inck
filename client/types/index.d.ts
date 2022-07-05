import App from "../canvas/Main";
import Profiler from "../canvas/Profiler";

export {};

declare global {
  interface Window {
    DPI: number;
    profiler?: Profiler;
    app?: App;
  }
}

declare module "*.glsl" {
  const contents: string;
  export default contents;
}
