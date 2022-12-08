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

export let DisplayData = {} as {
  DPI: number;
  Width: number;
  Height: number;
  RealWidth: number;
  RealHeight: number;
  AspectRatio: number;
  DevicePixelRatio: number;
};

if (typeof window !== "undefined") {
  const updateDisplaData = () => {
    DisplayData.DPI = ComputeDPI();
    DisplayData.Width = window.innerWidth;
    DisplayData.Height = window.innerHeight;
    DisplayData.AspectRatio = window.innerWidth / window.innerHeight;
    DisplayData.DevicePixelRatio = window.devicePixelRatio;
    DisplayData.RealWidth = window.innerWidth * window.devicePixelRatio;
    DisplayData.RealHeight = window.innerHeight * window.devicePixelRatio;
  };

  window.addEventListener("resize", updateDisplaData);

  updateDisplaData();
}

export const Display = DisplayData as Readonly<typeof DisplayData>;

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
