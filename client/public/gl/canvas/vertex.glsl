precision highp float;

attribute vec2 a_Position;
attribute vec4 a_Color;

varying vec4 f_Color;

uniform float u_AspectRatio;
uniform float u_Zoom;
uniform float u_Left;
uniform float u_Top;

void main() {
  f_Color = a_Color;
  gl_Position = vec4(
    (a_Position[0] - u_Left) * u_Zoom * 2.0 - 1.0,
    (a_Position[1] - u_Top) * u_Zoom * u_AspectRatio * -2.0 + 1.0,
    0.0, 1.0
  );
}