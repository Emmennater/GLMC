Objs = {};

async function initWebgl2D() {
  // Initializing webgl
  canvas2d = document.getElementById('web2d');
  gl2d = canvas2d.getContext('webgl', {
      preserveDrawingBuffer: true,
      antialias: false,
      premultipliedAlpha: false
  });
  TOPCANVAS = canvas2d;

  if (!gl2d) {
    console.log('webgl not supported, falling back on experimental');
    gl2d = canvas2d.getContext('experimental-webgl');
  }
  if (!gl2d) alert('Your browser does not support WebGL');

  canvasResize(canvas2d, gl2d);

  // gl2d.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl2d.clearColor(0, 0, 0, 0.0);
  gl2d.clear(gl2d.COLOR_BUFFER_BIT | gl2d.DEPTH_BUFFER_BIT);

  /** SHADERS **/

  // Create Shaders
  var vertexShader = gl2d.createShader(gl2d.VERTEX_SHADER);
  var fragmentShader = gl2d.createShader(gl2d.FRAGMENT_SHADER);

  // Set the source code of vertex and frag shaders
  gl2d.shaderSource(vertexShader, vertexShaderSrc2D);
  gl2d.shaderSource(fragmentShader, fragmentShaderSrc2D);

  // Compile the shaders
  gl2d.compileShader(vertexShader);
  if (!gl2d.getShaderParameter(vertexShader, gl2d.COMPILE_STATUS)) {
    console.error('ERROR compiling vertex shader!', gl2d.getShaderInfoLog(vertexShader));
    return;
  }
  gl2d.compileShader(fragmentShader);
  if (!gl2d.getShaderParameter(fragmentShader, gl2d.COMPILE_STATUS)) {
    console.error('ERROR compiling fragment shader!', gl2d.getShaderInfoLog(fragmentShader));
    return;
  }

  // Create program and attach shaders
  var program = gl2d.createProgram();
  gl2d.attachShader(program, vertexShader);
  gl2d.attachShader(program, fragmentShader);
  gl2d.linkProgram(program);
  if (!gl2d.getProgramParameter(program, gl2d.LINK_STATUS)) {
    console.error('ERROR linking program!', gl2d.getProgramInfo(program));
    return;
  }
  gl2d.validateProgram(program)
  if (!gl2d.getProgramParameter(program, gl2d.VALIDATE_STATUS)) {
    console.error('ERROR validating program!', gl2d.getProgramInfo(program));
    return;
  }
  gl2d.useProgram(program);

  // Setup location variables
  programInfo2D = {};
  programInfo2D.vertPosLoc = gl2d.getAttribLocation(program, 'vertPosition');
  programInfo2D.texCoordLoc = gl2d.getAttribLocation(program, 'vertTexCoord');
  programInfo2D.vertColLoc = gl2d.getAttribLocation(program, 'vertColor');
  programInfo2D.atlasLoc = gl2d.getAttribLocation(program, 'vertAtlas');
  programInfo2D.samplerLoc = gl2d.getUniformLocation(program, 'sampler');
  programInfo2D.sampler2Loc = gl2d.getUniformLocation(program, 'sampler2');
  
  /** CREATE TEXTURES **/
  let widgets = new Texture("https://i.ibb.co/993wyXL/widgets-png.png");
  let blocktxrs = new Texture("https://i.ibb.co/k26xTvB/atlas.png");
  widgets.loadImage(() =>
    blocktxrs.loadImage(() =>
      webglSetup2D(gl2d, program, widgets, blocktxrs)));

}

function webglSetup2D(GL, program, textures1, textures2) {
  let width = window.innerWidth;
  let height = window.innerHeight;

  // Setup which textures to render with
  GL.uniform1i(programInfo2D.samplerLoc, 0);
  GL.uniform1i(programInfo2D.sampler2Loc, 1);

  // Set GL texture atlas
  GL.activeTexture(GL.TEXTURE0);
  textures1.glBind(GL);
  GL.activeTexture(GL.TEXTURE1);
  textures2.glBind(GL);

  // Create textured objects
  let hotbar = new TextureQuad(textures1.img, 0);
  let selectbox = new TextureQuad(textures1.img, 0);

  let hotslots = new Hotbar(textures2.img);

  // Set initial hotbar
  hotslots.setSlot(0, "stone");
  hotslots.setSlot(1, "cobblestone");
  hotslots.setSlot(2, "bricks");
  hotslots.setSlot(3, "dirt");
  hotslots.setSlot(4, "glass");
  hotslots.setSlot(5, "oak_planks");
  hotslots.setSlot(6, "log");
  hotslots.setSlot(7, "leaves");
  hotslots.setSlot(8, "bedrock");

  // let blocktxr = new TextureQuad(textures2.img, 1);
  // blocktxr.textureCoords(x, y, x+16, y+16);
  // let blocktxr = new TextureHex(textures2.img, 1);
  // let coords = getTexture("grass");
  // console.log(coords);
  // let x1 = coords[0] * 16;
  // let y1 = coords[1] * 16;
  // let x2 = coords[6] * 16;
  // let y2 = coords[7] * 16;
  // let x3 = coords[2] * 16;
  // let y3 = coords[3] * 16;
  // blocktxr.setFaceTxr(0, x1+0.01, y1+0.01, x1+16, y1+16);
  // blocktxr.setFaceTxr(1, x2+0.01, y2+0.01, x2+16, y2+16);
  // blocktxr.setFaceTxr(2, x3+0.01, y3+0.01, x3+16, y3+16);

  // Create buffers
  let buffer2d = new Buffer2D(GL, program);
  // let buffer2d2 = new Buffer2D(GL, program);

  // Set texture coordinates
  hotbar.textureCoords(0, 0, 182, 22);
  selectbox.textureCoords(0, 22, 24, 46);

  // Define references
  Objs.hotbar = hotbar;
  Objs.selectbox = selectbox;
  Objs.buffer = buffer2d;
  Objs.hotslots = hotslots;
  // Objs.blocktxr = blocktxr;
  Objs.txr = [textures1, textures2];
  Objs.GL = GL;

  // Update positions and sizes
  resizeGui();
}

function resizeGui() {
  canvasResize(canvas2d, gl2d);

  let width = window.innerWidth;
  let height = window.innerHeight;
  let hotbar = Objs.hotbar;
  let buffer = Objs.buffer;
  let selectbox = Objs.selectbox;
  let hotslots = Objs.hotslots;

  // Update position and size
  hotbar.setRect(0, 0);
  hotbar.setWidth(width / 3);
  hotbar.setLoc(width / 2 - hotbar.w / 2, 0);

  // Update hotslots
  hotslots.update();

  // blocktxr.setRect(0, 0);
  // blocktxr.setWidth(hotbar.h*0.5);
  // blocktxr.setLoc(width/2 - hotbar.w/2 + hotbar.h/2, hotbar.h/2);
  // blocktxr.setWidth(hotbar.h*0.6 * (1-60/700));
  // blocktxr.setHeight(hotbar.h*0.6);
  // blocktxr.update();

  updateHotbarSlot();

  renderAll2D();
}

function updateHotbarSlot(index = player.hotslot) {
  let boxw = Objs.hotbar.h * 0.91;
  let diff = Objs.hotbar.h*0.04;
  Objs.selectbox.setRect(0, 0);
  Objs.selectbox.setHeight(Objs.hotbar.h*1.04);
  Objs.selectbox.setLoc(window.innerWidth / 2 - Objs.hotbar.w / 2 + boxw * index - diff, 0);
  renderAll2D();
}

function renderAll2D() {

  let GL = Objs.GL;
  let txrs = Objs.txr;

  Objs.buffer.clear();
  Objs.buffer.loadVertices(Objs.hotbar.getVertices());
  Objs.buffer.loadVertices(Objs.selectbox.getVertices());
  Objs.hotslots.loadVerts(Objs.buffer);
  // Objs.buffer.loadVertices(Objs.blocktxr.getVertices(0));
  // Objs.buffer.loadVertices(Objs.blocktxr.getVertices(1));
  // Objs.buffer.loadVertices(Objs.blocktxr.getVertices(2));
  Objs.buffer.updateBuffer();
  Objs.buffer.render();
}

var vertexShaderSrc2D = `
precision mediump float;

// Input variables
attribute vec2 vertPosition;
attribute vec3 vertColor;
attribute vec2 vertTexCoord;
attribute float vertAtlas;

// Output variables
varying vec3 fragColor;
varying vec2 fragTexCoord;
varying float fragAtlas;

void main() {
  fragColor = vertColor;
  fragTexCoord = vertTexCoord;
  fragAtlas = vertAtlas;
  gl_Position = vec4(vertPosition, 0.0, 1.0);
}

`;

var fragmentShaderSrc2D = `
precision mediump float;

varying vec3 fragColor;
varying vec2 fragTexCoord;
varying float fragAtlas;

uniform sampler2D sampler;
uniform sampler2D sampler2;

void main() {
    vec4 color1 = texture2D(sampler, fragTexCoord) * (1.0-fragAtlas);
    vec4 color2 = texture2D(sampler2, fragTexCoord) * fragAtlas;
    vec4 color = color1 + color2;
    if (color.a == 0.0) discard;
    color = color * vec4(fragColor, 1);

    gl_FragColor = color;
}

`;