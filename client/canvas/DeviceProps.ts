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
  static get DPI(): number {
    if (!this._DPI) {
      this._DPI = ComputeDPI();
    }

    return this._DPI;
  }

  static get Width(): number {
    return document.documentElement.clientWidth;
  }

  static get Height(): number {
    return document.documentElement.clientHeight;
  }

  static get AspectRatio(): number {
    return document.documentElement.clientWidth / document.documentElement.clientHeight;
  }
}

export function TestFastRenderingSupport(): boolean {
  if (typeof navigator == "undefined") return false;
  const ua = navigator.userAgent;
  return (
    navigator.vendor != "Apple Computer, Inc." &&
    !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua) &&
    /Chrome/i.test(ua)
  );
}
