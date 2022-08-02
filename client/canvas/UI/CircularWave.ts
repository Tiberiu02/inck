export function ShowCircularWave(x, y, r, duration) {
  let el = document.createElement("div");
  el.className = "circular-wave-animation";

  el.style.width = el.style.height = `${2 * r}px`;
  el.style.marginLeft = el.style.marginTop = `-${r}px`;
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.style.animationDuration = `${duration}ms`;

  document.body.appendChild(el);

  setTimeout(() => el.remove(), duration);
}
