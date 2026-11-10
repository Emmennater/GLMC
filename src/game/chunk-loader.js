/**
 * Chunks are loaded in rings around the player:
 * - within the render distance chunks are meshed and drawn
 * - meshing a chunk needs its neighbors decorated, and decorating needs
 *   their neighbors generated, so blocks are loaded 2 chunks further out
 * - chunks further than the margins below are freed, keeping only the
 *   player's edits, and are regenerated from the seed if the player returns
 */

const MESH_KEEP_MARGIN = 1; // chunks past the render distance keep their mesh this far out
const UNLOAD_MARGIN = 3; // chunks past the render distance keep their blocks this far out
const GENERATE_OFFSETS = createChunkOffsets(2); // chunks that must be generated before meshing one

let chunkOffsets = []; // [dx, dz] around the player's chunk, nearest first
let chunkOffsetsRadius = -1;
let lastUnloadCenter = null; // chunk key of the player's chunk at the last unload pass

/**
 * Load, generate and mesh the chunks around the player, a little each frame
 */
function generateRadius() {
  if (data.waitTime > 0) {
    data.waitTime--;
    data.waitTime = Math.max(data.waitTime, 0);
    return;
  }

  const cx = floor(player.x / LENGTH);
  const cz = floor(player.z / WIDTH);
  const r = data.renderDistance;

  unloadFarChunks(cx, cz, r);

  // Find a chunk to generate
  for (const [dx, dz] of getChunkOffsets(r)) {
    const delay = loadChunk(cx + dx, cz + dz);
    if (delay > 0) {
      data.waitTime += delay;
      if (data.waitTime >= 1) return;
    }
  }
}

/**
 * Take the next step towards a chunk being meshed
 * @param {number} x Chunk x coordinate
 * @param {number} z Chunk z coordinate
 * @returns {number} Frames to wait before the next step
 */
function loadChunk(x, z) {
  const chunk = getLoadedChunk(x, z);
  if (chunk && (chunk.complete || chunk.calculating)) return 0;

  // Finish the chunk being generated before starting another
  if (ChunkJob) return continueGenerationJob();

  // Generate every chunk whose trees can reach a neighbor of this one
  for (const [dx, dz] of GENERATE_OFFSETS) {
    if (getLoadedChunk(x + dx, z + dz)) continue;

    ChunkJob = createGenerationJob(x + dx, z + dz);
    return continueGenerationJob();
  }

  // Finish the blocks the mesh will see
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const neighbor = getLoadedChunk(x + dx, z + dz);
      if (!neighbor.decorated) neighbor.decorate();
    }
  }

  getLoadedChunk(x, z).calcVertices();
  return data.chunkDelay;
}

/**
 * Generate more of the current chunk, adding it to the world once done
 * @returns {number} Frames to wait before the next step
 */
function continueGenerationJob() {
  if (!runGenerationJob(ChunkJob)) return data.chunkDelay;

  const chunk = ChunkJob.chunk;
  if (Chunks[chunk.x] == undefined) Chunks[chunk.x] = {};
  Chunks[chunk.x][chunk.z] = chunk;
  ChunkJob = null;

  return data.chunkDelay;
}

/**
 * Get the chunk offsets within the render distance, reusing them while it stays the same
 * @param {number} r Radius in chunks
 * @returns {number[][]} [dx, dz] offsets, nearest first
 */
function getChunkOffsets(r) {
  if (r !== chunkOffsetsRadius) {
    chunkOffsets = createChunkOffsets(r);
    chunkOffsetsRadius = r;
  }

  return chunkOffsets;
}

/**
 * Create the chunk offsets within a square radius, nearest first
 * @param {number} r Radius in chunks
 * @returns {number[][]} [dx, dz] offsets
 */
function createChunkOffsets(r) {
  const offsets = [];
  for (let dx = -r; dx <= r; dx++)
    for (let dz = -r; dz <= r; dz++) offsets.push([dx, dz]);

  return offsets.sort((a, b) => (a[0] ** 2 + a[1] ** 2) - (b[0] ** 2 + b[1] ** 2));
}

/**
 * Free the meshes and blocks of chunks the player has moved away from
 * @param {number} cx Chunk x coordinate of the player
 * @param {number} cz Chunk z coordinate of the player
 * @param {number} r Render distance in chunks
 */
function unloadFarChunks(cx, cz, r) {
  const center = `${getChunkKey(cx, cz)},${r}`;
  if (center === lastUnloadCenter) return;
  lastUnloadCenter = center;

  for (const x in Chunks) {
    const row = Chunks[x];

    for (const z in row) {
      const chunk = row[z];
      const distance = Math.max(Math.abs(chunk.x - cx), Math.abs(chunk.z - cz));

      if (distance > r + UNLOAD_MARGIN) {
        chunk.unload();
        delete row[z];
      } else if (distance > r + MESH_KEEP_MARGIN && (chunk.complete || chunk.calculating)) {
        chunk.freeMesh();
      }
    }

    if (Object.keys(row).length === 0) delete Chunks[x];
  }
}

/**
 * Free every loaded chunk
 */
function unloadAllChunks() {
  for (const x in Chunks)
    for (const z in Chunks[x]) Chunks[x][z].unload();

  Chunks = {};
  lastUnloadCenter = null;
}

/**
 * Draw the meshed chunks within the render distance
 */
function renderChunks() {
  data.renderedChunks = 0;
  let cx = floor(player.x / LENGTH);
  let cz = floor(player.z / WIDTH);
  let r = data.renderDistance;
  data.furthestChunk = 0;

  for (let x = -r + cx; x <= r + cx; x++) {
    for (let z = -r + cz; z <= r + cz; z++) {
      const chunk = getLoadedChunk(x, z);
      if (!chunk || !chunk.complete) continue;

      chunk.render();

      let d = dist2(x, z, cx, cz);
      if (d > data.furthestChunk) {
        data.furthestChunk = d;
      }
    }
  }
}
