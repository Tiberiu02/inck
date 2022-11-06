#version 300 es

precision highp float;
 
uniform sampler2D u_Texture;
uniform float u_Alpha;
 
in vec2 v_TexCoord;
out vec4 FragColor;
 
void main() {
   vec4 tex = texture(u_Texture, v_TexCoord);
   FragColor = vec4(tex.rgb, tex.a * u_Alpha);
}