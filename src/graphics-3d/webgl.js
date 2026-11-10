
function initWebgl() {
  // Initializing webgl
  canvas = document.getElementById('mycanvas');
  const options = {
      preserveDrawingBuffer: true,
      antialias: false,
      premultipliedAlpha: false
  };

  // WebGL 2 allows mipmaps on the atlas, whose size isn't a power of two
  gl = canvas.getContext('webgl2', options) || canvas.getContext('webgl', options);

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

  program = createProgramObject(gl,
    prepareShaderSource(gl, vertexShaderSrc, gl.VERTEX_SHADER),
    prepareShaderSource(gl, fragmentShaderSrc, gl.FRAGMENT_SHADER));

  // Tell WebGL the program to run
  gl.useProgram(program);

  glCache = {};
  glCache.vertPos = gl.getAttribLocation(program, 'vertPosition');
  glCache.vertTex = gl.getAttribLocation(program, 'vertTexCoord');
  glCache.vertSha = gl.getAttribLocation(program, "vertShadow");
  glCache.vertShaCoord = gl.getAttribLocation(program, "vertShaCoord");
  // glCache.vertCol = gl.getAttribLocation(program, 'vertColor');
  glCache.vertDoFog = gl.getAttribLocation(program, 'vertDoFog');
  glCache.uPos = gl.getUniformLocation(program, 'uPos');
  glCache.uDist = gl.getUniformLocation(program, 'uDist');
  glCache.uAlphaMode = gl.getUniformLocation(program, 'uAlphaMode');

  gl.uniform1f(glCache.uDist, 100);
}

/**
 * Prepare shader source written in GLSL ES 1.00 for the context. With WebGL 2
 * it is compiled as GLSL ES 3.00, which adds centroid sampling and fwidth;
 * defines map the old keywords onto the new ones, and WEBGL2 is defined so
 * shaders can use the newer features where they are available.
 * @param {WebGLRenderingContext} gl WebGL context
 * @param {string} source GLSL ES 1.00 source
 * @param {number} type gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @returns {string} Source to compile
 */
function prepareShaderSource(gl, source, type) {
  if (typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext))
    return `#define CENTROID\n${source}`;

  const header = ['#version 300 es', '#define WEBGL2', '#define CENTROID centroid', '#define texture2D texture'];
  if (type === gl.VERTEX_SHADER) {
    header.push('#define attribute in', '#define varying out');
  } else {
    header.push('#define varying in', 'out highp vec4 fragColorOut;', '#define gl_FragColor fragColorOut');
  }

  return `${header.join('\n')}\n${source}`;
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
  const program = gl.createProgram();
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

/**
 * Create a buffer holding one triangle larger than the screen, so drawing it
 * covers every pixel once
 * @param {WebGLRenderingContext} gl WebGL context
 * @returns {WebGLBuffer} Buffer of 2D clip space positions
 */
function createScreenTriangle(gl) {
  const triangle = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  return triangle;
}

/**
 * Disable every vertex attribute array, before a program with other
 * attributes than the blocks' sets up its own. The blocks set theirs up again
 * before each draw.
 * @param {WebGLRenderingContext} gl WebGL context
 */
function disableVertexAttribs(gl) {
  const count = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
  for (let i = 0; i < count; i++) gl.disableVertexAttribArray(i);
}

function setupVertexAttribs() {
  var vertexSize = 12; // 10
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
    glCache.vertSha, // Attribute location
    4, // Number of elements per attribute
    gl.FLOAT, // Type of elements
    gl.FALSE,
    totalSize, // Size of individual vertex
    5 * Float32Array.BYTES_PER_ELEMENT // Offset from beginning of a single vertex to this attribute
  );

  gl.vertexAttribPointer(
    glCache.vertShaCoord, // Attribute location
    2, // Number of elements per attribute
    gl.FLOAT, // Type of elements
    gl.FALSE,
    totalSize, // Size of individual vertex
    9 * Float32Array.BYTES_PER_ELEMENT // Offset from beginning of a single vertex to this attribute
  );

  // gl.vertexAttribPointer(
  //   glCache.vertCol, // Attribute location
  //   4, // Number of elements per attribute
  //   gl.FLOAT, // Type of elements
  //   gl.FALSE,
  //   totalSize, // Size of individual vertex
  //   5 * Float32Array.BYTES_PER_ELEMENT // Offset from beginning of a single vertex to this attribute
  // );

  gl.vertexAttribPointer(
    glCache.vertDoFog, // Attribute location
    1, // Number of elements per attribute
    gl.FLOAT, // Type of elements
    gl.FALSE,
    totalSize, // Size of individual vertex
    11 * Float32Array.BYTES_PER_ELEMENT // Offset from beginning of a single vertex to this attribute
  );
  
  gl.enableVertexAttribArray(glCache.vertPos);
  gl.enableVertexAttribArray(glCache.vertTex);
  gl.enableVertexAttribArray(glCache.vertSha);
  gl.enableVertexAttribArray(glCache.vertShaCoord);
  // gl.enableVertexAttribArray(glCache.vertCol);
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
    if (img.width !== TEXTURE_WIDTH || img.height !== TEXTURE_HEIGHT)
      console.warn(`Atlas is ${img.width}x${img.height} but atlas.js expects ${TEXTURE_WIDTH}x${TEXTURE_HEIGHT}`);

    gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    // Learn which tiles are see-through, which decides how blocks are drawn
    const pixels = readImagePixels(img);
    const tiles = getAtlasTiles(pixels, ATLAS_TILE_SIZE);
    useAtlasTileLayers(tiles.layers);
    uploadAtlasMipmaps(pixels, tiles);
  }

  // img.src = data.atlasLink + "?not-from-cache-please";
  img.src = data.atlasLink;
  textures = img;
  
  // gl.activeTexture(gl.TEXURE0);
  gl.bindTexture(gl.TEXTURE_2D, null); // unbind texture
}

/**
 * Read an image's RGBA pixels
 * @param {HTMLImageElement} img Loaded image
 * @returns {ImageData} Pixels
 */
function readImagePixels(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(img, 0, 0);
  return context.getImageData(0, 0, img.width, img.height);
}

/**
 * Upload the atlas's mip levels to the bound texture, so distant blocks are
 * drawn from smaller copies instead of shimmering. Needs WebGL 2.
 * @param {ImageData} pixels Atlas pixels
 * @param {Object} tiles Tiles from getAtlasTiles
 */
function uploadAtlasMipmaps(pixels, tiles) {
  if (typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext)) return;

  const levels = createAtlasMipmaps(pixels, tiles, ATLAS_TILE_SIZE);
  levels.forEach((level, i) => {
    gl.texImage2D(gl.TEXTURE_2D, i, gl.RGBA, level.width, level.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, level.data);
  });

  // Stop at one texel per tile, keep texels sharp within each level, and
  // blend between levels. Cutout edges this leaves partly clear are drawn
  // solid or not at all by the shader.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, levels.length - 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
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
  const eye = player.getEyePosition();
  mat4.translate(matrices.view, matrices.view, [-eye[0], -eye[1], -eye[2]]);
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

  /**
   * Send typed vertex and index data to the GPU without keeping a copy
   * @param {WebGLRenderingContext} gl WebGL context
   * @param {Float32Array} vertices Vertex data
   * @param {Uint32Array} indices Index data
   */
  upload(gl, vertices, indices) {
    this.setUsing(gl);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }

  /**
   * Free the buffer's GPU memory
   * @param {WebGLRenderingContext} gl WebGL context
   */
  destroy(gl) {
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.indexBuffer);
    this.vertexBuffer = null;
    this.indexBuffer = null;
  }

}

/*

























*/
