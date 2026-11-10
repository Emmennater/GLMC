/**
 * Block types are stored in chunks as one byte ids. Ids are handed out the
 * first time a type is used, so they are only valid for the current session
 * and saves store type names instead.
 *
 * Whether a block is see-through comes from its textures, so it is only known
 * once the atlas has loaded and useAtlasTileLayers has been called.
 */

const BLOCK_AIR = 0;
const MAX_BLOCK_TYPES = 256;

// Block properties indexed by id, filled in as types are registered
const BLOCK_TYPES = [null];
const BLOCK_IDS = new Map();
const BLOCK_LAYER = new Uint8Array(MAX_BLOCK_TYPES); // most see-through layer of the block's textures
const BLOCK_TRANSPARENT = new Uint8Array(MAX_BLOCK_TYPES);
const BLOCK_SOLID = new Uint8Array(MAX_BLOCK_TYPES);
const BLOCK_SHADE_WEIGHT = new Float32Array(MAX_BLOCK_TYPES); // ambient occlusion a neighbor adds, 0 for air
const BLOCK_TEXTURE = [null]; // atlas coordinates for each of the 6 sides
const BLOCK_COLOR = [null]; // [r, g, b] tint
const BLOCK_GLOW = [null]; // {r, g, b} light the block gives off, or null

let atlasTileLayers = null; // layer of each atlas tile, row by row, once the atlas has loaded

/**
 * Get the id of a block type, registering it if it has not been seen before
 * @param {string|null} type Block type name, or null for air
 * @returns {number} Block id
 */
function getBlockTypeId(type) {
  if (type == null || type === 'air') return BLOCK_AIR;

  const id = BLOCK_IDS.get(type);
  if (id !== undefined) return id;

  return registerBlockType(type);
}

/**
 * Get the type name of a block id
 * @param {number} id Block id
 * @returns {string|null} Block type name, or null for air
 */
function getBlockTypeName(id) {
  return BLOCK_TYPES[id];
}

/**
 * Get every registered type name in id order
 * @returns {Array<string|null>} Type names, starting with air
 */
function getBlockTypeNames() {
  return BLOCK_TYPES;
}

/**
 * Get the layer of every registered type in id order, to send with block type names
 * @returns {Uint8Array} Layers, starting with air
 */
function getBlockLayers() {
  return BLOCK_LAYER.slice(0, BLOCK_TYPES.length);
}

/**
 * Check whether the atlas has been read, so block layers are known
 * @returns {boolean} Whether useAtlasTileLayers has been called
 */
function hasBlockLayers() {
  return atlasTileLayers != null;
}

/**
 * Register type names and layers in the same order as another registry, so
 * block ids mean the same thing in a worker as on the main thread
 * @param {Array<string|null>} names Type names in id order, from getBlockTypeNames
 * @param {Uint8Array} layers Layers in id order, from getBlockLayers
 */
function syncBlockTypes(names, layers) {
  for (let id = BLOCK_TYPES.length; id < names.length; id++)
    registerBlockType(names[id]);

  for (let id = 1; id < names.length; id++)
    setBlockLayer(id, layers[id]);
}

/**
 * Learn which atlas tiles are see-through, and update every registered type
 * @param {Uint8Array} layers Layer of each atlas tile, row by row, from getAtlasTiles
 */
function useAtlasTileLayers(layers) {
  atlasTileLayers = layers;

  for (let id = 1; id < BLOCK_TYPES.length; id++)
    setBlockLayer(id, getTextureLayer(BLOCK_TEXTURE[id]));
}

/**
 * Add a block type to the registry and cache its properties
 * @param {string} type Block type name
 * @returns {number} Id given to the type
 */
function registerBlockType(type) {
  const id = BLOCK_TYPES.length;
  if (id >= MAX_BLOCK_TYPES)
    throw new Error(`Too many block types to register '${type}'`);

  BLOCK_TYPES.push(type);
  BLOCK_IDS.set(type, id);
  BLOCK_SOLID[id] = isSolid(type) ? 1 : 0;
  BLOCK_TEXTURE[id] = getTexture(type);
  BLOCK_COLOR[id] = getColor(type);
  BLOCK_GLOW[id] = getShadow(type);
  setBlockLayer(id, getTextureLayer(BLOCK_TEXTURE[id]));

  return id;
}

/**
 * Set a block's layer and the properties that follow from it
 * @param {number} id Block id
 * @param {number} layer LAYER_OPAQUE, LAYER_CUTOUT or LAYER_TRANSLUCENT
 */
function setBlockLayer(id, layer) {
  const transparent = layer !== LAYER_OPAQUE;

  BLOCK_LAYER[id] = layer;
  BLOCK_TRANSPARENT[id] = transparent ? 1 : 0;
  BLOCK_SHADE_WEIGHT[id] = (!transparent || !BLOCK_SOLID[id]) ? 1 : 0.5;
}

/**
 * Get the most see-through layer of a block's 6 side textures
 * @param {number[]} texture Atlas tile coordinates of each side
 * @returns {number} Layer, which is opaque until the atlas has loaded
 */
function getTextureLayer(texture) {
  if (atlasTileLayers == null) return LAYER_OPAQUE;

  let layer = LAYER_OPAQUE;
  for (let side = 0; side < 6; side++)
    layer = Math.max(layer, atlasTileLayers[texture[2 * side + 1] * TXRW + texture[2 * side]]);

  return layer;
}

/**
 * Create the block object that gameplay code works with from a block id
 * @param {number} id Block id
 * @param {number} x World x coordinate
 * @param {number} y World y coordinate
 * @param {number} z World z coordinate
 * @returns {Object|null} Block info, or null for air
 */
function createBlockFromId(id, x, y, z) {
  if (id === BLOCK_AIR) return null;

  return {
    type: BLOCK_TYPES[id],
    x: x,
    y: y,
    z: z,
    transparent: BLOCK_TRANSPARENT[id] === 1,
    solid: BLOCK_SOLID[id] === 1
  };
}
