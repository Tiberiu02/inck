// Detect screen DPI
function ComputeDPI() {
  let el = document.createElement("div");
  el.style.position = "absolute";
  el.style.height = "1in";
  el.style.top = "100%";
  document.body.appendChild(el);
  window.DPI = el.offsetHeight;
  document.body.removeChild(el);
}

export class Display {
  static DPI(): number {
    if (!window.DPI) {
      ComputeDPI();
    }

    return window.DPI;
  }

  static Width(): number {
    return document.documentElement.clientWidth;
  }

  static Height(): number {
    return document.documentElement.clientHeight;
  }

  static AspectRatio(): number {
    return document.documentElement.clientWidth / document.documentElement.clientHeight;
  }
}

export function TestFastRenderingSupport(): boolean {
  const ua = navigator.userAgent;
  return (
    navigator.vendor != "Apple Computer, Inc." &&
    !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua) &&
    /Chrome/i.test(ua)
  );
}