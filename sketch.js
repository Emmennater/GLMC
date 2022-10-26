
/*******************************/
/*** AUTHOR: Emmett Jaakkola ***/
/*** DATE: 10/23/2022 *********/
/*******************************/


var initProgram = async function() {
  
  await sleep(100);
  
  /** DATA **/
  data = {};
  settings = {};
  data.renderDistance = 8;
  data.renderedChunks = 0;
  data.fogDist = 10;
  data.waitTime = 0;
  data.renderedChunks = [];
  data.chunkDelay = 4;
  data.chunksGenerated = 0;
  data.dt = 0;
  settings.fog = true;
  data.superflat = false;
  seedPhrase = rnd(Math.random(), 10).toString().substring(2);
  seed = cyrb128(""+seedPhrase);
  rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
  noise.seed(seed[0]/4 + seed[1]/4 + seed[2]/4 + seed[3]/4);

  /** CHUNK **/
  BlockQueue = {};
  Blocks = {};
  Chunks = {};
  LENGTH = 16;
  WIDTH = 16;
  HEIGHT = 128;

  /** PLAYER **/
  
  player = new Player(8, 128+10, 8);
  player.flying = false;

  initWebgl();
  initGui();
  createTextures();
  initCanvasElements();

  canvasResize(canvas, gl);
  
  /** CREATE CUBES **/
  
  // pushQueue("smooth_stone", 8, 5, 8-3);

  // Generate chunks
  // let r = data.renderDistance / 2;
  // for (let x=-r; x<=r; x++) {
  //   for (let z=-r; z<=r; z++) {
  //     generateChunk(x, z);
  //   }
  // }

  // cubeVertices = [];
  // cubeIndices = [];
  // cubes = {};
  // count = 0;
  
  // for (let y=0; y<1; y++)
  //   for (let x=-50; x<50; x++)
  //     for (let z=-50; z<50; z++) {
  //       let cube = new Cube(x, y, z, 1, 1, 1, "grass");
  //       cubes[x+","+y+","+z] = cube;
  //     }

  // createCube(0, 0, 0);
  // editBlock(0, 2, -6, "white_concrete");
  // editBlock(1, 2, -6, "white_concrete");
  // editBlock(-1, 2, -6, "white_concrete");
  // editBlock(1, 3, -6, "white_concrete");
  // editBlock(-1, 3, -6, "white_concrete");
  // editBlock(-4, 3, -6, "white_concrete", true);
  // editBlock(3, 4, -6, "white_concrete", true);
  
  // Build non transparent
  // for (let i in cubes) {
  //   cubes[i].build(true, true);
  // }

  // Build transparent
  // for (let i in cubes) {
  //   cubes[i].build(true, false);
  // }

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

  // Draw hotbar
  initWebgl2D();

  // Render loop
  var angle = 0;
  var lastUpdate = Date.now();
  var loop = function() {

    var now = Date.now();
    data.dt = now - lastUpdate;
    lastUpdate = now;
    data.blocksUpdated = 0;
    data.updates = 0;

    // angle = performance.now() / 1000 / 6 * 2 * PI;
    drawBuffer.reset(gl);

    player.look();
    player.move();
    player.use();
    
    // drawRect(player.x, player.y+0.8, player.z, 100, 100, 100, 1, 0, 0, 0.5);
    // drawBuffer.culling = false;

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
