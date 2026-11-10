/**
 * Start generating a chunk. The work is spread over several frames by
 * runGenerationJob, and each chunk has its own random numbers so that a
 * freed chunk comes back the same when it is generated again.
 * @param {number} cx Chunk x coordinate
 * @param {number} cz Chunk z coordinate
 * @returns {Object} Generation job
 */
function createGenerationJob(cx, cz) {
  return {
    chunk: new Chunk(cx, cz),
    x: 0, // next column to generate
    z: 0,
    random: createChunkRandom(cx, cz),
    features: new Map() // chunk key -> packed blocks trees place there
  };
}

/**
 * Create the random number generator for a chunk from the world seed
 * @param {number} cx Chunk x coordinate
 * @param {number} cz Chunk z coordinate
 * @returns {function(): number} Generator of numbers in [0, 1)
 */
function createChunkRandom(cx, cz) {
  const hash = cyrb128(`${seedPhrase}:${cx},${cz}`);
  return sfc32(hash[0], hash[1], hash[2], hash[3]);
}

/**
 * Generate a chunk's terrain until it is done or the frame's block budget runs out
 * @param {Object} job Job from createGenerationJob
 * @returns {boolean} Whether the chunk is finished
 */
function runGenerationJob(job) {
  for (; job.x < LENGTH; job.x++) {
    for (; job.z < WIDTH; job.z++) {

      // Lazy chunks
      if (TotalBlockGen > MaxBlockGen) {
        TotalBlockGen = 0;
        return false;
      }

      generateColumn(job, job.x, job.z);
    }
    job.z = 0;
  }

  for (const [key, blocks] of job.features)
    job.chunk.features.set(key, Uint32Array.from(blocks));

  data.chunksGenerated++;
  return true;
}

/**
 * Generate one column of a chunk's terrain
 * @param {Object} job Job from createGenerationJob
 * @param {number} x Column x coordinate within the chunk
 * @param {number} z Column z coordinate within the chunk
 */
function generateColumn(job, x, z) {
  const mode = data.mode;
  const chunk = job.chunk;
  const column = getBlockIndex(x, 0, z);
  const x1 = x + chunk.X;
  const z1 = z + chunk.Z;

  // Superflat center
  // if (dist2(0, 0, x1, z1) < 100) {
  //     mode = "superflat";
  // } else {
  //     mode = "normal";
  // }

  let y1 = HEIGHT - 1;
  if (mode == 'superflat') y1 = 5;
  else if (mode == 'void') y1 = 1;

  // noise terrain
  // y1 = noise.simplex2(x1 / 100, z1 / 100) + 1;
  // y1 += (noise.simplex2(x1 / 50 + 10, z1 / 50 + 10) + 1) ** 2 / 2;
  // y1 += (noise.simplex2(x1 / 20 + 0.4, z1 / 20 + 1.5) + 1) / 12;
  // y1 = floor(y1 * 10);

  // y1 = 20;
  // y1 += (noise.simplex2(x1/50, z1/50)+1) ** 2 * 10;
  // y1 = floor(y1);

  let depth = 0;
  for (let y = y1; y >= 0; y--) {

    if (mode == 'normal' && !ChaosHills.generate(x1, y, z1)) {
      depth = 0;
      continue;
    }

    // Resource height map
    const type = depthMap(mode, depth, y, x1, y, z1, job.random);

    if (!type) {
      depth = 0;
      continue;
    }

    depth++;

    // Spawning trees
    if (mode == 'normal' && type == 'grass') {
      const rnd = job.random();
      const FREQ = 0.01;
      if (rnd < FREQ / 2) spawnTree(job, x1, y, z1);
      else if (rnd < FREQ) spawnTree(job, x1, y, z1, 'birch_log', 'birch_leaves');
    }

    chunk.blocks[column + y] = getBlockTypeId(type);
    TotalBlockGen++;
  }
}

/**
 * Pick the block for a position from how far it is below the surface
 * @param {string} mode Generation mode
 * @param {number} depth Number of solid blocks above in this column
 * @param {number} elev Height of the block
 * @param {number} x World x coordinate
 * @param {number} y World y coordinate
 * @param {number} z World z coordinate
 * @param {function(): number} random Chunk's random number generator
 * @returns {string|null} Block type
 */
function depthMap(mode, depth, elev, x, y, z, random) {

  if (mode == 'void') {
    return 'void_block';
    // return "smooth_stone";
    // return "black_grid_block";
    // if (y == 40) return "glass";
    // if ((Math.abs(x)+Math.abs(y)+Math.abs(z)) % 3 == 1) return null;
    // else return "glass";
  }

  if (elev < 4) {
    switch (elev) {
      case 0: return 'bedrock';
      case 1: if (random() < 0.75) return 'bedrock';
      case 2: if (random() < 0.5) return 'bedrock';
      case 3: if (random() < 0.25) return 'bedrock';
    }
  }

  // if (data.superflat) return "stone";
  const stoneHeight = 105;
  const stoneElev = stoneHeight + noise.simplex2(x / 15 + 0.2, y / 15 + 0.4) * 3;

  // Grassy
  if (elev < stoneElev) {
    if (depth < 1) return 'grass';
    if (depth < 4) return 'dirt';
    return 'stone';
  }

  // Stone peaks
  if (elev < 50) {
    return 'stone';
  }

  return 'stone';
}

/**
 * Record a tree's blocks, which can reach into neighboring chunks
 * @param {Object} job Job generating the chunk the tree grows from
 * @param {number} x World x coordinate of the ground block
 * @param {number} y World y coordinate of the ground block
 * @param {number} z World z coordinate of the ground block
 * @param {string} log Trunk block type
 * @param {string} leaves Leaf block type
 * @returns {boolean} Whether the tree was placed
 */
function spawnTree(job, x, y, z, log = 'log', leaves = 'leaves') {
  if (y >= HEIGHT) return false;

  // Tree Height
  const h = Math.floor(job.random() * 3 + 4);

  // Lower Leaves
  for (let x1 = -2; x1 <= 2; x1++) {
    for (let y1 = h - 3; y1 < h - 1; y1++) {
      for (let z1 = -2; z1 <= 2; z1++) {
        addFeatureBlock(job, leaves, x + x1, y + y1, z + z1, true);
      }
    }
  }

  // Upper Leaves
  for (let x1 = -1; x1 <= 1; x1++) {
    for (let y1 = -1; y1 < 1; y1++) {
      for (let z1 = -1; z1 <= 1; z1++) {
        if (Math.abs(x1) == Math.abs(z1) && y1 > -1 && x1) continue;
        addFeatureBlock(job, leaves, x + x1, y + y1 + h, z + z1, true);
      }
    }
  }

  // Trunk
  for (let i = 0; i < h; i++)
    addFeatureBlock(job, log, x, y + i, z);
  addFeatureBlock(job, 'dirt', x, y - 1, z);

  // Success
  return true;
}

/**
 * Record a block a feature like a tree places, in whichever chunk it lands
 * @param {Object} job Job generating the chunk the feature comes from
 * @param {string} type Block type
 * @param {number} x World x coordinate
 * @param {number} y World y coordinate
 * @param {number} z World z coordinate
 * @param {boolean} airOnly Whether the block only replaces air
 */
function addFeatureBlock(job, type, x, y, z, airOnly = false) {
  if (y >= HEIGHT || y < 0) return;

  const cx = floor(x / LENGTH);
  const cz = floor(z / WIDTH);
  const key = getChunkKey(cx, cz);
  const index = getBlockIndex(x - cx * LENGTH, y, z - cz * WIDTH);

  if (!job.features.has(key)) job.features.set(key, []);
  job.features.get(key).push(packFeatureBlock(index, getBlockTypeId(type), airOnly));
}

/**
 * Pack a feature block into one number
 * @param {number} index Block index within its chunk
 * @param {number} id Block id
 * @param {boolean} airOnly Whether the block only replaces air
 * @returns {number} Packed block: index in bits 0-15, id in bits 16-23, airOnly in bit 24
 */
function packFeatureBlock(index, id, airOnly) {
  return (index | (id << 16) | ((airOnly ? 1 : 0) << 24)) >>> 0;
}

/**
 * Place packed feature blocks into a chunk's blocks
 * @param {Uint8Array} blocks Chunk's blocks
 * @param {Uint32Array} features Blocks from packFeatureBlock
 */
function applyFeatureBlocks(blocks, features) {
  for (const packed of features) {
    const index = packed & 0xffff;
    const id = (packed >>> 16) & 0xff;
    const airOnly = packed >>> 24;

    if (airOnly && blocks[index] !== BLOCK_AIR) continue;
    blocks[index] = id;
  }
}

function biomeBlendGen(heat, moisture, ...Algorithms) {

}

class Biome {
  static generate(x, y, z) {
    return true;
  }
}

class ChaosHills extends Biome {
  static generate(x, y, z) {
    // x *= 0.2;
    // y *= 0.5;
    // z *= 0.2;
    let value = noise.simplex3(x / 50, z / 50, y / 50) - 1;
    value += noise.simplex3(x / 25 + 10, z / 25 + 20, y / 25 + 30) ** 2 - 1;
    value += (y / 20);
    value /= 2;
    return (value <= 0.5);
  }
}
