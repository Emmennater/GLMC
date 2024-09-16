
/**
 * Vertex and Shader code
 * sent to GPU
 */

var blockVertexShaderSrc = `
attribute vec3  aVertex;
attribute vec2  aTexture;
attribute float aShadow;

varying vec2  vTexture;
varying float vShadow;
varying float vFog;

uniform mat4 mView;
uniform float uDist;
uniform vec3 uPos;

void main(void) {
  vTexture = aTexture;
  vShadow = aShadow > 0.0 ? aShadow : 1.0;
  gl_Position = uView * vec4( aVertex, 1.0);

  float range = max(uDist / 5.0, 8.0);
  vFog = clamp((length(uPos.xz - aVertex.xz) - uDist + range) / range, 0.0, 1.0);
}
`;

var vertexShaderSrc = `
// precision mediump float;

// Input variables
attribute vec3 vertPosition;
attribute vec2 vertTexCoord;
attribute vec4 vertShadow;
attribute vec2 vertShaCoord;
// attribute vec4 vertColor;
attribute float vertDoFog;

// Output variables
varying vec2 fragTexCoord;
varying vec3 fragPosition;
varying vec4 fragShadow;
varying vec2 fragShaCoord;
// varying vec4 fragColor;
varying float fragDoFog;
varying float fragFog;

// Global variables
uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;
uniform float uDist;
uniform vec3 uPos;

void main() {
  fragTexCoord = vertTexCoord;
  fragPosition = vertPosition;
  fragShadow = vertShadow;
  fragShaCoord = vertShaCoord;
  // fragColor = vertColor;
  fragDoFog = vertDoFog;
  gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
  
  // Calculate fog (credit: minekhan)
  float range = max(uDist / 5.0, 8.0);
  fragFog = vertDoFog * clamp((length(uPos.xz - vertPosition.xz) - uDist + range) / range, 0.0, 1.0);
}

`;

var fragmentShaderSrc = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

varying vec2 fragTexCoord;
varying vec3 fragPosition;
varying vec4 fragShadow;
varying vec2 fragShaCoord;
varying float fragDoFog;
// varying vec4 fragColor;
varying float fragFog;
uniform sampler2D sampler;

int modulo(int num, int divisor) {
  return int(num - divisor * int(num / divisor));
}

vec3 binToCol(int bin) {
  int r = modulo(bin, 256);
  int g = modulo((bin / 256), 256);
  return vec3(
    float(r)/255.0 * 2.0,
    float(g)/255.0 * 2.0,
    float(int(bin / (256 * 256)))/255.0 * 2.0
  );
}

float lerp(float a, float b, float c) {
  return (1.0 - c) * a + b * c;
}

vec4 fog(vec4 color) {
  float r = 0.57; // 0.0;
  float g = 0.73; // 0.0;
  float b = 0.98; // 0.0;
  color.r += (r - color.r) * fragFog;
  color.g += (g - color.g) * fragFog;
  color.b += (b - color.b) * fragFog;
  return color;
}



void main() {
  // vec4 vecFog = vec4(1, 1, 1, 1.0 - fragFog);
  vec4 color = texture2D(sampler, fragTexCoord);
  bool grass = !( color.g > color.r && color.g - color.b > 0.1 );

  // Shadow binary back to vec3
  vec3 ftl = binToCol(int(fragShadow.x));
  vec3 ftr = binToCol(int(fragShadow.y));
  vec3 fbr = binToCol(int(fragShadow.z));
  vec3 fbl = binToCol(int(fragShadow.w));

  // Calculate color
  vec3 l = mix(fbl, ftl, fragShaCoord.t);
  vec3 r = mix(fbr, ftr, fragShaCoord.t);
  vec3 c = mix(l,  r,    fragShaCoord.s);
  
  color = vec4(
    color.x * c.x * c.x,
    color.y * c.y * c.y,
    color.z * c.z * c.z,
    color.w * (fragDoFog + 0.1)
  );

  color = fog(color); //  * vec4(1, grass, grass, 1)
  // color = c;
  if (color.a == 0.0) discard;

  gl_FragColor = color;
}

`;
