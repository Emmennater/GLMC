function setupData() {
  /** CHUNK **/
  Chunks = {};
  LENGTH = 16;
  WIDTH = 16;
  HEIGHT = 256;

  /** DATA **/
  TOPCANVAS = null;
  data = {};
  settings = {};
  data.renderDistance = 16;
  data.renderedChunks = 0;
  data.fogDist = 10;
  data.renderedChunks = [];
  data.chunksGenerated = 0;
  data.dt = 0;
  data.fps = 0;
  settings.fog = true;
  settings.hand = "right";
  settings.ssaa = 2; // supersampling, in samples per pixel along each axis: 1 is off, up to 4
  settings.msaa = 0; // multisampling, in samples per pixel: 0 is off, up to what the GPU allows
  data.mode = "normal";
  data.updateFps = 0;
  data.edits = new ChunkEdits();
  data.busy = false;
  data.keybusy = false;

  /** PLAYER DATA */
  player.x = 0;
  player.y = 255;
  player.z = 0;

  // olds:
  // https://i.ibb.co/KFMNywR/atlas2.png
  // https://i.ibb.co/k26xTvB/atlas.png
  // https://i.ibb.co/ryH5Qkk/atlas.png
  // https://i.ibb.co/VtYkW1b/atlas.png
  // data.atlasLink = "https://i.ibb.co/rcQKXkt/atlas.png";
  // data.atlasLink = "https://github.com/Emmennater/GLMC/blob/main/assets/atlas.png";
  data.atlasLink = "./assets/atlas.png";

  /** LOAD WORLD **/
  seedPhrase = null;

  loadWorldString();

  if (!seedPhrase) {
    seedPhrase = rnd(Math.random(), 10).toString().substring(2);
  }
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
    loadWorld(loadBox.value.replaceAll('\\', ''));
  }

  toggleInputVisibility();

  // data.font = new FontFace('myFont', 'url(assets/mcfont.otf)');
}

function toggleInputVisibility() {
  toggleInput(itemBox);
  toggleInput(saveButton);
  toggleInput(loadBox);
  toggleInput(loadButton);
}

function toggleInput(inp) {
  if (inp.style.visibility == "hidden") {
    inp.style.visibility = "visible";
  } else {
    inp.style.visibility = "hidden";
  }
}

function loadWorldString() {

  if (SAVE_TXT && SAVE_TXT.length > 5)
    loadWorld(SAVE_TXT);

}
