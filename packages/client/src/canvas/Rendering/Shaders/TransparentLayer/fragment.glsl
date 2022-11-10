#version 300 es

precision highp float;
 
in vec2 v_TexCoord;
out vec4 FragColor;
 
uniform sampler2D u_Texture;
 
void main() {
   vec4 tex = texture(u_Texture, v_TexCoord);
   FragColor = vec4(tex.rgb, $OPACITY * tex.a);
}