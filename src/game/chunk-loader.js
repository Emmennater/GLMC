/**
 * Chunks are loaded in rings around the player:
 * - within the render distance chunks are meshed and drawn
 * - meshing a chunk needs its neighbors decorated, and decorating needs
 *   their neighbors generated, so blocks are loaded 2 chunks further out
 * - chunks further than the margins below are freed, keeping only the
 *   player's edits, and are regenerated from the seed if the player returns
 *
 * Generation and meshing run in workers. The main thread decorates chunks,
 * adds them to the world and uploads meshes, as much as the frame budget allows.
 */

const MESH_KEEP_MARGIN = 1; // chunks past the render distance keep their mesh this far out
const UNLOAD_MARGIN = 3; // chunks past the render distance keep their blocks this far out
const GENERATE_OFFSETS = createChunkOffsets(2); // chunks that must be generated before meshing one
const WORKER_SCRIPT = 'src/workers/chunk-worker.js';
const MAX_WORKERS = 8;

const frameBudget = new FrameBudget();
let chunkWorkers = null; // created on first use
let pendingChunks = new Set(); // keys of chunks being generated
let failedChunks = new Set(); // keys of chunks whose generation failed, so it isn't retried every frame
let finishedTasks = []; // results waiting for main thread time
let loaderEpoch = 0; // bumped when the world is cleared, so results for the old world are dropped
let chunkOffsets = []; // [dx, dz] around the player's chunk, nearest first
let chunkOffsetsRadius = -1;
let lastUnloadCenter = null; // chunk key of the player's chunk at the last unload pass

/**
 * Load, generate and mesh the chunks around the player. Workers do the heavy
 * work, and the main thread's share is limited by the frame budget.
 */
function generateRadius() {
  const workers = getChunkWorkers();
  frameBudget.startFrame();

  const cx = floor(player.x / LENGTH);
  const cz = floor(player.z / WIDTH);
  const r = data.renderDistance;

  unloadFarChunks(cx, cz, r);

  // Without workers, tasks run here instead
  while (workers.hasInlineTask() && frameBudget.canRun('inline'))
    frameBudget.run('inline', () => workers.runInline());

  finishTasks(cx, cz, r);

  // Start work on the nearest chunks first
  for (const [dx, dz] of getChunkOffsets(r))
    advanceChunk(cx + dx, cz + dz);
}

/**
 * Take the next steps towards a chunk being meshed
 * @param {number} x Chunk x coordinate
 * @param {number} z Chunk z coordinate
 */
function advanceChunk(x, z) {
  const chunk = getLoadedChunk(x, z);
  if (chunk && (chunk.complete || chunk.calculating)) return;

  // Generate every chunk whose trees can reach a neighbor of this one
  let generated = true;
  for (const [dx, dz] of GENERATE_OFFSETS) {
    if (getLoadedChunk(x + dx, z + dz)) continue;

    generated = false;
    requestGeneration(x + dx, z + dz);
  }
  if (!generated) return;

  // Finish the blocks the mesh will see
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const neighbor = getLoadedChunk(x + dx, z + dz);
      if (neighbor.decorated) continue;
      if (!frameBudget.canRun('decorate')) return;

      frameBudget.run('decorate', () => neighbor.decorate());
    }
  }

  if (getChunkWorkers().hasCapacity() && frameBudget.canRun('request-mesh'))
    frameBudget.run('request-mesh', () => requestMesh(chunk));
}

/**
 * Ask a worker to generate a chunk, unless one already is or there is no room
 * @param {number} x Chunk x coordinate
 * @param {number} z Chunk z coordinate
 */
function requestGeneration(x, z) {
  const key = getChunkKey(x, z);
  const workers = getChunkWorkers();
  if (pendingChunks.has(key) || failedChunks.has(key) || !workers.hasCapacity()) return;

  const epoch = loaderEpoch;
  pendingChunks.add(key);

  workers.submit(
    { type: 'generate', cx: x, cz: z, world: getWorldSettings() },
    (error, result) => finishedTasks.push({ name: 'adopt', epoch: epoch, x: x, z: z, error: error, result: result })
  );
}

/**
 * Ask a worker to build a chunk's mesh
 * @param {Chunk} chunk Chunk whose neighbors are all decorated
 */
function requestMesh(chunk) {
  const epoch = loaderEpoch;
  const version = chunk.startMesh();

  getChunkWorkers().submit(
    {
      type: 'mesh',
      area: createMeshArea(chunk),
      X: chunk.X,
      Z: chunk.Z,
      blockTypes: getBlockTypeNames(),
      world: getWorldSettings()
    },
    (error, result) => finishedTasks.push({ name: 'upload', epoch: epoch, chunk: chunk, version: version, error: error, result: result })
  );
}

/**
 * Add finished chunks to the world and upload finished meshes, as the budget allows
 * @param {number} cx Chunk x coordinate of the player
 * @param {number} cz Chunk z coordinate of the player
 * @param {number} r Render distance in chunks
 */
function finishTasks(cx, cz, r) {
  while (finishedTasks.length > 0 && frameBudget.canRun(finishedTasks[0].name)) {
    const task = finishedTasks.shift();
    if (task.epoch !== loaderEpoch) continue;

    if (task.name === 'adopt') {
      frameBudget.run('adopt', () => adoptChunk(task, cx, cz, r));
    } else if (task.error) {
      // Leave the chunk marked as meshing so it isn't retried every frame
      console.error(`Meshing chunk ${task.chunk.x},${task.chunk.z} failed`, task.error);
    } else {
      frameBudget.run('upload', () => task.chunk.setMesh(task.version, task.result.vertices, task.result.indices));
    }
  }
}

/**
 * Add a generated chunk to the world, converting its blocks to this thread's block ids
 * @param {Object} task Finished generation task
 * @param {number} cx Chunk x coordinate of the player
 * @param {number} cz Chunk z coordinate of the player
 * @param {number} r Render distance in chunks
 */
function adoptChunk(task, cx, cz, r) {
  const key = getChunkKey(task.x, task.z);
  pendingChunks.delete(key);

  if (task.error) {
    failedChunks.add(key);
    console.error(`Generating chunk ${key} failed`, task.error);
    return;
  }

  // The player may have moved on while the chunk was generated
  if (Math.max(Math.abs(task.x - cx), Math.abs(task.z - cz)) > r + UNLOAD_MARGIN) return;

  const generated = task.result;
  remapGeneratedChunk(generated, Uint8Array.from(generated.palette, getBlockTypeId));

  if (Chunks[task.x] == undefined) Chunks[task.x] = {};
  Chunks[task.x][task.z] = new Chunk(task.x, task.z, generated.blocks, generated.features);
  data.chunksGenerated++;
}

/**
 * Get the settings a worker needs to generate chunks for the current world
 * @returns {Object} World settings
 */
function getWorldSettings() {
  return { seed: seedPhrase, mode: data.mode, length: LENGTH, width: WIDTH, height: HEIGHT };
}

/**
 * Get the worker pool, creating it the first time, with a worker for each
 * core the main thread isn't using
 * @returns {ChunkWorkerPool} Worker pool
 */
function getChunkWorkers() {
  if (chunkWorkers == null) {
    const cores = navigator.hardwareConcurrency ?? 4;
    chunkWorkers = new ChunkWorkerPool(WORKER_SCRIPT, constrain(cores - 1, 1, MAX_WORKERS));
  }

  return chunkWorkers;
}

/**
 * Forget every chunk and every task in progress, for loading a new world
 */
function resetChunkLoader() {
  unloadAllChunks();
  pendingChunks.clear();
  failedChunks.clear();
  finishedTasks = [];
  loaderEpoch++;
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
