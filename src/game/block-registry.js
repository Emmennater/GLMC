/**
 * Block types are stored in chunks as one byte ids. Ids are handed out the
 * first time a type is used, so they are only valid for the current session
 * and saves store type names instead.
 */

const BLOCK_AIR = 0;
const MAX_BLOCK_TYPES = 256;

// Block properties indexed by id, filled in as types are registered
const BLOCK_TYPES = [null];
const BLOCK_IDS = new Map();
const BLOCK_TRANSPARENT = new Uint8Array(MAX_BLOCK_TYPES);
const BLOCK_SOLID = new Uint8Array(MAX_BLOCK_TYPES);
const BLOCK_SHADE_WEIGHT = new Float32Array(MAX_BLOCK_TYPES); // ambient occlusion a neighbor adds, 0 for air
const BLOCK_TEXTURE = [null]; // atlas coordinates for each of the 6 sides
const BLOCK_COLOR = [null]; // [r, g, b] tint
const BLOCK_GLOW = [null]; // {r, g, b} light the block gives off, or null

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
 * Add a block type to the registry and cache its properties
 * @param {string} type Block type name
 * @returns {number} Id given to the type
 */
function registerBlockType(type) {
  const id = BLOCK_TYPES.length;
  if (id >= MAX_BLOCK_TYPES)
    throw new Error(`Too many block types to register '${type}'`);

  const transparent = isTransparent(type);
  const solid = isSolid(type);

  BLOCK_TYPES.push(type);
  BLOCK_IDS.set(type, id);
  BLOCK_TRANSPARENT[id] = transparent ? 1 : 0;
  BLOCK_SOLID[id] = solid ? 1 : 0;
  BLOCK_SHADE_WEIGHT[id] = (!transparent || !solid) ? 1 : 0.5;
  BLOCK_TEXTURE[id] = getTexture(type);
  BLOCK_COLOR[id] = getColor(type);
  BLOCK_GLOW[id] = getShadow(type);

  return id;
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
