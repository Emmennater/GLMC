
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
attribute vec4 vertColor;
attribute float vertDoFog;

// Output variables
varying vec2 fragTexCoord;
varying vec3 fragPosition;
varying vec4 fragColor;
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
  fragColor = vertColor;
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
varying vec4 fragColor;
varying float fragFog;
uniform sampler2D sampler;

vec4 fog(vec4 color) {
  color.r += (0.57 - color.r) * fragFog;
  color.g += (0.73 - color.g) * fragFog;
  color.b += (0.98 - color.b) * fragFog;
  return color;
}

void main() {
  // vec4 vecFog = vec4(1, 1, 1, 1.0 - fragFog);
  vec4 color = texture2D(sampler, fragTexCoord);
  bool grass = !( color.g > color.r && color.g - color.b > 0.1 );

  color = fog(color * fragColor); //  * vec4(1, grass, grass, 1)
  if (color.a == 0.0) discard;

  gl_FragColor = color;
}

`;
