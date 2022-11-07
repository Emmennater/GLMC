function setupData() {
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
  data.busy = false;
  data.keybusy = false;

  // olds:
  // https://i.ibb.co/KFMNywR/atlas2.png
  // https://i.ibb.co/k26xTvB/atlas.png
  // https://i.ibb.co/ryH5Qkk/atlas.png
  // https://i.ibb.co/VtYkW1b/atlas.png
  data.atlasLink = "https://i.ibb.co/rcQKXkt/atlas.png";

  /** LAZY CHUNKS **/
  LazyChunk = null;
  TotalBlockGen = 0;
  MaxBlockGen = 5000;
  VertexWaitTime = 50;

  /** LOAD WORLD **/
  seedPhrase = null;

  loadWorldString();

  if (!seedPhrase) {
    seedPhrase = rnd(Math.random(), 10).toString().substring(2);
  }

  seed = cyrb128("" + seedPhrase);
  rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
  noise.seed(seed[0] / 4 + seed[1] / 4 + seed[2] / 4 + seed[3] / 4);
}

function setupElements() {
  // Item box
  itemBox = document.getElementById("itembox");

  itemBox.oninput = function () {
    // Busy
    data.keybusy = true;

    // Reset B
    if (keys.B) {
      player.toggleGamemode();
    }

    // Check for new valid item
    let item = itemBox.value;

    let result = getTextureArray(item);
    if (result == null) return;

    // Set player item holding
    player.setItemInHotbar(player.hotslot, item);
    player.setHolding(item);
  }

  saveButton = document.getElementById("saveworld");
  saveButton.onclick = function () {
    saveWorld(false);
  }

  loadBox = document.getElementById("loadbox");

  loadButton = document.getElementById("loadworld");
  loadButton.onclick = function () {
    BlockQueue = [];
    loadWorld(loadBox.value.replaceAll('\\', ''));
  }

  // data.font = new FontFace('myFont', 'url(assets/mcfont.otf)');
}

function loadWorldString() {

  if (SAVE_TXT && SAVE_TXT.length > 5)
    loadWorld(SAVE_TXT);

}