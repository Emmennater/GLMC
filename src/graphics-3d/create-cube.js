const TXMIN = 0.001, TXMAX = 0.999;
const CUBE_VERTICES = [ // X, Y, Z           U, V
  // Top
  -1.0, 1.0, -1.0, TXMIN, TXMIN,
  -1.0, 1.0, 1.0, TXMIN, TXMAX,
  1.0, 1.0, 1.0, TXMAX, TXMAX,
  1.0, 1.0, -1.0, TXMAX, TXMIN,

  // Left
  -1.0, 1.0, 1.0, TXMAX, TXMIN,
  -1.0, -1.0, 1.0, TXMAX, TXMAX,
  -1.0, -1.0, -1.0, TXMIN, TXMAX,
  -1.0, 1.0, -1.0, TXMIN, TXMIN,

  // Right
  1.0, 1.0, 1.0, TXMIN, TXMIN,
  1.0, -1.0, 1.0, TXMIN, TXMAX,
  1.0, -1.0, -1.0, TXMAX, TXMAX,
  1.0, 1.0, -1.0, TXMAX, TXMIN,

  // Front
  1.0, 1.0, 1.0, TXMAX, TXMIN,
  1.0, -1.0, 1.0, TXMAX, TXMAX,
  -1.0, -1.0, 1.0, TXMIN, TXMAX,
  -1.0, 1.0, 1.0, TXMIN, TXMIN,

  // Back
  1.0, 1.0, -1.0, TXMIN, TXMIN,
  1.0, -1.0, -1.0, TXMIN, TXMAX,
  -1.0, -1.0, -1.0, TXMAX, TXMAX,
  -1.0, 1.0, -1.0, TXMAX, TXMIN,

  // Bottom
  -1.0, -1.0, -1.0, TXMAX, TXMAX,
  -1.0, -1.0, 1.0, TXMAX, TXMIN,
  1.0, -1.0, 1.0, TXMIN, TXMIN,
  1.0, -1.0, -1.0, TXMIN, TXMAX,
];

const CUBE_INDICES = [
  // Top
  0, 1, 2,
  0, 2, 3,

  // Left
  5, 4, 6,
  6, 4, 7,

  // Right
  8, 9, 10,
  8, 10, 11,

  // Front
  13, 12, 14,
  15, 14, 12,

  // Back
  16, 17, 18,
  16, 18, 19,

  // Bottom
  21, 20, 22,
  22, 20, 23
];

function createBlock(x, y, z, type = "smooth_stone") {
  let info = {
    type: type,
    x: x,
    y: y,
    z: z
  };
  info.transparent = isTransparent(type);
  info.solid = isSolid(type);
  return info;
}

function getTextureArray(block) {

  // TOP, LEFT, RIGHT, FRONT, BACK, BOTTOM
  switch (block) {
    case "smooth_stone":
      return [288 / 16, 944 / 16];
    case "grass":
      return [0, 0, 12, 52, 12, 52, 12, 52, 12, 52, 2, 0];
    case "dirt":
      return [2, 0];
    case "stone":
      return [23, 77];
    case "bedrock":
      return [320 / 16, 816 / 16];
    case "crafting_table":
      return [2, 64, 1, 64, 1, 64, 0, 64, 0, 64, 22, 77];
    case "bricks":
      return [288/16, 928/16];
    case "cobblestone":
      return [32/16, 832/16];
    case "oak_planks":
      return [22, 77];
    case "log":
      return [8, 54, 7, 54, 7, 54, 7, 54, 7, 54, 8, 54];
    case "birch_log":
      return [23, 53, 22, 53, 22, 53, 22, 53, 22, 53, 23, 53];
    case "leaves":
      return [144 / 16, 1136 / 16];
    case "birch_leaves":
      return [3, 71];
    case "glass":
      return [2, 63];
    case "black_concrete":
      return [13, 26];
    case "white_concrete":
      return [16, 416/16];
    case "sponge":
      return [0, 1040 / 16];
    case "we_sponge":
      return [112 / 16, 1040 / 16];
    case "obsidian":
      return [112 / 16, 1024 / 16];
    case "coal_block":
      return [4, 928 / 16];
    case "diamond_block":
      return [5, 928 / 16];
    case "emerald_block":
      return [6, 928 / 16];
    case "gold_block":
      return [7, 928 / 16];
    case "iron_block":
      return [8, 928 / 16];
    case "lapis_block":
      return [9, 928 / 16];
    case "redstone_block":
      return [10, 928 / 16];
    case "nether_portal_frame":
      return [320 / 16, 1];
    case "test":
      return [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0];
    default:
      console.error(block + " is not a valid type");
      return [288 / 16, 944 / 16];
  }

}

function getTexture(block) {
  let arr = getTextureArray(block);
  if (arr.length == 2) {
    let txu = arr[0];
    let txv = arr[1];
    for (let i = 2; i < 12; i += 2) {
      arr[i] = txu;
      arr[i + 1] = txv;
    }
  }
  return arr;
}

function getColor(block) {
  let color = [1, 1, 1];

  switch (block) {
    case "birch_leaves":
      color = [0.8, 0.9, 0.8];
      break;
    case "leaves":
      // color = [0.7, 0.7, 0.7];
      // from: (67, 170, 22)
      // to: (66,88,36)
      color = [66 / 67, 88 / 170, 36 / 22];
      break;
    case "dirt":
    case "grass":
      // from: (85,   133,    72)
      // to:   (83,   107,    50)
      // color =  [83/85,107/133,50/72];

      // from: (70,108,59)
      // to: (51,39,23)
      color = [53 / 70, 90 / 108, 37 / 59];
      break;
    case "birch_log":
    case "log":
      // from: (57,46,28)
      // to: (87,72,50)
      color = [0.8, 0.8, 0.8];
  }

  return color;
}

function isTransparent(block) {
  switch (block) {
    case "glass":
      return true;
    case "leaves":
      return true;
    case "birch_leaves":
      return true;
    default:
      return false;
  }
}

function isSolid(block) {
  switch (block) {
    case "leaves":
      return false;
    case "birch_leaves":
      return false;
    default:
      return true;
  }
}

// Optimizing this code will be a major time saver
function buildBlock(chunk, block, overwrite = false) {
  if (!block) return;

  let vertices = chunk.buffer.vertices;
  let indices = chunk.buffer.indices;
  const TOTAL_SIDES = indices.length / 6;
  const TOTAL_VERTS = TOTAL_SIDES * 4;

  // Use previous calculations
  if (!overwrite && block.concealed == true) {
    // for (let i=0; i<block.data.vertices.length; i++)
    //   vertices.push(block.data.vertices[i]);
    // for (let i in block.data.indices)
    //   indices.push(block.data.indices[i] + TOTAL_VERTS);
    return;
  }

  data.blocksUpdated++;

  // Reset data
  // block.data = {};
  // block.data.vertices = [];
  // block.data.indices = [];

  let x = block.x;
  let y = block.y;
  let z = block.z;

  // if (transparentEx == this.transparent) return;

  const skipSides = removeFaces(block, x, y, z);
  let all = true;
  for (let i in skipSides)
    if (!skipSides[i]) {
      all = false;
      break;
    }
  if (all) {
    block.concealed = true;
    return;
  }

  block.concealed = false;
  const TEXTURE_WIDTH = 384; //256;
  const TEXTURE_HEIGHT = 1520; //944;
  const TXRW = TEXTURE_WIDTH / 16;
  const TXRH = TEXTURE_HEIGHT / 16;
  const L = 1,
    W = 1,
    H = 1;
  let totalVerts = 0;
  let txr = getTexture(block.type);
  let color = getColor(block.type);
  let COL = [1, 1, 1];
  // let COL = [
  //   noise.simplex3(x/20+10, z/20+50, y/20+90)/2+0.5,
  //   noise.simplex3(x/30+10, z/20+60, y/20+100)/2+0.5,
  //   noise.simplex3(x/40+10, z/20+70, y/20+110)/2+0.5
  // ];

  // Iterate over all 6 sides
  for (let side = 0; side < 6; side++) {
    if (skipSides[side]) continue;

    // Iterate over vertices
    for (let j = 0; j < 4; j++) {
      let vstart = 4 * 5 * side + j * 5; // skip 5 attributes

      // Calculate texture coordinates
      let vt = CUBE_VERTICES;
      let U = txr[2 * side + 0];
      let V = txr[2 * side + 1];
      let u = (vt[vstart + 3] + U) / TXRW;
      let v = (vt[vstart + 4] + V) / TXRH;

      // Calculate shade
      let shade = 0.5 - (side / 6) / 2 + 0.5;
      let X = vt[vstart + 0] / 2 * L + x;
      let Y = vt[vstart + 1] / 2 * W + y;
      let Z = vt[vstart + 2] / 2 * H + z;

      let shadow = calcShadow(block, x, y, z, side, j);

      // Update block vertices
      vertices.push(
        X,
        Y,
        Z,
        u,
        v,
        shade * shadow.r * color[0] * COL[0],
        shade * shadow.g * color[1] * COL[1],
        shade * shadow.b * color[2] * COL[2],
        1,
        1
      );
    }

    // Iterate over indices
    for (let j = side * 6; j < side * 6 + 6; j++) {
      let idx = CUBE_INDICES[j] - side * 4;

      // Update block indices
      // block.data.indices.push(totalVerts + idx);

      // Push indices
      indices.push(TOTAL_VERTS + totalVerts + idx);
      // cubeIndices.push(TOTAL_VERTS + CUBE_INDICES[j]);
    }

    totalVerts += 4; // next face is 4 vertices away
  }

  // Push vertices
  // for (let i=0; i<block.data.vertices.length; i++)
  //   vertices.push(block.data.vertices[i]);

}

async function buildChunk(chunk, overwrite = false) {

  let vertices = chunk.buffer.vertices;
  let indices = chunk.buffer.indices;
  const TOTAL_SIDES = indices.length / 6;
  const TOTAL_VERTS = TOTAL_SIDES * 4;
  const TEXTURE_WIDTH = 384; //256;
  const TEXTURE_HEIGHT = 1520; //944;
  const TXRW = TEXTURE_WIDTH / 16;
  const TXRH = TEXTURE_HEIGHT / 16;
  const L = 1, W = 1, H = 1;
  let COL = [1, 1, 1];

  for (let x = 0; x < LENGTH; x++) {
    if (overwrite) await sleep(VertexWaitTime);
    for (let z = 0; z < WIDTH; z++) {
      for (let y = 0; y < HEIGHT; y++) {
        let block = chunk.blocks[x][z][y];
        if (!block || (!overwrite && block.concealed == true)) continue;

        // Remove faces
        let skipSides = removeFacesFast(chunk, block, x, y, z);
        let totalFacesRemoved = 0;
        skipSides.forEach(e => totalFacesRemoved += e);
        if (totalFacesRemoved == 6) {
          block.concealed = true;
          continue;
        }
        block.concealed = false;

        let totalVerts = 0;
        let txr = getTexture(block.type);
        let color = getColor(block.type);

        // Iterate over all 6 sides
        for (let side = 0; side < 6; side++) {
          if (skipSides[side]) continue;
          let sideStart = 20 * side;

          // Calculate shade
          let shade = 0.5 - (side / 6) / 2 + 0.5;

          // Iterate over vertices
          for (let j = 0; j < 4; j++) {
            let vstart = sideStart + j * 5; // skip 5 attributes

            // Calculate texture coordinates
            let U = txr[2 * side + 0];
            let V = txr[2 * side + 1];
            let u = (CUBE_VERTICES[vstart + 3] + U) / TXRW;
            let v = (CUBE_VERTICES[vstart + 4] + V) / TXRH;

            // Calculate vertex position
            let X = CUBE_VERTICES[vstart + 0] / 2 * L + x;
            let Y = CUBE_VERTICES[vstart + 1] / 2 * W + y;
            let Z = CUBE_VERTICES[vstart + 2] / 2 * H + z;

            let shadow = calcShadow(block, x, y, z, side, j);

            // Update block vertices
            vertices.push(
              X,
              Y,
              Z,
              u,
              v,
              shade * shadow.r * color[0] * COL[0],
              shade * shadow.g * color[1] * COL[1],
              shade * shadow.b * color[2] * COL[2],
              1,
              1
            );
          }

          // Iterate over indices
          for (let j = side * 6; j < side * 6 + 6; j++) {
            let idx = CUBE_INDICES[j] - side * 4;

            // Push indices
            indices.push(TOTAL_VERTS + totalVerts + idx);
          }

          totalVerts += 4; // next face is 4 vertices away
        }
      }
    }
  }
}

function removeFaces(b, x, y, z) {
  let block;
  let skipSides = [false, false, false, false, false, false];

  // TOP
  block = getBlock(x, y + 1, z);
  skipSides[0] = (compareFaces(b, block));
  // LEFT
  block = getBlock(x - 1, y, z);
  skipSides[1] = (compareFaces(b, block))
  // RIGHT
  block = getBlock(x + 1, y, z);
  skipSides[2] = (compareFaces(b, block))
  // FRONT
  block = getBlock(x, y, z + 1);
  skipSides[3] = (compareFaces(b, block))
  // BACK
  block = getBlock(x, y, z - 1);
  skipSides[4] = (compareFaces(b, block))
  // BOTTOM
  block = getBlock(x, y - 1, z);
  skipSides[5] = (compareFaces(b, block))

  return skipSides;
}

function removeFacesFast(c, b, x, y, z) {
  let skipSides = [];

  
  // TOP
  skipSides[0] = compareFacesFastY(c, b, x, y, z, x, y + 1, z);
  // LEFT
  skipSides[1] = compareFacesFastX(c, b, x, y, z, x - 1, y, z);
  // RIGHT
  skipSides[2] = compareFacesFastX(c, b, x, y, z, x + 1, y, z);
  // FRONT
  skipSides[3] = compareFacesFastZ(c, b, x, y, z, x, y, z + 1);
  // BACK
  skipSides[4] = compareFacesFastZ(c, b, x, y, z, x, y, z - 1);
  // BOTTOM
  skipSides[5] = compareFacesFastY(c, b, x, y, z, x, y - 1, z);
  
  return skipSides;
}

function compareFaces(b1, b2) {
  if (!b2) return false;
  if (!b1.solid && !b2.solid) return false;
  if (!(b1.transparent ^ b2.transparent)) return true;
  // if (!b1.transparent && !b2.transparent) return true;
  return false;
}

function compareFacesFastX(c, b1, x1, y1, z1, x2, y2, z2) {
  let cx = c.x;
  let cz = c.z;

  // if x2 < 0 x2 = -LENGTH
  let cx2 = Math.floor(x2 / LENGTH);
  let bx2 = x2 - cx2 * LENGTH;
  let b2 = Chunks[cx2][cz].blocks[bx2][b1.Z][y2];
  return compareFaces(b1, b2);
}

function compareFacesFastY(c, b1, x1, y1, z1, x2, y2, z2) {
  if (y2 < 0 || y2 >= HEIGHT) return false;
  let b2 = Chunks[c.x][c.z].blocks[b1.X][b1.Z][y2];
  return compareFaces(b1, b2);
}

function compareFacesFastZ(c, b1, x1, y1, z1, x2, y2, z2) {
  let cx = c.x;
  let cz = c.z;

  // if x2 < 0 x2 = -LENGTH
  let cz2 = Math.floor(z2 / WIDTH);
  let bz2 = z2 - cz2 * WIDTH;
  let b2 = Chunks[cx][cz2].blocks[b1.X][bz2][y2];
  return compareFaces(b1, b2);
}

function calcShadow(block, x, y, z, side, vt) {
  let shadow = 1;
  let color = {
    r: 1,
    g: 1,
    b: 1
  };
  let count = 0;
  // let amt = 0.75;
  // let diff = 0.4;

  // if (!block.transparent)
  switch (side) {
    // TOP  RED
    case 0:
      // color.g -= diff;
      // color.b -= diff;

      switch (vt) {
        case 0: // - + (0, -) and 0 + -
          count += checkOffset(block, x, y, z, -1, 1, 0);
          count += checkOffset(block, x, y, z, -1, 1, -1);
          count += checkOffset(block, x, y, z, 0, 1, -1);
          break;
        case 1: // - + (0, +) and 0 + +
          count += checkOffset(block, x, y, z, -1, 1, 0);
          count += checkOffset(block, x, y, z, -1, 1, 1);
          count += checkOffset(block, x, y, z, 0, 1, 1);
          break;
        case 2: // + + (0, +) and 0 + +
          count += checkOffset(block, x, y, z, 1, 1, 0);
          count += checkOffset(block, x, y, z, 1, 1, 1);
          count += checkOffset(block, x, y, z, 0, 1, 1);
          break;
        case 3: // + + (0, -) and 0 + -
          count += checkOffset(block, x, y, z, 1, 1, 0);
          count += checkOffset(block, x, y, z, 1, 1, -1);
          count += checkOffset(block, x, y, z, 0, 1, -1);
          break;
      }

      break;
      // LEFT  ORANGE - [- +]
    case 1:
      // color.g -= diff / 2;
      // color.b -= diff;

      switch (vt) {
        case 0: // - + (0, +) and - 0 +
          count += checkOffset(block, x, y, z, -1, 1, 0);
          count += checkOffset(block, x, y, z, -1, 1, 1);
          count += checkOffset(block, x, y, z, -1, 0, 1);
          break;
        case 2: // - - (0, -) and - 0 -
          count += checkOffset(block, x, y, z, -1, -1, 0);
          count += checkOffset(block, x, y, z, -1, -1, -1);
          count += checkOffset(block, x, y, z, -1, 0, -1);
          break;
        case 1: // - - (0, +) and - 0 +
          count += checkOffset(block, x, y, z, -1, -1, 0);
          count += checkOffset(block, x, y, z, -1, -1, 1);
          count += checkOffset(block, x, y, z, -1, 0, 1);
          break;
        case 3: // - + (0, -) and - 0 -
          count += checkOffset(block, x, y, z, -1, 1, 0);
          count += checkOffset(block, x, y, z, -1, 1, -1);
          count += checkOffset(block, x, y, z, -1, 0, -1);
          break;
      }
      break;
      // RIGHT  YELLOW
    case 2:
      // color.b -= diff;

      switch (vt) {
        case 0: // + + (0, +) and + 0 +
          count += checkOffset(block, x, y, z, 1, 1, 0);
          count += checkOffset(block, x, y, z, 1, 1, 1);
          count += checkOffset(block, x, y, z, 1, 0, 1);
          break;
        case 1: // + - (0, +) and + 0 +
          count += checkOffset(block, x, y, z, 1, -1, 0);
          count += checkOffset(block, x, y, z, 1, -1, 1);
          count += checkOffset(block, x, y, z, 1, 0, 1);
          break;
        case 2: // + - (0, -) and + 0 -
          count += checkOffset(block, x, y, z, 1, -1, 0);
          count += checkOffset(block, x, y, z, 1, -1, -1);
          count += checkOffset(block, x, y, z, 1, 0, -1);
          break;
        case 3: // + + (0, -) and + 0 -
          count += checkOffset(block, x, y, z, 1, 1, 0);
          count += checkOffset(block, x, y, z, 1, 1, -1);
          count += checkOffset(block, x, y, z, 1, 0, -1);
          break;
      }

      break;
      // FRONT  GREEN [- +] +
    case 3:
      // color.r -= diff;
      // color.b -= diff;

      switch (vt) {
        case 0: // (0, +) + + and + 0 +
          count += checkOffset(block, x, y, z, 0, 1, 1);
          count += checkOffset(block, x, y, z, 1, 1, 1);
          count += checkOffset(block, x, y, z, 1, 0, 1);
          break;
        case 1: // (0, +) - + and + 0 +
          count += checkOffset(block, x, y, z, 0, -1, 1);
          count += checkOffset(block, x, y, z, 1, -1, 1);
          count += checkOffset(block, x, y, z, 1, 0, 1);
          break;
        case 2: // (0, -) - + and - 0 +
          count += checkOffset(block, x, y, z, 0, -1, 1);
          count += checkOffset(block, x, y, z, -1, -1, 1);
          count += checkOffset(block, x, y, z, -1, 0, 1);
          break;
        case 3: // (0, -) + + and - 0 +
          count += checkOffset(block, x, y, z, 0, 1, 1);
          count += checkOffset(block, x, y, z, -1, 1, 1);
          count += checkOffset(block, x, y, z, -1, 0, 1);
          break;
      }

      break;
      // BACK  BLUE
    case 4:
      // color.r -= diff;
      // color.g -= diff;

      switch (vt) {
        case 0: // (0, +) + - and + 0 -
          count += checkOffset(block, x, y, z, 0, 1, -1);
          count += checkOffset(block, x, y, z, 1, 1, -1);
          count += checkOffset(block, x, y, z, 1, 0, -1);
          break;
        case 1: // (0, +) - - and + 0 -
          count += checkOffset(block, x, y, z, 0, -1, -1);
          count += checkOffset(block, x, y, z, 1, -1, -1);
          count += checkOffset(block, x, y, z, 1, 0, -1);
          break;
        case 2: // (0, -) - - and - 0 -
          count += checkOffset(block, x, y, z, 0, -1, -1);
          count += checkOffset(block, x, y, z, -1, -1, -1);
          count += checkOffset(block, x, y, z, -1, 0, -1);
          break;
        case 3: // (0, -) + - and - 0 -
          count += checkOffset(block, x, y, z, 0, 1, -1);
          count += checkOffset(block, x, y, z, -1, 1, -1);
          count += checkOffset(block, x, y, z, -1, 0, -1);
          break;
      }

      break;
      // BOTTOM  PURPLE
    case 5:
      // color.g -= diff;

      switch (vt) {
        case 0: // - - (0, -) and 0 - -
          count += checkOffset(block, x, y, z, -1, -1, 0);
          count += checkOffset(block, x, y, z, -1, -1, -1);
          count += checkOffset(block, x, y, z, 0, -1, -1);
          break;
        case 1: // - - (0, +) and 0 - +
          count += checkOffset(block, x, y, z, -1, -1, 0);
          count += checkOffset(block, x, y, z, -1, -1, 1);
          count += checkOffset(block, x, y, z, 0, -1, 1);
          break;
        case 2: // + - (0, +) and 0 - +
          count += checkOffset(block, x, y, z, 1, -1, 0);
          count += checkOffset(block, x, y, z, 1, -1, 1);
          count += checkOffset(block, x, y, z, 0, -1, 1);
          break;
        case 3: // + - (0, -) and 0 - -
          count += checkOffset(block, x, y, z, 1, -1, 0);
          count += checkOffset(block, x, y, z, 1, -1, -1);
          count += checkOffset(block, x, y, z, 0, -1, -1);
          break;
      }

      break;
  }

  // if (vt == 0) shadow -= amt/4*4;
  // if (vt == 1) shadow -= amt/4*2;
  // if (vt == 2) shadow -= amt/4*3;
  // if (vt == 3) shadow -= amt/4*1;

  shadow -= count / 5;

  shadow = constrain(shadow, 0, 1);

  return {
    r: color.r * shadow,
    g: color.g * shadow,
    b: color.b * shadow
  };
}

function checkOffset(b1, x, y, z, xo, yo, zo) {
  let block = getBlock(x + xo, y + yo, z + zo);
  if (block == null) return 0;
  return !block.transparent || (!block.solid && block.transparent);
  // return 1;
}

class VertexCalcuator {
  constructor(chunk) {
    this.chunk = chunk;
    this.buffer = this.chunk.buffer;
  }

  calculateBlock(block, overwrite = false) {
    if (!block) return;
    // if (overwrite && this.chunk.complete) console.log(block.type);
    // block.calculated = true;

    // Use previous calculations
    if (!overwrite) {
      if (block.bits == 0) return;
    }

    data.blocksUpdated++;

    let x = block.x;
    let y = block.y;
    let z = block.z;

    let skipSides = [];
    if (overwrite) {
      // block.sides = 0;
      block.bits = 0;
      skipSides = removeFaces(block, x, y, z);
      for (let i=0; i<skipSides.length; i++) {
        block.bits += (2 ** i) * (1 - skipSides[i]);
      }
      if (block.bits == 0) return;
    }

    let vertices = this.buffer.vertices;
    let indices = this.buffer.indices;

    // block.vtIdx = vertices.length; // this.vertexOffset;
    // block.idIdx = indices.length; // this.indexOffset;

    const TOTAL_SIDES = indices.length / 6;
    const TOTAL_VERTS = TOTAL_SIDES * 4;
    const TEXTURE_WIDTH = 384; //256;
    const TEXTURE_HEIGHT = 1520; //944;
    const TXRW = TEXTURE_WIDTH / 16;
    const TXRH = TEXTURE_HEIGHT / 16;
    const L = 1, W = 1, H = 1;
    let totalVerts = 0;
    let txr = getTexture(block.type);
    let color = getColor(block.type);
    let COL = [1, 1, 1];
    let voff = 0;

    // Iterate over all 6 sides
    for (let side = 0; side < 6; side++) {
      // if (skipSides[side]) continue;
      if (block.bits && !(block.bits & 2 ** side)) continue;
      // if (overwrite) block.sides++;

      // Iterate over vertices
      for (let j = 0; j < 4; j++) {
        
        let vstart = 4 * 5 * side + j * 5; // skip 5 attributes

        // Calculate texture coordinates
        let vt = CUBE_VERTICES;
        let U = txr[2 * side + 0];
        let V = txr[2 * side + 1];
        let u = (vt[vstart + 3] + U) / TXRW;
        let v = (vt[vstart + 4] + V) / TXRH;

        // Calculate shade
        let shade = 0.5 - (side / 6) / 2 + 0.5;
        let X = vt[vstart + 0] / 2 * L + x;
        let Y = vt[vstart + 1] / 2 * W + y;
        let Z = vt[vstart + 2] / 2 * H + z;

        let shadow = calcShadow(block, x, y, z, side, j);

        // Append vertices
        vertices.push(
          X, Y, Z, u, v,
          shade * shadow.r * color[0] * COL[0],
          shade * shadow.g * color[1] * COL[1],
          shade * shadow.b * color[2] * COL[2],
          1, 1
        );
      }

      // Append indices
      for (let j = side * 6; j < side * 6 + 6; j++) {
        let idx = CUBE_INDICES[j] - side * 4;
        indices.push(TOTAL_VERTS + totalVerts + idx);
      }
      totalVerts += 4; // next face is 4 vertices away
    }

    // Clear data to save memory
    // if (block.vdata) {
    //   block.vdata.length = 0;
    //   delete block.vdata;
    // }
  }

}

/*























*/