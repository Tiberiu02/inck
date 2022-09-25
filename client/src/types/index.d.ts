import App from "../canvas/Main";
import Profiler from "../canvas/Profiler";

export {};

declare global {
  interface Window {
    DPI: number;
    profiler?: Profiler;
    app?: App;
    dataLayer: any[];
    gtag: Function;

    // tawk.to
    Tawk_API: any;
    Tawk_LoadStart: any;
  }
}

declare module "*.glsl" {
  const contents: string;
  export default contents;
}
