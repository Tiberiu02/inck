precision highp float;

attribute vec2 a_Position;
 
varying vec2 v_TexCoord;
 
void main() {
   // WebGL 2 required
   // if (gl_VertexID == 0) {
   //    gl_Position = vec4(-1.0, -1.0, 0.0, 1.0);
   //    v_TexCoord = vec2(0.0, 0.0);
   // } else {
      gl_Position = vec4(a_Position.x * 2.0 - 1.0, a_Position.y * 2.0 - 1.0, 0.0, 1.0);
      v_TexCoord = a_Position;
   // }
}