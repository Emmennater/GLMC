/**
 * Get the key a chunk is stored under in maps
 * @param {number} cx Chunk x coordinate
 * @param {number} cz Chunk z coordinate
 * @returns {string} Chunk key
 */
function getChunkKey(cx, cz) {
  return `${cx},${cz}`;
}

/**
 * Get the index of a block in a chunk's block array, where each column of
 * blocks is stored contiguously from the bottom up
 * @param {number} x Block x coordinate within the chunk
 * @param {number} y Block y coordinate
 * @param {number} z Block z coordinate within the chunk
 * @returns {number} Index into the chunk's blocks
 */
function getBlockIndex(x, y, z) {
  return (x * WIDTH + z) * HEIGHT + y;
}

/**
 * Get a loaded chunk by its chunk coordinates
 * @param {number} cx Chunk x coordinate
 * @param {number} cz Chunk z coordinate
 * @returns {Chunk|null} The chunk, or null if it is not loaded
 */
function getLoadedChunk(cx, cz) {
  const row = Chunks[cx];
  if (row == undefined) return null;

  return row[cz] ?? null;
}

/**
 * Get the loaded chunk containing a world position
 * @param {number} x World x coordinate
 * @param {number} z World z coordinate
 * @returns {Chunk|null} The chunk, or null if it is not loaded
 */
function getChunk(x, z) {
  return getLoadedChunk(floor(x / LENGTH), floor(z / WIDTH));
}

/**
 * Get the id of the block at a world position
 * @param {number} x World x coordinate
 * @param {number} y World y coordinate
 * @param {number} z World z coordinate
 * @returns {number} Block id, which is air outside loaded chunks
 */
function getBlockIdAt(x, y, z) {
  if (y < 0 || y >= HEIGHT) return BLOCK_AIR;

  const chunk = getChunk(x, z);
  if (chunk == null) return BLOCK_AIR;

  return chunk.blocks[getBlockIndex(x - chunk.X, y, z - chunk.Z)];
}

/**
 * Get the block at a world position
 * @param {number} x World x coordinate
 * @param {number} y World y coordinate
 * @param {number} z World z coordinate
 * @returns {Object|null} Block info, or null for air and unloaded chunks
 */
function getBlock(x, y, z) {
  return createBlockFromId(getBlockIdAt(x, y, z), x, y, z);
}

/**
 * Change the block at a world position and rebuild the meshes it affects
 * @param {number} x World x coordinate
 * @param {number} y World y coordinate
 * @param {number} z World z coordinate
 * @param {string|null} type Block type, or null for air
 * @param {boolean} update Whether to record the change as a player edit
 */
function editBlock(x, y, z, type, update = false) {
  const chunk = getChunk(x, z);
  if (chunk == null || y < 0 || y >= HEIGHT) return null;

  const id = getBlockTypeId(type);
  const index = getBlockIndex(x - chunk.X, y, z - chunk.Z);
  const current = chunk.blocks[index];
  if (id === current) return;

  if (update) data.edits.setBlock(chunk.x, chunk.z, index, id, current);
  chunk.blocks[index] = id;

  remeshAround(x, z);
}

/**
 * Rebuild the meshes of every chunk whose faces or shading can depend on
 * the blocks in a column
 * @param {number} x World x coordinate
 * @param {number} z World z coordinate
 */
function remeshAround(x, z) {
  const chunks = new Set();
  for (let xo = -1; xo <= 1; xo++) {
    for (let zo = -1; zo <= 1; zo++) {
      const chunk = getChunk(x + xo, z + zo);
      if (chunk && (chunk.complete || chunk.calculating)) chunks.add(chunk);
    }
  }

  for (const chunk of chunks)
    chunk.calcVertices(false);
}
