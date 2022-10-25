
Objs = {};

function initWebgl2D() {
    // Initializing webgl
    canvas2d = document.getElementById('web2d');
    gl2d = canvas2d.getContext('webgl');
    
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
    
    /** CREATE TEXTURES **/
    let widgets = new Texture("https://i.ibb.co/993wyXL/widgets-png.png");
    widgets.loadImage(()=>webglSetup2D(gl2d, program, widgets));
    
}

function webglSetup2D(GL, program, textures) {
    let width = window.innerWidth;
    let height = window.innerHeight;

    textures.glBind(GL);

    let hotbar = new TextureQuad(textures.img);
    let selectbox = new TextureQuad(textures.img);
    let buffer2d = new Buffer2D(GL, program);
    hotbar.textureCoords(0, 0, 182, 22);
    selectbox.textureCoords(0, 22, 24, 46);

    Objs.hotbar = hotbar;
    Objs.selectbox = selectbox;
    Objs.buffer = buffer2d;
    Objs.textures = textures;
    
    resizeGui();
}

function resizeGui() {
    canvasResize(canvas2d, gl2d);

    let width = window.innerWidth;
    let height = window.innerHeight;
    let hotbar = Objs.hotbar;
    let buffer = Objs.buffer;
    let selectbox = Objs.selectbox;
    
    hotbar.setRect(0, 0);
    hotbar.setWidth(width/3);
    hotbar.setLoc(width/2-hotbar.w/2, 0);

    updateHotbarSlot();

    renderAll2D();
}

function updateHotbarSlot(index = player.hotslot) {
    let boxw = Objs.hotbar.h * 0.91;
    Objs.selectbox.setRect(0, 0);
    Objs.selectbox.setHeight(Objs.hotbar.h);
    Objs.selectbox.setLoc(window.innerWidth/2-Objs.hotbar.w/2 + boxw * index, 1);
    renderAll2D();
}

function renderAll2D() {
    Objs.buffer.clear();
    Objs.buffer.loadVertices(Objs.hotbar.getVertices());
    Objs.buffer.loadVertices(Objs.selectbox.getVertices());
    Objs.buffer.updateBuffer();
    Objs.buffer.render();
}

var vertexShaderSrc2D = `
precision mediump float;

// Input variables
attribute vec2 vertPosition;
attribute vec3 vertColor;
attribute vec2 vertTexCoord;

// Output variables
varying vec3 fragColor;
varying vec2 fragTexCoord;

void main() {
  fragColor = vertColor;
  fragTexCoord = vertTexCoord;
  gl_Position = vec4(vertPosition, 0.0, 1.0);
}

`;

var fragmentShaderSrc2D = `
precision mediump float;

varying vec3 fragColor;
varying vec2 fragTexCoord;
uniform sampler2D sampler;

void main() {
    vec4 color = texture2D(sampler, fragTexCoord);
    if (color.a == 0.0) discard;

    gl_FragColor = color;
}

`;
