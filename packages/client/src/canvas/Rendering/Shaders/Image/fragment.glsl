precision highp float;
 
varying vec2 v_TexCoord;
 
uniform sampler2D u_Texture;
uniform float u_Alpha;
 
void main() {
   vec4 tex = texture2D(u_Texture, v_TexCoord);
   gl_FragColor = vec4(tex.rgb, tex.a * u_Alpha);
}