// Detect screen DPI
function ComputeDPI() {
  let el = document.createElement("div");
  el.style.position = "absolute";
  el.style.height = "1in";
  el.style.top = "100%";
  document.body.appendChild(el);
  const dpi = el.offsetHeight;
  document.body.removeChild(el);
  return dpi;
}

export class Display {
  private static _DPI: number;
  private static _Width: number;
  private static _Height: number;
  private static _DevicePixelRatio: number;
  private static _InitDone: boolean;

  static get DPI(): number {
    return this._DPI;
  }

  static get Width(): number {
    return this._Width;
  }

  static get Height(): number {
    return this._Height;
  }

  static get AspectRatio(): number {
    return this._Width / this._Height;
  }

  static get DevicePixelRatio(): number {
    return this._DevicePixelRatio;
  }

  private static ComputeScreenSize() {
    this._Width = window.innerWidth;
    this._Height = window.innerHeight;
  }

  static Init() {
    if (this._InitDone) return;
    this._InitDone = true;

    this.ComputeScreenSize();
    this._DPI = ComputeDPI();
    this._DevicePixelRatio = window.devicePixelRatio;
    window.addEventListener("resize", () => this.ComputeScreenSize());
  }
}

if (typeof window !== "undefined") {
  Display.Init();
}

export function TestFastRenderingSupport(): boolean {
  if (typeof navigator == "undefined") return false;
  return false;
  const ua = navigator.userAgent;
  return (
    navigator.vendor != "Apple Computer, Inc." &&
    !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua) &&
    /Chrome/i.test(ua)
  );
}
