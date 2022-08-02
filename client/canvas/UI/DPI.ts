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

export function DPI(): number {
  if (!window.DPI) {
    ComputeDPI();
  }

  return window.DPI;
}
