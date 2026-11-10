/**
 * Saves store only the player's edits, since everything else is regenerated
 * from the seed. Version 2 groups edits by chunk and stores each chunk's
 * edits as base64 varints, using a palette so block names are written once:
 *
 * {"version": "2.0", "seed": ..., "mode": ..., "pos": {...},
 *  "palette": [null, "stone", ...], "chunks": {"cx,cz": "<base64>"}}
 *
 * Each chunk's bytes are pairs of (gap since the previous block index,
 * palette index). Version 1 saves, a flat [type, x, y, z, ...] list, still load.
 */

const SAVE_VERSION = '2.0';

/**
 * Build the object written to a save file
 * @param {Object} world World settings
 * @param {string} world.seed Seed phrase
 * @param {string} world.mode Generation mode
 * @param {{x: number, y: number, z: number}} world.pos Player position
 * @param {ChunkEdits} edits Edits to save
 * @returns {Object} Save data
 */
function createSaveData(world, edits) {
  const palette = [null];
  const paletteIndices = new Map([[BLOCK_AIR, 0]]);
  const chunks = {};

  // Get a block id's palette index, adding it to the palette if needed
  const getPaletteIndex = id => {
    if (!paletteIndices.has(id)) {
      paletteIndices.set(id, palette.length);
      palette.push(getBlockTypeName(id));
    }
    return paletteIndices.get(id);
  };

  for (const { cx, cz, blocks } of edits.getEditedChunks()) {
    const pairs = blocks.map(([index, id]) => [index, getPaletteIndex(id)]);
    chunks[getChunkKey(cx, cz)] = encodeEditPairs(pairs);
  }

  return {
    version: SAVE_VERSION,
    seed: world.seed,
    mode: world.mode,
    pos: world.pos,
    palette: palette,
    chunks: chunks
  };
}

/**
 * Read the edits out of a save in any version
 * @param {Object} save Parsed save data
 * @returns {Array<{cx: number, cz: number, index: number, type: string|null}>} Edited blocks
 */
function readSaveEdits(save) {
  if (save.chunks) return readChunkEdits(save);

  return readFlatEdits(save.blocks ?? []);
}

/**
 * Read the edits of a version 2 save
 * @param {Object} save Parsed save data
 * @returns {Array<{cx: number, cz: number, index: number, type: string|null}>} Edited blocks
 */
function readChunkEdits(save) {
  const edits = [];

  for (const [key, encoded] of Object.entries(save.chunks)) {
    const [cx, cz] = key.split(',').map(Number);
    for (const [index, paletteIndex] of decodeEditPairs(encoded))
      edits.push({ cx: cx, cz: cz, index: index, type: save.palette[paletteIndex] });
  }

  return edits;
}

/**
 * Read the edits of a version 1 save, stored as a flat [type, x, y, z, ...] list
 * @param {Array} blocks Flat list of edits in world coordinates
 * @returns {Array<{cx: number, cz: number, index: number, type: string|null}>} Edited blocks
 */
function readFlatEdits(blocks) {
  const edits = [];

  for (let i = 0; i < blocks.length; i += 4) {
    const [type, x, y, z] = blocks.slice(i, i + 4);
    if (y < 0 || y >= HEIGHT) continue;

    const cx = floor(x / LENGTH);
    const cz = floor(z / WIDTH);
    const index = getBlockIndex(x - cx * LENGTH, y, z - cz * WIDTH);
    edits.push({ cx: cx, cz: cz, index: index, type: type });
  }

  return edits;
}

/**
 * Encode a chunk's edits as base64 varints
 * @param {Array<number[]>} pairs [block index, palette index] pairs sorted by block index
 * @returns {string} Base64 encoded edits
 */
function encodeEditPairs(pairs) {
  const bytes = [];
  let previous = -1;

  for (const [index, paletteIndex] of pairs) {
    writeVarint(bytes, index - previous - 1);
    writeVarint(bytes, paletteIndex);
    previous = index;
  }

  return bytesToBase64(bytes);
}

/**
 * Decode a chunk's edits from base64 varints
 * @param {string} encoded Base64 encoded edits
 * @returns {Array<number[]>} [block index, palette index] pairs
 */
function decodeEditPairs(encoded) {
  const bytes = base64ToBytes(encoded);
  const pairs = [];
  let previous = -1;
  let offset = 0;

  while (offset < bytes.length) {
    const [gap, afterGap] = readVarint(bytes, offset);
    const [paletteIndex, afterPalette] = readVarint(bytes, afterGap);
    previous += gap + 1;
    offset = afterPalette;
    pairs.push([previous, paletteIndex]);
  }

  return pairs;
}

/**
 * Append a non-negative integer as a varint, 7 bits per byte with the high bit marking more bytes
 * @param {number[]} bytes Bytes to append to
 * @param {number} value Integer to write
 */
function writeVarint(bytes, value) {
  while (value >= 0x80) {
    bytes.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  bytes.push(value);
}

/**
 * Read a varint
 * @param {Uint8Array} bytes Bytes to read from
 * @param {number} offset Index of the varint's first byte
 * @returns {number[]} The value and the offset after it
 */
function readVarint(bytes, offset) {
  let value = 0;
  let shift = 0;
  let byte;

  do {
    byte = bytes[offset++];
    value |= (byte & 0x7f) << shift;
    shift += 7;
  } while (byte & 0x80);

  return [value >>> 0, offset];
}

/**
 * Encode bytes as base64
 * @param {number[]} bytes Bytes to encode
 * @returns {string} Base64 string
 */
function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Decode base64 into bytes
 * @param {string} base64 Base64 string
 * @returns {Uint8Array} Decoded bytes
 */
function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}
