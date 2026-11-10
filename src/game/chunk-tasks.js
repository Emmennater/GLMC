/**
 * The chunk work that runs in workers, or on the main thread when workers are
 * unavailable. Tasks carry everything they need, including the world
 * settings, so workers keep no state that has to be kept up to date.
 */

let taskWorld = null; // world settings the globals were last set up for

/**
 * Run a chunk task
 * @param {Object} task Task with a type of 'generate' or 'mesh' and the world settings
 * @returns {{result: Object, transfer: ArrayBuffer[]}} Result and the buffers it can hand over without copying
 */
function runChunkTask(task) {
  useWorld(task.world);

  if (task.type === 'generate') {
    const generated = generateChunk(task.cx, task.cz, getTerrain(task.world.mode), task.world.seed);
    const transfer = [generated.blocks.buffer, ...[...generated.features.values()].map(f => f.buffer)];
    return { result: generated, transfer: transfer };
  }

  if (task.type === 'mesh') {
    syncBlockTypes(task.blockTypes);
    const mesh = buildChunkMesh(task.area, task.X, task.Z);
    return { result: mesh, transfer: [mesh.vertices.buffer, mesh.indices.buffer] };
  }

  throw new Error(`Unknown chunk task '${task.type}'`);
}

/**
 * Set up the world size globals and noise seed for a world, if they are not already
 * @param {Object} world World settings from getWorldSettings
 */
function useWorld(world) {
  if (taskWorld && taskWorld.seed === world.seed && taskWorld.length === world.length &&
    taskWorld.width === world.width && taskWorld.height === world.height) return;

  LENGTH = world.length;
  WIDTH = world.width;
  HEIGHT = world.height;
  seedWorld(world.seed);
  taskWorld = world;
}
