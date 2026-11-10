/**
 * The block texture atlas: a grid of square tiles, one per block side.
 * Its size is set here so texture coordinates can be worked out anywhere,
 * and checked against the image once it arrives. Whether each tile is opaque,
 * cutout or translucent is read from the image itself.
 */

const TEXTURE_WIDTH = 384; // px
const TEXTURE_HEIGHT = 1520; // px
const ATLAS_TILE_SIZE = 16; // px per tile
const TXRW = TEXTURE_WIDTH / ATLAS_TILE_SIZE; // tiles across the atlas
const TXRH = TEXTURE_HEIGHT / ATLAS_TILE_SIZE; // tiles down the atlas

// How a tile is drawn, from its texels' alpha, in order of how see-through it is
const LAYER_OPAQUE = 0; // every texel fully opaque
const LAYER_CUTOUT = 1; // texels fully opaque or fully clear, like leaves
const LAYER_TRANSLUCENT = 2; // some texels partly clear, like tinted glass

/**
 * Create the atlas and smaller copies of it for distant blocks, down to one
 * texel per tile so no level mixes neighboring tiles. Opaque and cutout tiles
 * keep fully opaque or fully clear texels at every level, so leaves keep sharp
 * edges instead of fading out. Colors are averaged by alpha, and clear texels
 * take their tile's color, so blending between levels never darkens edges.
 * @param {{width: number, height: number, data: Uint8ClampedArray}} image Full size RGBA pixels
 * @param {Object} tiles Tiles from getAtlasTiles
 * @param {number} tileSize Tile size in px
 * @returns {Array<{width: number, height: number, data: Uint8Array}>} Mip levels from 0, the full size
 */
function createAtlasMipmaps(image, tiles, tileSize) {
  let level = { width: image.width, height: image.height, data: Uint8Array.from(image.data) };
  fillClearTexels(level, tiles, tileSize);
  const levels = [level];

  for (let size = tileSize / 2; size >= 1; size /= 2) {
    level = halveAtlasLevel(level, tiles, size);
    fillClearTexels(level, tiles, size);
    levels.push(level);
  }

  return levels;
}

/**
 * Find each tile's layer and the average color of its visible texels
 * @param {{width: number, height: number, data: ArrayLike<number>}} image Full size RGBA pixels
 * @param {number} tileSize Tile size in px
 * @returns {{columns: number, layers: Uint8Array, colors: Uint8Array}} Per tile, row by row: layer, and r, g, b
 */
function getAtlasTiles(image, tileSize) {
  const columns = image.width / tileSize;
  const count = columns * (image.height / tileSize);
  const layers = new Uint8Array(count).fill(LAYER_OPAQUE);
  const sums = new Float64Array(count * 4); // alpha weighted r, g, b and total alpha

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4;
      const alpha = image.data[i + 3];
      const tile = Math.floor(y / tileSize) * columns + Math.floor(x / tileSize);

      const layer = alpha === 255 ? LAYER_OPAQUE : alpha === 0 ? LAYER_CUTOUT : LAYER_TRANSLUCENT;
      layers[tile] = Math.max(layers[tile], layer);
      for (let c = 0; c < 3; c++) sums[tile * 4 + c] += image.data[i + c] * alpha;
      sums[tile * 4 + 3] += alpha;
    }
  }

  const colors = new Uint8Array(count * 3);
  for (let tile = 0; tile < count; tile++) {
    const alpha = sums[tile * 4 + 3];
    if (alpha === 0) continue;
    for (let c = 0; c < 3; c++) colors[tile * 3 + c] = Math.round(sums[tile * 4 + c] / alpha);
  }

  return { columns: columns, layers: layers, colors: colors };
}

/**
 * Give every fully clear texel its tile's color, in place
 * @param {{width: number, height: number, data: Uint8Array}} level Mip level
 * @param {{columns: number, colors: Uint8Array}} tiles Tiles from getAtlasTiles
 * @param {number} tileSize Tile size in px at this level
 */
function fillClearTexels(level, tiles, tileSize) {
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      const i = (y * level.width + x) * 4;
      if (level.data[i + 3] !== 0) continue;

      const tile = Math.floor(y / tileSize) * tiles.columns + Math.floor(x / tileSize);
      level.data.set(tiles.colors.subarray(tile * 3, tile * 3 + 3), i);
    }
  }
}

/**
 * Average each 2 by 2 block of texels into one
 * @param {{width: number, height: number, data: ArrayLike<number>}} level Previous mip level
 * @param {{columns: number, layers: Uint8Array}} tiles Tiles from getAtlasTiles
 * @param {number} tileSize Tile size in px at the new level
 * @returns {{width: number, height: number, data: Uint8Array}} Half size mip level
 */
function halveAtlasLevel(level, tiles, tileSize) {
  const width = level.width / 2;
  const height = level.height / 2;
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      // Weight each color by its alpha
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const i = ((y * 2 + dy) * level.width + x * 2 + dx) * 4;
          const alpha = level.data[i + 3];
          r += level.data[i] * alpha;
          g += level.data[i + 1] * alpha;
          b += level.data[i + 2] * alpha;
          a += alpha;
        }
      }

      const out = (y * width + x) * 4;
      const tile = Math.floor(y / tileSize) * tiles.columns + Math.floor(x / tileSize);
      if (a > 0) {
        data[out] = Math.round(r / a);
        data[out + 1] = Math.round(g / a);
        data[out + 2] = Math.round(b / a);
      }

      // Cutouts stay solid where at least half the texels were
      const binary = tiles.layers[tile] !== LAYER_TRANSLUCENT;
      data[out + 3] = binary ? (a >= 2 * 255 ? 255 : 0) : Math.round(a / 4);
    }
  }

  return { width: width, height: height, data: data };
}
