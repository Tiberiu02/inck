import { Display } from "../DeviceProps";
import { View } from "../View/View";
import { GL } from "./GL";

export function newLayer(renderFn: Function) {
  const gl = GL.ctx;

  // Create texture
  let tex: WebGLTexture;

  function initTexture() {
    if (tex) {
      gl.deleteTexture(tex);
    }

    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    {
      // define size and format of level 0
      const level = 0;
      const internalFormat = gl.RGBA;
      const border = 0;
      const format = gl.RGBA;
      const type = gl.UNSIGNED_BYTE;
      const data = null;
      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, Display.Width, Display.Height, border, format, type, data);

      // set the filtering so we don't need mips
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
  }

  initTexture();

  let updateRequired = true;

  window.addEventListener("resize", () => {
    initTexture();
    updateRequired = true;
  });

  View.instance.onUpdate(() => {
    updateRequired = true;
  });

  return {
    update() {
      if (updateRequired) {
        GL.beginLayer();
        renderFn();
        GL.finishLayer(tex);
        updateRequired = false;
      }
    },
    render(opacity: number = 1) {
      GL.layerProgram.renderLayer(tex, opacity);
    },
  };
}
