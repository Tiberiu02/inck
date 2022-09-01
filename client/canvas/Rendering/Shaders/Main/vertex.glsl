precision highp float;

attribute vec2 a_Position;
attribute vec4 a_Color;

varying vec4 f_Color;

uniform mat4 u_Matrix;


void main() {
  gl_Position = u_Matrix * vec4(a_Position, 0.0, 1.0);
  f_Color = a_Color;
}