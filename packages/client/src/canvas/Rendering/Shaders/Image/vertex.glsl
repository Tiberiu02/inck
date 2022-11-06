#version 300 es

precision highp float;

in vec2 a_Position;
 
uniform mat4 u_Matrix;
 
out vec2 v_TexCoord;
 
void main() {
   gl_Position = u_Matrix * vec4(a_Position, 0.0, 1.0);
   v_TexCoord = a_Position;
}