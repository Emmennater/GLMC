const TEXTURE_WIDTH = 384; // px
const TEXTURE_HEIGHT = 1520; // px
const TXRW = TEXTURE_WIDTH / 16; // textures across the atlas
const TXRH = TEXTURE_HEIGHT / 16; // textures down the atlas
const SIDE_SHADE = 1 / 24; // how much darker each side is than the one before
const WHITE = [1, 1, 1];

// Normal of each side: TOP, LEFT, RIGHT, FRONT, BACK, BOTTOM
const SIDE_NORMALS = [[0, 1, 0], [-1, 0, 0], [1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0]];

// The two directions each corner of a side points towards, which together
// with the side's normal give the 4 blocks that shade that corner
const SIDE_CORNERS = [
  [[[-1, 0, 0], [0, 0, -1]], [[-1, 0, 0], [0, 0, 1]], [[1, 0, 0], [0, 0, 1]], [[1, 0, 0], [0, 0, -1]]],
  [[[0, 1, 0], [0, 0, 1]], [[0, -1, 0], [0, 0, 1]], [[0, -1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, -1]]],
  [[[0, 1, 0], [0, 0, 1]], [[0, -1, 0], [0, 0, 1]], [[0, -1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, -1]]],
  [[[0, 1, 0], [1, 0, 0]], [[0, -1, 0], [1, 0, 0]], [[0, -1, 0], [-1, 0, 0]], [[0, 1, 0], [-1, 0, 0]]],
  [[[0, 1, 0], [1, 0, 0]], [[0, -1, 0], [1, 0, 0]], [[0, -1, 0], [-1, 0, 0]], [[0, 1, 0], [-1, 0, 0]]],
  [[[-1, 0, 0], [0, 0, -1]], [[-1, 0, 0], [0, 0, 1]], [[1, 0, 0], [0, 0, 1]], [[1, 0, 0], [0, 0, -1]]]
];

// Packed shadow colors of the face being built, reused to avoid allocating per face
const CORNER_SHADOWS = [0, 0, 0, 0];

/**
 * Copy a chunk's blocks and a one block border from its neighbors into one
 * array, so meshing can look up any neighbor with a single index offset.
 * The result is plain data, so it can be sent to a worker.
 * @param {Chunk} chunk Chunk to mesh
 * @returns {Object} Padded block array with the offsets used to step through it
 */
function createMeshArea(chunk) {
  const strideZ = HEIGHT + 2;
  const strideX = (WIDTH + 2) * strideZ;
  const blocks = new Uint8Array((LENGTH + 2) * strideX);

  // Copy each column, leaving air above, below and where chunks are missing
  for (let x = -1; x <= LENGTH; x++) {
    for (let z = -1; z <= WIDTH; z++) {
      const source = getChunk(chunk.X + x, chunk.Z + z);
      if (source == null) continue;

      const start = getBlockIndex(chunk.X + x - source.X, 0, chunk.Z + z - source.Z);
      blocks.set(source.blocks.subarray(start, start + HEIGHT), (x + 1) * strideX + (z + 1) * strideZ + 1);
    }
  }

  const getOffset = ([dx, dy, dz]) => dx * strideX + dz * strideZ + dy;

  return {
    blocks: blocks,
    strideX: strideX,
    strideZ: strideZ,
    sideOffsets: Int32Array.from(SIDE_NORMALS, getOffset),
    shadeOffsets: Int32Array.from(getShadeDirections(), getOffset)
  };
}

/**
 * Get the directions of the 4 blocks that shade each corner of each side
 * @returns {number[][]} Directions ordered by side, then corner, then block
 */
function getShadeDirections() {
  const add = (...vectors) => [0, 1, 2].map(i => vectors.reduce((sum, v) => sum + v[i], 0));

  return SIDE_CORNERS.flatMap((corners, side) => {
    const normal = SIDE_NORMALS[side];
    return corners.flatMap(([a, b]) => [add(normal, a), add(normal, a, b), add(normal, b), normal]);
  });
}

/**
 * Build the mesh of a chunk from its padded blocks
 * @param {Object} area Padded blocks from createMeshArea
 * @param {number} X World x of the chunk's corner
 * @param {number} Z World z of the chunk's corner
 * @returns {{vertices: Float32Array, indices: Uint32Array}} Mesh data sized to fit
 */
function buildChunkMesh(area, X, Z) {
  const builder = new MeshBuilder();

  for (let x = 0; x < LENGTH; x++) {
    for (let z = 0; z < WIDTH; z++) {
      const column = (x + 1) * area.strideX + (z + 1) * area.strideZ + 1;

      for (let y = 0; y < HEIGHT; y++) {
        const id = area.blocks[column + y];
        if (id === BLOCK_AIR) continue;

        addBlockFaces(builder, area, column + y, X + x, y, Z + z, id);
      }
    }
  }

  return { vertices: builder.getVertices().slice(), indices: builder.getIndices().slice() };
}

/**
 * Add the visible faces of a block to a mesh
 * @param {MeshBuilder} builder Mesh to add to
 * @param {Object} area Padded blocks from createMeshArea
 * @param {number} index Index of the block in the padded blocks
 * @param {number} x World x coordinate
 * @param {number} y World y coordinate
 * @param {number} z World z coordinate
 * @param {number} id Block id
 */
function addBlockFaces(builder, area, index, x, y, z, id) {
  const texture = BLOCK_TEXTURE[id];
  const glow = BLOCK_GLOW[id];
  const color = glow == null ? BLOCK_COLOR[id] : WHITE;

  for (let side = 0; side < 6; side++) {
    if (!isFaceVisible(id, area.blocks[index + area.sideOffsets[side]])) continue;

    // Shade each corner from the blocks around it
    const shade = glow == null ? 1 - side * SIDE_SHADE : 1;
    for (let vert = 0; vert < 4; vert++)
      CORNER_SHADOWS[vert] = getCornerShadow(area, index, side, vert, shade, color, glow);

    // Add the face's vertices, then its two triangles
    builder.reserveFace();
    const first = builder.getVertexCount();

    for (let vert = 0; vert < 4; vert++)
      addFaceVertex(builder, x, y, z, side, vert, texture);

    for (let i = side * 6; i < side * 6 + 6; i++)
      builder.addIndex(first + CUBE_INDICES[i] - side * 4);
  }
}

/**
 * Check whether a block's face can be seen past the block next to it
 * @param {number} id Block id
 * @param {number} neighborId Id of the block touching the face
 * @returns {boolean} Whether the face should be drawn
 */
function isFaceVisible(id, neighborId) {
  if (neighborId === BLOCK_AIR) return true;
  if (!BLOCK_SOLID[id] && !BLOCK_SOLID[neighborId]) return true;

  return BLOCK_TRANSPARENT[id] !== BLOCK_TRANSPARENT[neighborId];
}

/**
 * Get the shadow color of a face corner from the blocks around it
 * @param {Object} area Padded blocks from createMeshArea
 * @param {number} index Index of the block in the padded blocks
 * @param {number} side Side of the block
 * @param {number} vert Corner of the side
 * @param {number} shade Brightness of the side
 * @param {number[]} color Block tint
 * @param {Object|null} glow Light the block gives off
 * @returns {number} Color packed by colToBin
 */
function getCornerShadow(area, index, side, vert, shade, color, glow) {
  const first = (side * 4 + vert) * 4;
  let count = 0;

  // Darken the corner for each block around it
  for (let k = first; k < first + 4; k++)
    count += BLOCK_SHADE_WEIGHT[area.blocks[index + area.shadeOffsets[k]]];

  const shadow = constrain(1 - count / 5 / 2, 0, 1);
  let r = shadow;
  let g = shadow;
  let b = shadow;

  // Tint the corner with light from glowing blocks around it
  for (let k = first; k < first + 4; k++) {
    const neighborGlow = BLOCK_GLOW[area.blocks[index + area.shadeOffsets[k]]];
    if (neighborGlow == null) continue;

    r *= neighborGlow.r;
    g *= neighborGlow.g;
    b *= neighborGlow.b;
  }

  // Glowing blocks are lit by themselves
  if (glow != null) {
    r = (r + glow.r) / 2;
    g = (g + glow.g) / 2;
    b = (b + glow.b) / 2;
  }

  return colToBin(
    Math.floor(shade * r * color[0] * 255 / 2),
    Math.floor(shade * g * color[1] * 255 / 2),
    Math.floor(shade * b * color[2] * 255 / 2)
  );
}

/**
 * Add one corner of a block face to a mesh
 * @param {MeshBuilder} builder Mesh to add to
 * @param {number} x World x coordinate of the block
 * @param {number} y World y coordinate of the block
 * @param {number} z World z coordinate of the block
 * @param {number} side Side of the block
 * @param {number} vert Corner of the side
 * @param {number[]} texture Atlas coordinates of each side
 */
function addFaceVertex(builder, x, y, z, side, vert, texture) {
  const v = 4 * 5 * side + vert * 5; // 5 values per cube vertex

  builder.addVertex(
    CUBE_VERTICES[v + 0] / 2 + x,
    CUBE_VERTICES[v + 1] / 2 + y,
    CUBE_VERTICES[v + 2] / 2 + z,
    (CUBE_VERTICES[v + 3] + texture[2 * side + 0]) / TXRW,
    (CUBE_VERTICES[v + 4] + texture[2 * side + 1]) / TXRH,
    CORNER_SHADOWS,
    vert % 3 === 0 ? 0 : 1, // 0, 1, 1, 0
    vert < 2 ? 1 : 0 // 1, 1, 0, 0
  );
}
