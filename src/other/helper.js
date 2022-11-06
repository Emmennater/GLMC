
mouse = {x:0, y:0, movedX:0, movedY:0, focused:false};

function canvasResize(canvas, gl, w = window.innerWidth, h = window.innerHeight) {
  // Resize canvas
  canvas.width = w;
  canvas.height = h;
  gl.viewport(0, 0, w, h);
}

function toConstFormat(string) {
  let newString = string.replaceAll(/[a-z][A-Z]/g, function(e){
    return e[0] + "_" + e[1];
  }).toUpperCase();
  return newString;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

window.addEventListener("mousemove", e => {
  try { if (TOPCANVAS == undefined) return; } catch (E) { return; }
  pmouse = {x: 0, y: 0};
  if (mouse) pmouse = {x: mouse.x, y: mouse.y};
  mouse = getMousePos(TOPCANVAS, e);
  mouse.px = pmouse.x;
  mouse.py = pmouse.y;
  mouse.movedX = (mouse.x - mouse.px);
  mouse.movedY = (mouse.y - mouse.py);
});

function setpixelated(context){
  context['imageSmoothingEnabled'] = false;       /* standard */
  context['mozImageSmoothingEnabled'] = false;    /* Firefox */
  context['oImageSmoothingEnabled'] = false;      /* Opera */
  context['webkitImageSmoothingEnabled'] = false; /* Safari */
  context['msImageSmoothingEnabled'] = false;     /* IE */
}

var imgNum = 0;

class DirImage {
  constructor(path, load) {
      this.img = new Image();
      this.img.alt = "dir-image-"+(imgNum++);
      this.img.src = path;
      this.loaded = false;
      load = load || ((e)=>this.loaded = true);
      this.img.addEventListener("load", load);
      this.width = this.img.width;
      this.height = this.img.height;
      
  }

  getHeightWith(width) {
      return this.img.height * width / this.img.width;
  }

  draw(x, y, w = this.width, h = this.height) {
      if (!this.loaded) return;
      this.width = w;
      this.height = h;
      let offx = this.width / 2;
      let offy = this.height / 2;
      gui.drawImage(this.img, x-offx, y-offy, w, h);
  }
}

function getTextWidth(text, font) {
  // re-use canvas object for better performance
  const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}

function createTxrQuad(px, py, scl, tx1, ty1, tx2, ty2) {
  let TW = 256, TH = 256;
  let x1 = tx1, y1 = ty1;
  let x2 = tx2, y2 = ty2;
  
  // Normalize values
  x1 /= TW; y1 /= TH;
  x2 /= TW; y2 /= TH;
  
  let vertices = [
    // X, Y     tx, ty   R, G, B
    0,  0,    x1,  y2,
    1,  0,    x2,  y2,
    1,  1,    x2,  y1,
    0,  1,    x1,  y1
  ];
  let indices = [0, 1, 2, 2, 3, 0];

  // Set dimensions
  let Width = window.innerWidth;
  let Height = window.innerHeight;
  
  let W = 1;
  let H = W * (y2/x2) * (Width / Height);
  for (let i=0; i<vertices.length; i+=4) {
      let x = vertices[i+0];
      let y = vertices[i+1];
      x *= W * scl;
      y *= H * scl;
      x += px - W*scl/2; // center x
      y += py;

      // Set to range -1 -> +1
      vertices[i+0] = x * 2 - 1;
      vertices[i+1] = y * 2 - 1;
  }

  return {
    vertices: vertices,
    indices: indices
  };
}

function createQuad(buffer, x1, y1, x2, y2, x3, y3, x4, y4) {
  let c = buffer.vertexCount;
  let vertices = [
    x1,  y1,    tx1,  ty2,
    x2,  y2,    tx2,  ty2,
    x3,  y3,    tx2,  ty1,
    x4,  y4,    tx1,  ty1,
  ];
  let indices = [
      c+0, c+1, c+2,
      c+2, c+3, c+0
  ];

  // W: 0 -> 1
  // H: relative to W
  let W = window.innerWidth;
  let H = window.innerHeight;
  for (let i=0; i<vertices.length; i+=4) {
    let Y = vertices[i+1];
    vertices[i+1] = Y * (H / W);
  }

  buffer.vertices = buffer.vertices.concat(vertices);
  buffer.indices = buffer.indices.concat(indices);
  buffer.vertexCount += 4;
}

/*
  let W = txr.width;
  let H = txr.height;
  quad = new TextureQuad(txr);
  buffer.add(quad);
*/

function roughSizeOfObject( object ) {

  var objectList = [];
  var stack = [ object ];
  var bytes = 0;

  while ( stack.length ) {
      var value = stack.pop();

      if ( typeof value === 'boolean' ) {
          bytes += 4;
      }
      else if ( typeof value === 'string' ) {
          bytes += value.length * 2;
      }
      else if ( typeof value === 'number' ) {
          bytes += 8;
      }
      else if
      (
          typeof value === 'object'
          && objectList.indexOf( value ) === -1
      )
      {
          objectList.push( value );

          for( var i in value ) {
              stack.push( value[ i ] );
          }
      }
  }
  return bytes;
}

function saveWorld(logit = true) {
  
  var arr = Object.keys(data.blockEdits).map((key) => [data.blockEdits[key]]);
  let output = JSON.stringify({
    version: "1.0",
    seed: seedPhrase,
    superflat: data.superflat,
    blocks: arr.flat(2)
  });
  if (logit)
    console.log(output.replaceAll("\"", "\\\""));
  else
    download("NewWorld.glmc", output.replaceAll("\"", "\\\""))
}

function loadWorld(string) {

  clearWorld();

  let input = JSON.parse(string);
  seedPhrase = input.seed;
  data.superflat = input.superflat;
  let blocks = input.blocks;
  for (let i=0; i<blocks.length; i+= 4) {
    pushQueue(blocks[i], blocks[i+1],blocks[i+2], blocks[i+3]);
    saveChange(blocks[i], blocks[i+1],blocks[i+2], blocks[i+3]);
  }

  // Update seeds
  seed = cyrb128(""+seedPhrase);
  rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
  noise.seed(seed[0]/4 + seed[1]/4 + seed[2]/4 + seed[3]/4);
}

function download(filename, text) {
  var pom = document.createElement('a');
  pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  pom.setAttribute('download', filename);

  if (document.createEvent) {
      var event = document.createEvent('MouseEvents');
      event.initEvent('click', true, true);
      pom.dispatchEvent(event);
  }
  else {
      pom.click();
  }
}

function clearWorld() {
  LazyChunk = null;
  Chunks = {};
  BlockQueue = {};
  Blocks = {};
  // data.blockEdits = {};
  data.renderedChunks = [];
}

/*



























*/
