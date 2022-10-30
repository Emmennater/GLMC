
function initWebgl() {
  // Initializing webgl
  canvas = document.getElementById('mycanvas');
  gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      antialias: false,
      premultipliedAlpha: false
  });
  
  if (!gl) {
    console.log('webgl not supported, falling back on experimental');
    gl = canvas.getContext('experimental-webgl');
  }
  if (!gl) alert('Your browser does not support WebGL');
  
  // enable UNSIGNED_INT for drawElements
  var uints_for_indices = gl.getExtension("OES_element_index_uint");
  
  // Make sure pixels are drawn in order
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CCW); // counter clockwise
  
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  program = createProgramObject(gl, vertexShaderSrc, fragmentShaderSrc);

  // Tell WebGL the program to run
  gl.useProgram(program);

  glCache = {};
  glCache.vertPos = gl.getAttribLocation(program, 'vertPosition');
  glCache.vertTex = gl.getAttribLocation(program, 'vertTexCoord');
  glCache.vertCol = gl.getAttribLocation(program, 'vertColor');
  glCache.vertDoFog = gl.getAttribLocation(program, 'vertDoFog');
  glCache.uPos = gl.getUniformLocation(program, 'uPos');
  glCache.uDist = gl.getUniformLocation(program, 'uDist');

  gl.uniform1f(glCache.uDist, 100);
}

function createProgramObject(gl, vertexShaderSrc, fragmentShaderSrc) {
  // Create Shaders
  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  
  // Set the source code of vertex and frag shaders
  gl.shaderSource(vertexShader, vertexShaderSrc);
  gl.shaderSource(fragmentShader, fragmentShaderSrc);
  
  // Compile the shaders
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(vertexShader));
    return;
  }
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error('ERROR compiling fragment shader!', gl.getShaderInfoLog(fragmentShader));
    return;
  }
  
  // Create program and attach shaders
  program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('ERROR linking program!', gl.getProgramInfo(program));
    return;
  }
  gl.validateProgram(program)
  if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
    console.error('ERROR validating program!', gl.getProgramInfo(program));
    return;
  }

  return program;
}

function setupVertexAttribs() {
  var vertexSize = 10;
  var totalSize = vertexSize * Float32Array.BYTES_PER_ELEMENT;

  gl.vertexAttribPointer(
    glCache.vertPos, // Attribute location
    3, // Number of elements per attribute
    gl.FLOAT, // Type of elements
    gl.FALSE,
    
    // 5 because x, y, z, tx, ty is 5 variables
    totalSize, // Size of individual vertex
    0 // Offset from beginning of a single vertex to this attribute
  );
  
  gl.vertexAttribPointer(
    glCache.vertTex, // Attribute location
    2, // Number of elements per attribute
    gl.FLOAT, // Type of elements
    gl.FALSE,
    totalSize, // Size of individual vertex
    3 * Float32Array.BYTES_PER_ELEMENT // Offset from beginning of a single vertex to this attribute
  );

  gl.vertexAttribPointer(
    glCache.vertCol, // Attribute location
    4, // Number of elements per attribute
    gl.FLOAT, // Type of elements
    gl.FALSE,
    totalSize, // Size of individual vertex
    5 * Float32Array.BYTES_PER_ELEMENT // Offset from beginning of a single vertex to this attribute
  );

  gl.vertexAttribPointer(
    glCache.vertDoFog, // Attribute location
    1, // Number of elements per attribute
    gl.FLOAT, // Type of elements
    gl.FALSE,
    totalSize, // Size of individual vertex
    9 * Float32Array.BYTES_PER_ELEMENT // Offset from beginning of a single vertex to this attribute
  );
  
  gl.enableVertexAttribArray(glCache.vertPos);
  gl.enableVertexAttribArray(glCache.vertTex);
  gl.enableVertexAttribArray(glCache.vertCol);
  gl.enableVertexAttribArray(glCache.vertShadow);
  gl.enableVertexAttribArray(glCache.vertDoFog);
  
}

function createTextures() {
  // Create texture
  var cubeTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  
  var img = new Image();
  img.alt = "txr";
  img.crossOrigin = "anonymous";
  img.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  }
  // olds:
  // https://i.ibb.co/KFMNywR/atlas2.png
  img.src = "https://i.ibb.co/k26xTvB/atlas.png" + "?not-from-cache-please";
  textures = img;
  
  // gl.activeTexture(gl.TEXURE0);
  
  gl.bindTexture(gl.TEXTURE_2D, null); // unbind texture
}

function setupMatricies() {
  // Transformations and Rotations
  var matWorldUniformLoc = gl.getUniformLocation(program, 'mWorld');
  var matViewUniformLoc = gl.getUniformLocation(program, 'mView');
  var matProjUniformLoc = gl.getUniformLocation(program, 'mProj');
  
  var worldMatrix = new Float32Array(16);
  var viewMatrix = new Float32Array(16);
  projMatrix = new Float32Array(16);
  mat4.identity(worldMatrix);
  mat4.identity(viewMatrix);
  mat4.identity(projMatrix);
  mat4.perspective(projMatrix, player.DYNAMIC_FOV, canvas.width/canvas.height, 0.1, 1000.0);

  // Set default matricies
  gl.uniformMatrix4fv(matWorldUniformLoc, gl.FALSE, worldMatrix);
  gl.uniformMatrix4fv(matViewUniformLoc, gl.FALSE, viewMatrix);
  gl.uniformMatrix4fv(matProjUniformLoc, gl.FALSE, projMatrix);
  
  return {
    world: worldMatrix,
    view: viewMatrix,
    proj: projMatrix,
    worldUniform: matWorldUniformLoc,
    viewUniform: matViewUniformLoc,
    projUniform: matProjUniformLoc
  };
}

function updateMatricies() {
  var matProjUniformLoc = gl.getUniformLocation(program, 'mProj');
  mat4.perspective(projMatrix, player.DYNAMIC_FOV, canvas.width/canvas.height, 0.1, 1000.0);
  gl.uniformMatrix4fv(matProjUniformLoc, gl.FALSE, projMatrix);

  mat4.identity(matrices.view);
  mat4.rotateX(matrices.view, matrices.view, player.yRot);   
  mat4.rotateY(matrices.view, matrices.view, player.xRot);   
  mat4.translate(matrices.view, matrices.view, [-player.x, -player.y-player.h+0.8, -player.z]);
  gl.uniformMatrix4fv(matrices.viewUniform, gl.FALSE, matrices.view);
}

class Buffer {
  constructor() {
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();
    this.vertices = [];
    this.indices = [];
    this.culling = true;
  }

  setUsing(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  }

  setVertices(gl, arr) {
    this.vertices = arr;
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(arr),
      gl.DYNAMIC_DRAW
    );
  }

  setIndices(gl, arr) {
    this.indices = arr;
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(arr),
      gl.DYNAMIC_DRAW
    );
  }

  setCulling(gl, state = this.culling) {
    this.culling = state;
    if (state) gl.enable(gl.CULL_FACE);
    else gl.disable(gl.CULL_FACE);
  }

  reset(gl) {
    this.setUsing(gl);
    this.setVertices(gl, []);
    this.setIndices(gl, []);
  }

  remove() {
    // Remove this buffer from the array
    let index = buffers.findIndex(e=>e==this);
    buffers.splice(index, 1);
  }

  setAttributes(gl) {
    if (this.indices.length == 0) return;
    this.setUsing(gl);
    this.setVertices(gl, this.vertices);
    this.setIndices(gl, this.indices);
  }

}

/*

























*/
