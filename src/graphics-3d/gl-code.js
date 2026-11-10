
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
CENTROID varying vec2 fragTexCoord; // sampled inside the face even when MSAA shades a pixel whose center is outside it
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

// How the block shader treats a texel's alpha, set with the uAlphaMode uniform
const ALPHA_BLEND = 0; // blended over what is behind it, for translucent blocks
const ALPHA_TEST = 1; // drawn solid or not at all, for opaque and cutout blocks
const ALPHA_COVERAGE = 2; // decides how many of a pixel's samples are covered, for cutout blocks with MSAA

var fragmentShaderSrc = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

CENTROID varying vec2 fragTexCoord;
varying vec3 fragPosition;
varying vec4 fragShadow;
varying vec2 fragShaCoord;
varying float fragDoFog;
// varying vec4 fragColor;
varying float fragFog;
uniform sampler2D sampler;
uniform int uAlphaMode;

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
  float coverage = color.a;

  // Cutout texels are either drawn solid or not at all, like Minecraft's
  // cutout layer, so blended mipmap edges never hide what is behind them
  if (uAlphaMode == ${ALPHA_TEST}) {
    if (color.a < 0.5) discard;
    color.a = 1.0;
  }

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

  // The texel's alpha becomes the share of the pixel's samples it covers.
  // The soft edge of partly covered texels is narrowed to about a pixel, so
  // leaf edges are smoothed without faint distant leaves showing as
  // see-through patterns.
  //
  // Texels within a step of fully opaque or fully clear are snapped to it
  // instead: blending mip levels can leave opaque texels a hair below 1, and
  // at face edges the screen-space slope also measures pixels outside the
  // face, so sharpening them would punch holes along the edges of solid blocks.
  if (uAlphaMode == ${ALPHA_COVERAGE}) {
    const float STEP = 1.0 / 255.0;
#ifdef WEBGL2
    float sharpened = clamp((coverage - 0.5) / max(fwidth(coverage), 0.0001) + 0.5, 0.0, 1.0);
#else
    float sharpened = coverage;
#endif
    if (coverage >= 1.0 - STEP) coverage = 1.0;
    else if (coverage <= STEP) coverage = 0.0;
    else coverage = sharpened;
    color.a = coverage;
  }
  if (color.a == 0.0) discard;

  gl_FragColor = color;
}

`;

/**
 * Supersampling: the scene is drawn at several times the screen's size, then
 * each block of factor by factor texels is averaged into one screen pixel.
 * Colors are averaged in linear light so edges don't come out too dark.
 */

const MAX_SSAA_FACTOR = 4; // largest supersampling factor along each axis

var downsampleVertexShaderSrc = `
attribute vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

var downsampleFragmentShaderSrc = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

const int MAX_FACTOR = ${MAX_SSAA_FACTOR};

uniform sampler2D uScene;
uniform vec2 uSceneSize; // texels
uniform int uFactor; // texels per screen pixel along each axis

void main() {
  vec4 sum = vec4(0.0);

  for (int i = 0; i < MAX_FACTOR; i++) {
    if (i >= uFactor) break;
    for (int j = 0; j < MAX_FACTOR; j++) {
      if (j >= uFactor) break;

      vec2 texel = floor(gl_FragCoord.xy) * float(uFactor) + vec2(float(i), float(j)) + 0.5;
      vec4 color = texture2D(uScene, texel / uSceneSize);
      sum += vec4(pow(color.rgb, vec3(2.2)), color.a);
    }
  }

  sum /= float(uFactor * uFactor);
  gl_FragColor = vec4(pow(sum.rgb, vec3(1.0 / 2.2)), sum.a);
}
`;
