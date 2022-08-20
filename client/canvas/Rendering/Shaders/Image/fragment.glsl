precision mediump float;
 
varying vec2 v_texcoord;
 
uniform sampler2D u_texture;
uniform float u_alpha;
 
void main() {
   vec4 tex = texture2D(u_texture, v_texcoord);
   gl_FragColor = vec4(tex.rgb, tex.a * u_alpha);
}