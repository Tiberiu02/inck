#version 300 es

precision highp float;

in vec4 f_Color;
out vec4 FragColor;

void main() {
  FragColor = f_Color;
}