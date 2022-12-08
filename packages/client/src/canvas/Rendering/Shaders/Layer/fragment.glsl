#version 300 es

precision highp float;
 
in vec2 v_TexCoord;
out vec4 FragColor;
 
uniform sampler2D u_Texture;
uniform float u_Opacity;
 
void main() {
   vec4 tex = texture(u_Texture, v_TexCoord);
   FragColor = vec4(tex.rgb * u_Opacity, tex.a * u_Opacity);
}