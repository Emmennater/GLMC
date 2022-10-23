const TXMIN = 0.001, TXMAX = 0.999;
const CUBE_VERTICES = 
[ // X, Y, Z           U, V
    // Top
    -1.0, 1.0, -1.0,   TXMIN, TXMIN,
    -1.0, 1.0, 1.0,    TXMIN, TXMAX,
    1.0, 1.0, 1.0,     TXMAX, TXMAX,
    1.0, 1.0, -1.0,    TXMAX, TXMIN,

    // Left
    -1.0, 1.0, 1.0,   TXMAX, TXMIN,
    -1.0, -1.0, 1.0,  TXMAX, TXMAX,
    -1.0, -1.0, -1.0, TXMIN, TXMAX,
    -1.0, 1.0, -1.0,  TXMIN, TXMIN,

    // Right
    1.0, 1.0, 1.0,    TXMIN, TXMIN,
    1.0, -1.0, 1.0,   TXMIN, TXMAX,
    1.0, -1.0, -1.0,  TXMAX, TXMAX,
    1.0, 1.0, -1.0,   TXMAX, TXMIN,

    // Front
    1.0, 1.0, 1.0,    TXMAX, TXMIN,
    1.0, -1.0, 1.0,   TXMAX, TXMAX,
    -1.0, -1.0, 1.0,  TXMIN, TXMAX,
    -1.0, 1.0, 1.0,   TXMIN, TXMIN,

    // Back
    1.0, 1.0, -1.0,   TXMIN, TXMIN,
    1.0, -1.0, -1.0,  TXMIN, TXMAX,
    -1.0, -1.0, -1.0, TXMAX, TXMAX,
    -1.0, 1.0, -1.0,  TXMAX, TXMIN,

    // Bottom
    -1.0, -1.0, -1.0,   TXMAX, TXMAX,
    -1.0, -1.0, 1.0,    TXMAX, TXMIN,
    1.0, -1.0, 1.0,     TXMIN, TXMIN,
    1.0, -1.0, -1.0,    TXMIN, TXMAX,
];

const CUBE_INDICES =
[
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

class Cube {
  constructor(x, y, z, l, h, w, type = "smooth_stone") {
    this.type = type;
    this.x = x;
    this.y = y;
    this.z = z;
    this.l = l;
    this.h = h;
    this.w = w;
    this.txr = getTexture(type);
    this.transparent = isTransparent(type);
    this.solid = true;
    this.buffer = null;
  }
  
  build(remove = true, transparentEx = null) {
    if (transparentEx == this.transparent) return;

    if (this.buffer) {
        this.vertices = buffer.vertices;
        this.indices = buffer.indices;
    } else {
      this.vertices = cubeVertices;
      this.indices = cubeIndices;
    }

    const skipSides = remove ? this.removeFaces() : [];
    const TEXTURE_WIDTH = 384; //256;
    const TEXTURE_HEIGHT = 1520; //944;
    const TXRW = TEXTURE_WIDTH / 16;
    const TXRH = TEXTURE_HEIGHT / 16;
    const TOTAL_SIDES = this.indices.length / 6;
    const TOTAL_VERTS = TOTAL_SIDES * 4;
    let totalVerts = 0;

    // Iterate over all 6 sides
    for (let side=0; side<6; side++) {
      if (skipSides[side]) continue;

      // Iterate over vertices
      for (let j=0; j<4; j++) {
        let vstart = 4*5*side + j * 5; // skip 5 attributes

        // Calculate texture coordinates
        let vt = CUBE_VERTICES;
        let U = this.txr[2*side+0];
        let V = this.txr[2*side+1];
        let u = (vt[vstart+3] + U) / TXRW;
        let v = (vt[vstart+4] + V) / TXRH;

        // Calculate shade
        let shade = 0.5 - (side / 6) / 2 + 0.5;
        let X = vt[vstart+0] / 2 * this.l + this.x;
        let Y = vt[vstart+1] / 2 * this.h + this.y;
        let Z = vt[vstart+2] / 2 * this.w + this.z;

        // Push vertices
        this.vertices.push(
          X,
          Y,
          Z,
          u,
          v,
          shade,
          shade,
          shade,
          1
        );
      }

      // Iterate over indices
      for (let j=side*6; j<side*6+6; j++) {
        let idx = CUBE_INDICES[j] - side * 4;
        this.indices.push(TOTAL_VERTS + totalVerts + idx);
        // cubeIndices.push(TOTAL_VERTS + CUBE_INDICES[j]);
      }

      totalVerts += 4; // next face is 4 vertices away
    }
  }

  removeFaces() {
    let block;
    let skipSides = [false, false, false, false, false, false];

    // TOP
    block = getBlock(this.x, this.y+1, this.z);
    if (this.compareFaces(block)) skipSides[0] = true;
    // LEFT
    block = getBlock(this.x-1, this.y, this.z);
    if (this.compareFaces(block)) skipSides[1] = true;
    // RIGHT
    block = getBlock(this.x+1, this.y, this.z);
    if (this.compareFaces(block)) skipSides[2] = true;
    // FRONT
    block = getBlock(this.x, this.y, this.z+1);
    if (this.compareFaces(block)) skipSides[3] = true;
    // BACK
    block = getBlock(this.x, this.y, this.z-1);
    if (this.compareFaces(block)) skipSides[4] = true;
    // BOTTOM
    block = getBlock(this.x, this.y-1, this.z);
    if (this.compareFaces(block)) skipSides[5] = true;

    return skipSides;
  }

  compareFaces(block) {
    if (!block) return false;
    if (this.transparent && block.transparent) return true;
    if (!this.transparent && !block.transparent) return true;
    return false;
  }

}

function createCube(x, y, z, type = "smooth_stone") {
  let cube = new Cube(x, y, z, 1, 1, 1, type);
  cubes[x+","+y+","+z] = cube;
}

function createBlock(x, y, z, type = "smooth_stone") {
  let info = {type:type, x:x, y:y, z:z, transparent:false};
  info.transparent = isTransparent(type);
  return info;
}

// function getCube(x, y, z) {
//   return cubes[x+","+y+","+z];
// }

function getTextureArray(block) {

  // TOP, LEFT, RIGHT, FRONT, BACK, BOTTOM
  switch (block) {
    case "smooth_stone":
      return [288/16, 944/16];
    case "grass":
      return [0, 0, 12, 52, 12, 52, 12, 52, 12, 52, 2, 0];
    case "dirt":
      return [2, 0];
    case "stone":
      return [23, 77];
    case "oak_planks":
      return [22, 77];
    case "log":
      return [8, 54, 7, 54, 7, 54, 7, 54, 7, 54, 8, 54];
    case "birch_log":
      return [23, 53, 22, 53, 22, 53, 22, 53, 22, 53, 23, 53];
    case "leaves":
      return [1, 71];
    case "birch_leaves":
      return [3, 71];
    case "glass":
      return [2, 63];
    case "black_concrete":
      return [13, 26];
    case "white_concrete":
      return [12, 26];
    case "test":
      return [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0];
    default:
      console.error(block+" is not a valid type");
      return [288/16, 944/16];
  }

}

function getTexture(block) {
  let arr = getTextureArray(block);
  if (arr.length == 2) {
    let txu = arr[0];
    let txv = arr[1];
    for (let i=2; i<12; i+=2) {
      arr[i] = txu;
      arr[i+1] = txv;
    }
  }
  return arr;
}

function isTransparent(block) {
  switch (block) {
    case "glass": return true;
    case "leaves": return true;
    case "birch_leaves": return true;
    default: return false; 
  }
}

function buildBlock(buffer, block) {
  if (!block) return;

  let x = block.x;
  let y = block.y;
  let z = block.z;

  // if (transparentEx == this.transparent) return;
  let vertices = buffer.vertices;
  let indices = buffer.indices;

  const skipSides = removeFaces(x, y, z);
  const TEXTURE_WIDTH = 384; //256;
  const TEXTURE_HEIGHT = 1520; //944;
  const TXRW = TEXTURE_WIDTH / 16;
  const TXRH = TEXTURE_HEIGHT / 16;
  const TOTAL_SIDES = indices.length / 6;
  const TOTAL_VERTS = TOTAL_SIDES * 4;
  const L = 1, W = 1, H = 1;
  let totalVerts = 0;
  let txr = getTexture(block.type);

  // Iterate over all 6 sides
  for (let side=0; side<6; side++) {
    if (skipSides[side]) continue;

    // Iterate over vertices
    for (let j=0; j<4; j++) {
      let vstart = 4*5*side + j * 5; // skip 5 attributes

      // Calculate texture coordinates
      let vt = CUBE_VERTICES;
      let U = txr[2*side+0];
      let V = txr[2*side+1];
      let u = (vt[vstart+3] + U) / TXRW;
      let v = (vt[vstart+4] + V) / TXRH;

      // Calculate shade
      let shade = 0.5 - (side / 6) / 2 + 0.5;
      let X = vt[vstart+0] / 2 * L + x;
      let Y = vt[vstart+1] / 2 * W + y;
      let Z = vt[vstart+2] / 2 * H + z;

      let shadow = calcShadow(x, y, z, side, j);

      // Push vertices
      vertices.push(
        X,
        Y,
        Z,
        u,
        v,
        shade * shadow.r,
        shade * shadow.g,
        shade * shadow.b,
        1
      );
    }

    // Iterate over indices
    for (let j=side*6; j<side*6+6; j++) {
      let idx = CUBE_INDICES[j] - side * 4;
      indices.push(TOTAL_VERTS + totalVerts + idx);
      // cubeIndices.push(TOTAL_VERTS + CUBE_INDICES[j]);
    }

    totalVerts += 4; // next face is 4 vertices away
  }
}

function removeFaces(x, y, z) {
  let block;
  let skipSides = [false, false, false, false, false, false];

  // TOP
  block = getBlock(x, y+1, z);
  if (compareFaces(block)) skipSides[0] = true;
  // LEFT
  block = getBlock(x-1, y, z);
  if (compareFaces(block)) skipSides[1] = true;
  // RIGHT
  block = getBlock(x+1, y, z);
  if (compareFaces(block)) skipSides[2] = true;
  // FRONT
  block = getBlock(x, y, z+1);
  if (compareFaces(block)) skipSides[3] = true;
  // BACK
  block = getBlock(x, y, z-1);
  if (compareFaces(block)) skipSides[4] = true;
  // BOTTOM
  block = getBlock(x, y-1, z);
  if (compareFaces(block)) skipSides[5] = true;

  return skipSides;
}

function compareFaces(block) {
  if (!block) return false;
  if (this.transparent && block.transparent) return true;
  if (!this.transparent && !block.transparent) return true;
  return false;
}

function calcShadow(x, y, z, side, vt) {
  let shadow = 1;
  let color = {r:1, g:1, b:1};
  let amt = 0.75;
  let diff = 0.4;
  let count = 0;

  switch (side) {
    // TOP  RED
    case 0:
      // color.g -= diff;
      // color.b -= diff;
      
      switch (vt) {
        case 0: // - + (0, -) and 0 + -
        count += checkOffset(x,y,z,-1,1,0);
        count += checkOffset(x,y,z,-1,1,-1);
        count += checkOffset(x,y,z,0,1,-1);
        break;
        case 1: // - + (0, +) and 0 + +
        count += checkOffset(x,y,z,-1,1,0);
        count += checkOffset(x,y,z,-1,1,1);
        count += checkOffset(x,y,z,0,1,1);
        break;
        case 2: // + + (0, +) and 0 + +
        count += checkOffset(x,y,z,1,1,0);
        count += checkOffset(x,y,z,1,1,1);
        count += checkOffset(x,y,z,0,1,1);
        break;
        case 3: // + + (0, -) and 0 + -
        count += checkOffset(x,y,z,1,1,0);
        count += checkOffset(x,y,z,1,1,-1);
        count += checkOffset(x,y,z,0,1,-1);
        break;
      }

      break;
    // LEFT  ORANGE - [- +]
    case 1:
      // color.g -= diff / 2;
      // color.b -= diff;
      
      switch (vt) {
        case 0: // - + (0, +) and - 0 +
        count += checkOffset(x,y,z,-1,1,0);
        count += checkOffset(x,y,z,-1,1,1);
        count += checkOffset(x,y,z,-1,0,1);
        break;
        case 2: // - - (0, -) and - 0 -
        count += checkOffset(x,y,z,-1,-1,0);
        count += checkOffset(x,y,z,-1,-1,-1);
        count += checkOffset(x,y,z,-1,0,-1);
        break;
        case 1: // - - (0, +) and - 0 +
        count += checkOffset(x,y,z,-1,-1,0);
        count += checkOffset(x,y,z,-1,-1,1);
        count += checkOffset(x,y,z,-1,0,1);
        break;
        case 3: // - + (0, -) and - 0 -
        count += checkOffset(x,y,z,-1,1,0);
        count += checkOffset(x,y,z,-1,1,-1);
        count += checkOffset(x,y,z,-1,0,-1);
        break;
      }
      break;
    // RIGHT  YELLOW
    case 2:
      // color.b -= diff;
      
      switch (vt) {
        case 0: // + + (0, +) and + 0 +
        count += checkOffset(x,y,z,1,1,0);
        count += checkOffset(x,y,z,1,1,1);
        count += checkOffset(x,y,z,1,0,1);
        break;
        case 1: // + - (0, +) and + 0 +
        count += checkOffset(x,y,z,1,-1,0);
        count += checkOffset(x,y,z,1,-1,1);
        count += checkOffset(x,y,z,1,0,1);
        break;
        case 2: // + - (0, -) and + 0 -
        count += checkOffset(x,y,z,1,-1,0);
        count += checkOffset(x,y,z,1,-1,-1);
        count += checkOffset(x,y,z,1,0,-1);
        break;
        case 3: // + + (0, -) and + 0 -
        count += checkOffset(x,y,z,1,1,0);
        count += checkOffset(x,y,z,1,1,-1);
        count += checkOffset(x,y,z,1,0,-1);
        break;
      }

      break;
    // FRONT  GREEN [- +] +
    case 3:
      // color.r -= diff;
      // color.b -= diff;
      
      switch (vt) {
        case 0: // (0, +) + + and + 0 +
        count += checkOffset(x,y,z,0,1,1);
        count += checkOffset(x,y,z,1,1,1);
        count += checkOffset(x,y,z,1,0,1);
        break;
        case 1: // (0, +) - + and + 0 +
        count += checkOffset(x,y,z,0,-1,1);
        count += checkOffset(x,y,z,1,-1,1);
        count += checkOffset(x,y,z,1,0,1);
        break;
        case 2: // (0, -) - + and - 0 +
        count += checkOffset(x,y,z,0,-1,1);
        count += checkOffset(x,y,z,-1,-1,1);
        count += checkOffset(x,y,z,-1,0,1);
        break;
        case 3: // (0, -) + + and - 0 +
        count += checkOffset(x,y,z,0,1,1);
        count += checkOffset(x,y,z,-1,1,1);
        count += checkOffset(x,y,z,-1,0,1);
        break;
      }

      break;
    // BACK  BLUE
    case 4:
      // color.r -= diff;
      // color.g -= diff;
      
      switch (vt) {
        case 0: // (0, +) + - and + 0 -
        count += checkOffset(x,y,z,0,1,-1);
        count += checkOffset(x,y,z,1,1,-1);
        count += checkOffset(x,y,z,1,0,-1);
        break;
        case 1: // (0, +) - - and + 0 -
        count += checkOffset(x,y,z,0,-1,-1);
        count += checkOffset(x,y,z,1,-1,-1);
        count += checkOffset(x,y,z,1,0,-1);
        break;
        case 2: // (0, -) - - and - 0 -
        count += checkOffset(x,y,z,0,-1,-1);
        count += checkOffset(x,y,z,-1,-1,-1);
        count += checkOffset(x,y,z,-1,0,-1);
        break;
        case 3: // (0, -) + - and - 0 -
        count += checkOffset(x,y,z,0,1,-1);
        count += checkOffset(x,y,z,-1,1,-1);
        count += checkOffset(x,y,z,-1,0,-1);
        break;
      }

      break;
    // BOTTOM  PURPLE
    case 5:
      // color.g -= diff;
      
      switch (vt) {
        case 0: // - - (0, -) and 0 - -
        count += checkOffset(x,y,z,-1,-1,0);
        count += checkOffset(x,y,z,-1,-1,-1);
        count += checkOffset(x,y,z,0,-1,-1);
        break;
        case 1: // - - (0, +) and 0 - +
        count += checkOffset(x,y,z,-1,-1,0);
        count += checkOffset(x,y,z,-1,-1,1);
        count += checkOffset(x,y,z,0,-1,1);
        break;
        case 2: // + - (0, +) and 0 - +
        count += checkOffset(x,y,z,1,-1,0);
        count += checkOffset(x,y,z,1,-1,1);
        count += checkOffset(x,y,z,0,-1,1);
        break;
        case 3: // + - (0, -) and 0 - -
        count += checkOffset(x,y,z,1,-1,0);
        count += checkOffset(x,y,z,1,-1,-1);
        count += checkOffset(x,y,z,0,-1,-1);
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
    g : color.g * shadow,
    b : color.b * shadow
  };
}

function checkOffset(x, y, z, xo, yo, zo) {
  let block = getBlock(x+xo, y+yo, z+zo);
  if (block == null) return 0;
  return !block.transparent;
}

/*























*/
