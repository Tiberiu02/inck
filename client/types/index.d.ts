import App from "../canvas/Main";
import Profiler from "../canvas/Profiler";

export {};

declare global {
  interface Window {
    DPI: number;
    profiler?: Profiler;
    app?: App;
    userId?: string;
    dataLayer: any[];
    gtag: Function;
  }
}

declare module "*.glsl" {
  const contents: string;
  export default contents;
}
