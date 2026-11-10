/**
 * How the world looks in each generation mode. The generator in generate.js
 * only follows the rules below, so changing the terrain only needs edits here.
 *
 * - sampleStep: blocks between density samples. Blocks in between are blended
 *   from the samples, so detail smaller than this is smoothed out. Use 1 to
 *   sample every block.
 * - density(x, y, z): solid where it is <= 0. Every height is covered, so no
 *   height limit has to be kept in sync with it.
 * - material(depth, x, y, z, random): block type for a solid position, where
 *   depth is the number of solid blocks directly above it
 * - feature(type, x, y, z, random, place): called for each block placed. It
 *   can add blocks such as trees with place(type, x, y, z, airOnly), as long
 *   as they stay within one chunk of the block.
 *
 * Use random() instead of Math.random() so a chunk comes back the same when
 * it is generated again.
 */

const TREE_FREQUENCY = 0.01; // chance of a tree on each grass block
const STONE_HEIGHT = 256; // height where grass gives way to stone
const STONE_VARIATION = 3; // how far the stone line wanders up and down

const TERRAINS = {
  normal: {
    sampleStep: 4,
    density: (x, y, z) => ChaosHills.density(x, y, z),
    material: groundMaterial,
    feature: growTrees
  },
  superflat: {
    sampleStep: 4,
    density: (x, y, z) => y - 5.5, // solid up to y = 5
    material: groundMaterial,
    feature: noFeature
  },
  void: {
    sampleStep: 4,
    density: (x, y, z) => y - 1.5, // solid up to y = 1
    material: () => 'void_block',
    feature: noFeature
  }
};

/**
 * Pick bedrock, grass, dirt or stone for a solid position
 * @param {number} depth Solid blocks directly above
 * @param {number} x World x coordinate
 * @param {number} y World y coordinate
 * @param {number} z World z coordinate
 * @param {function(): number} random Chunk's random number generator
 * @returns {string} Block type
 */
function groundMaterial(depth, x, y, z, random) {
  if (y < 4) {
    switch (y) {
      case 0: return 'bedrock';
      case 1: if (random() < 0.75) return 'bedrock';
      case 2: if (random() < 0.5) return 'bedrock';
      case 3: if (random() < 0.25) return 'bedrock';
    }
  }

  // The stone line noise is only needed where the line can reach
  const grassy = y < STONE_HEIGHT - STONE_VARIATION ||
    y < STONE_HEIGHT + noise.simplex2(x / 15 + 0.2, y / 15 + 0.4) * STONE_VARIATION;

  if (grassy) {
    if (depth < 1) return 'grass';
    if (depth < 4) return 'dirt';
  }

  return 'stone';
}

/**
 * Sometimes grow an oak or birch tree on grass
 * @param {string} type Block type just placed
 * @param {number} x World x coordinate
 * @param {number} y World y coordinate
 * @param {number} z World z coordinate
 * @param {function(): number} random Chunk's random number generator
 * @param {function} place Adds a feature block
 */
function growTrees(type, x, y, z, random, place) {
  if (type !== 'grass') return;

  const rnd = random();
  if (rnd < TREE_FREQUENCY / 2) spawnTree(place, random, x, y, z, 'log', 'leaves');
  else if (rnd < TREE_FREQUENCY) spawnTree(place, random, x, y, z, 'birch_log', 'birch_leaves');
}

/**
 * Add no features
 */
function noFeature() {}

/**
 * Place a tree growing from a ground block
 * @param {function} place Adds a feature block
 * @param {function(): number} random Chunk's random number generator
 * @param {number} x World x coordinate of the ground block
 * @param {number} y World y coordinate of the ground block
 * @param {number} z World z coordinate of the ground block
 * @param {string} log Trunk block type
 * @param {string} leaves Leaf block type
 */
function spawnTree(place, random, x, y, z, log, leaves) {
  // Tree Height
  const h = Math.floor(random() * 3 + 4);

  // Lower Leaves
  for (let x1 = -2; x1 <= 2; x1++) {
    for (let y1 = h - 3; y1 < h - 1; y1++) {
      for (let z1 = -2; z1 <= 2; z1++) {
        place(leaves, x + x1, y + y1, z + z1, true);
      }
    }
  }

  // Upper Leaves
  for (let x1 = -1; x1 <= 1; x1++) {
    for (let y1 = -1; y1 < 1; y1++) {
      for (let z1 = -1; z1 <= 1; z1++) {
        if (Math.abs(x1) == Math.abs(z1) && y1 > -1 && x1) continue;
        place(leaves, x + x1, y + y1 + h, z + z1, true);
      }
    }
  }

  // Trunk
  for (let i = 0; i < h; i++)
    place(log, x, y + i, z);
  place('dirt', x, y - 1, z);
}

function biomeBlendGen(heat, moisture, ...Algorithms) {

}

class Biome {
  static density(x, y, z) {
    return -1;
  }
}

class ChaosHills extends Biome {
  static density(x, y, z) {
    let value = 0;
    y *= 0.25;
    x *= 0.5;
    z *= 0.5;
    value += ((noise.simplex3(x / 50, z / 50, y / 250) + 1) ** 0.1) * 5 - 4;
    value += (noise.simplex3(x / 50 + 10, z / 50 + 20, y / 25 + 30) ** 2) - 1;
    value += (noise.simplex3(x / 15 + 10, z / 15 + 20, y / 15 + 30) ** 4) - 1;
    value += y / 20;
    return value - 1.0; // solid where value <= 1
  }
}
