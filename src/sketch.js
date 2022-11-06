
/*******************************/
/*** AUTHOR: Emmett Jaakkola ***/
/*** DATE: 10/23/2022 **********/
/*******************************/


var initProgram = async function() {
  
  await sleep(100);
  
  /** CHUNK **/
  BlockQueue = {};
  Blocks = {};
  Chunks = {};
  LENGTH = 16;
  WIDTH = 16;
  HEIGHT = 256;

  /** DATA **/
  TOPCANVAS = null;
  data = {};
  settings = {};
  data.renderDistance = 8;
  data.renderedChunks = 0;
  data.fogDist = 10;
  data.waitTime = 0;
  data.renderedChunks = [];
  data.chunkDelay = 1;
  data.chunksGenerated = 0;
  data.dt = 0;
  data.fps = 0;
  settings.fog = true;
  settings.hand = "right";
  data.superflat = false;
  data.updateFps = 0;
  data.blockEdits = {};

  /** LAZY CHUNKS **/
  LazyChunk = null;
  TotalBlockGen = 0;
  MaxBlockGen = 5000;
  VertexWaitTime = 50;

  /** LOAD WORLD **/
  seedPhrase = null;
  
  if (!seedPhrase) {
    seedPhrase = rnd(Math.random(), 10).toString().substring(2);
  }

  seed = cyrb128(""+seedPhrase);
  rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
  noise.seed(seed[0]/4 + seed[1]/4 + seed[2]/4 + seed[3]/4);

  /** PLAYER **/
  player = new Player(8, 128+10, 8);
  player.flying = false;

  // Draw hotbar
  initWebgl2D();
  initWebgl();
  initGui();
  createTextures();
  initCanvasElements();

  canvasResize(canvas, gl);
  
  /** CREATE CUBES **/
  
  

  // Sky color
  sky = "#91b9fa";
  sky = [145, 185, 250];
  sky = {r:sky[0]/255, g:sky[1]/255, b:sky[2]/255};
  
  /** CREATE BUFFERS **/
  buffers = [];

  // let cubeBuffer = new Buffer();
  // cubeBuffer.setUsing(gl);
  // cubeBuffer.setVertices(gl, cubeVertices);
  // cubeBuffer.setIndices(gl, cubeIndices);
  // buffers.push(cubeBuffer);

  // Drawing buffer
  drawBuffer = new Buffer();
  buffers.push(drawBuffer);
  drawBuffer.culling = false;
  
  matrices = setupMatricies();

  // Render loop
  var angle = 0;
  // var lastUpdate = Date.now();
  let then = 0;
  var loop = function(now) {

    now *= 0.001;
    data.dt = now - then;
    then = now;
    data.blocksUpdated = 0;
    data.updates = 0;
    
    if (data.updateFps <= 0) {
      data.fps = floor(1 / data.dt);
      data.updateFps = 0.5;
    } else { data.updateFps -= data.dt; }

    drawBuffer.reset(gl);

    player.look();
    player.move();
    player.use();

    updateMatricies();
    
    // Gui
    drawGui();

    // Intro
    animateIntro();

    // Clear sky
    gl.clearColor(sky.r, sky.g, sky.b, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawBuffer.setAttributes(gl);
    renderFog(gl);
    
    // Generate more chunks
    generateRadius();

    gl.enable(gl.CULL_FACE);

    // Render all the chunks
    renderChunks();

    // Draw each buffer
    for (let i=0; i<buffers.length; i++) {
      if (buffers[i].indices.length == 0) continue;

      // Bind the buffers
      buffers[i].setUsing(gl);

      // Setup attributes
      setupVertexAttribs();

      // Back face culling
      buffers[i].setCulling(gl);

      // Draw the elements
      gl.drawElements(gl.TRIANGLES, buffers[i].indices.length, gl.UNSIGNED_INT, 0); // triangles, skip 0, 3 verticies
    }

    moveX = 0;
    moveY = 0;

    requestAnimationFrame(loop);
  }
  
  requestAnimationFrame(loop);
  
}

initProgram();

/*



























*/
