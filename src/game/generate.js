/**
 * Generates chunks by following the rules of a terrain from terrain.js. It
 * works only from its arguments and the world size globals, so it can run in
 * a worker, and gives the same chunk every time and on every machine.
 */

/**
 * Get the terrain rules for a generation mode
 * @param {string} mode Generation mode
 * @returns {Object} Terrain from TERRAINS
 */
function getTerrain(mode) {
  return TERRAINS[mode] ?? TERRAINS.normal;
}

/**
 * Seed the noise the terrain uses from the world's seed phrase
 * @param {string} seedPhrase World seed phrase
 */
function seedWorld(seedPhrase) {
  const hash = cyrb128(`${seedPhrase}`);
  noise.seed(hash[0] / 4 + hash[1] / 4 + hash[2] / 4 + hash[3] / 4);
}

/**
 * Create the random number generator for a chunk from the world seed
 * @param {string} seedPhrase World seed phrase
 * @param {number} cx Chunk x coordinate
 * @param {number} cz Chunk z coordinate
 * @returns {function(): number} Generator of numbers in [0, 1)
 */
function createChunkRandom(seedPhrase, cx, cz) {
  const hash = cyrb128(`${seedPhrase}:${cx},${cz}`);
  return sfc32(hash[0], hash[1], hash[2], hash[3]);
}

/**
 * Generate a chunk's blocks and the blocks its features place. The noise
 * must already be seeded for the world with seedWorld.
 * @param {number} cx Chunk x coordinate
 * @param {number} cz Chunk z coordinate
 * @param {Object} terrain Terrain from TERRAINS
 * @param {string} seedPhrase World seed phrase
 * @returns {{blocks: Uint8Array, palette: Array<string|null>, features: Map<string, Uint32Array>}}
 *   Blocks and features hold indices into the palette, where 0 is air
 */
function generateChunk(cx, cz, terrain, seedPhrase) {
  const random = createChunkRandom(seedPhrase, cx, cz);
  const blocks = new Uint8Array(LENGTH * WIDTH * HEIGHT);
  const palette = createPalette();
  const features = new Map();
  const place = createFeaturePlacer(cx, cz, palette, features);
  const grid = sampleDensity(terrain, cx, cz);
  const density = new Float64Array(grid.sizeY);

  for (let x = 0; x < LENGTH; x++) {
    for (let z = 0; z < WIDTH; z++) {
      getColumnDensity(grid, x, z, density);
      fillColumn(blocks, x, z, density, grid.step, {
        terrain: terrain,
        palette: palette,
        random: random,
        place: place,
        x: cx * LENGTH + x,
        z: cz * WIDTH + z
      });
    }
  }

  const packed = new Map();
  for (const [key, list] of features) packed.set(key, Uint32Array.from(list));

  return { blocks: blocks, palette: palette.names, features: packed };
}

/**
 * Sample a terrain's density on a grid covering a chunk
 * @param {Object} terrain Terrain from TERRAINS
 * @param {number} cx Chunk x coordinate
 * @param {number} cz Chunk z coordinate
 * @returns {Object} Samples with the grid's step and size
 */
function sampleDensity(terrain, cx, cz) {
  const step = terrain.sampleStep;
  const sizeX = Math.ceil((LENGTH - 1) / step) + 1;
  const sizeZ = Math.ceil((WIDTH - 1) / step) + 1;
  const sizeY = Math.ceil((HEIGHT - 1) / step) + 1;
  const samples = new Float64Array(sizeX * sizeZ * sizeY);

  for (let i = 0; i < sizeX; i++) {
    for (let k = 0; k < sizeZ; k++) {
      for (let j = 0; j < sizeY; j++) {
        const index = (i * sizeZ + k) * sizeY + j;
        samples[index] = terrain.density(cx * LENGTH + i * step, j * step, cz * WIDTH + k * step);
      }
    }
  }

  return { samples: samples, step: step, sizeX: sizeX, sizeZ: sizeZ, sizeY: sizeY };
}

/**
 * Blend the density samples around a column into its density at each sample height
 * @param {Object} grid Samples from sampleDensity
 * @param {number} x Column x coordinate within the chunk
 * @param {number} z Column z coordinate within the chunk
 * @param {Float64Array} out Density at each sample height
 */
function getColumnDensity(grid, x, z, out) {
  const { samples, step, sizeZ, sizeY } = grid;
  const i = Math.min(Math.floor(x / step), grid.sizeX - 2);
  const k = Math.min(Math.floor(z / step), sizeZ - 2);
  const tx = x / step - i;
  const tz = z / step - k;

  // Columns of samples at the 4 corners around the column
  const c00 = (i * sizeZ + k) * sizeY;
  const c10 = ((i + 1) * sizeZ + k) * sizeY;
  const c01 = (i * sizeZ + k + 1) * sizeY;
  const c11 = ((i + 1) * sizeZ + k + 1) * sizeY;

  for (let j = 0; j < sizeY; j++) {
    const near = samples[c00 + j] + (samples[c10 + j] - samples[c00 + j]) * tx;
    const far = samples[c01 + j] + (samples[c11 + j] - samples[c01 + j]) * tx;
    out[j] = near + (far - near) * tz;
  }
}

/**
 * Fill a column with blocks from the top down, so materials know how deep they are
 * @param {Uint8Array} blocks Chunk's blocks
 * @param {number} x Column x coordinate within the chunk
 * @param {number} z Column z coordinate within the chunk
 * @param {Float64Array} density Column density at each sample height
 * @param {number} step Blocks between sample heights
 * @param {Object} column Terrain, palette, random, feature placer and world x, z of the column
 */
function fillColumn(blocks, x, z, density, step, column) {
  const { terrain, palette, random, place } = column;
  const start = getBlockIndex(x, 0, z);
  const last = density.length - 2;
  let depth = 0;

  for (let y = HEIGHT - 1; y >= 0; y--) {
    const j = Math.min(Math.floor(y / step), last);
    const below = density[j];
    const above = density[j + 1];

    // Blending can't make solid blocks between two air samples, so skip to the bottom of the cell
    if (below > 0 && above > 0) {
      depth = 0;
      y = j * step;
      continue;
    }

    if (below + (above - below) * (y / step - j) > 0) {
      depth = 0;
      continue;
    }

    const type = terrain.material(depth, column.x, y, column.z, random);
    if (!type) {
      depth = 0;
      continue;
    }

    depth++;
    terrain.feature(type, column.x, y, column.z, random, place);
    blocks[start + y] = getPaletteIndex(palette, type);
  }
}

/**
 * Create a palette that numbers block types in the order they are first used
 * @returns {{names: Array<string|null>, indices: Map<string, number>}} Palette with air at 0
 */
function createPalette() {
  return { names: [null], indices: new Map() };
}

/**
 * Get a block type's index in a palette, adding it if needed
 * @param {Object} palette Palette from createPalette
 * @param {string} type Block type
 * @returns {number} Palette index
 */
function getPaletteIndex(palette, type) {
  let index = palette.indices.get(type);
  if (index === undefined) {
    index = palette.names.length;
    palette.names.push(type);
    palette.indices.set(type, index);
  }
  return index;
}

/**
 * Create the function terrain features use to place blocks, which records
 * each block under the chunk it lands in
 * @param {number} cx Chunk x coordinate of the chunk being generated
 * @param {number} cz Chunk z coordinate of the chunk being generated
 * @param {Object} palette Palette from createPalette
 * @param {Map<string, number[]>} features Chunk key -> packed blocks placed there
 * @returns {function(string, number, number, number, boolean=)} Places a block by type and world position
 */
function createFeaturePlacer(cx, cz, palette, features) {
  return (type, x, y, z, airOnly = false) => {
    if (y < 0 || y >= HEIGHT) return;

    const tx = floor(x / LENGTH);
    const tz = floor(z / WIDTH);
    if (Math.abs(tx - cx) > 1 || Math.abs(tz - cz) > 1)
      throw new Error(`Feature block at ${x},${y},${z} is more than one chunk from chunk ${cx},${cz}`);

    const key = getChunkKey(tx, tz);
    if (!features.has(key)) features.set(key, []);

    const index = getBlockIndex(x - tx * LENGTH, y, z - tz * WIDTH);
    features.get(key).push(packFeatureBlock(index, getPaletteIndex(palette, type), airOnly));
  };
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

/**
 * Convert a generated chunk from palette indices to block ids in place
 * @param {Object} generated Result of generateChunk
 * @param {Uint8Array} ids Block id for each palette index
 */
function remapGeneratedChunk(generated, ids) {
  const blocks = generated.blocks;
  for (let i = 0; i < blocks.length; i++) blocks[i] = ids[blocks[i]];

  for (const features of generated.features.values()) {
    for (let i = 0; i < features.length; i++) {
      const id = ids[(features[i] >>> 16) & 0xff];
      features[i] = ((features[i] & 0xff00ffff) | (id << 16)) >>> 0;
    }
  }
}
