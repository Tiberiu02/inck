export {};

declare global {
  interface Window {
    DPI: number;
  }
}

declare module "*.glsl" {
  const contents: string;
  export default contents;
}
