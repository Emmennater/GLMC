// Generates and meshes chunks off the main thread with the same code the main thread uses
importScripts(
  '../libraries/noise.js',
  '../libraries/pseudo-random.js',
  '../other/math.js',
  '../graphics-3d/blocks.js',
  '../graphics-3d/create-cube.js',
  '../graphics-3d/mesh-builder.js',
  '../graphics-3d/chunk-mesher.js',
  '../game/block-registry.js',
  '../game/terrain.js',
  '../game/generate.js',
  '../game/chunk-tasks.js'
);

onmessage = event => {
  const { id, task } = event.data;

  try {
    const { result, transfer } = runChunkTask(task);
    postMessage({ id: id, result: result }, transfer);
  } catch (error) {
    postMessage({ id: id, error: error.stack ?? String(error) });
  }
};
