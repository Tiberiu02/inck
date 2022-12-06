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

export let Display: Readonly<{
  DPI: number;
  Width: number;
  Height: number;
  AspectRatio: number;
  DevicePixelRatio: number;
}>;

if (typeof window !== "undefined") {
  Display = {
    DPI: ComputeDPI(),
    Width: window.innerWidth,
    Height: window.innerHeight,
    AspectRatio: window.innerWidth / window.innerHeight,
    DevicePixelRatio: window.devicePixelRatio,
  };

  window.addEventListener("resize", () => {
    Display = {
      DPI: Display.DPI,
      Width: window.innerWidth,
      Height: window.innerHeight,
      AspectRatio: window.innerWidth / window.innerHeight,
      DevicePixelRatio: window.devicePixelRatio,
    };
  });
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
