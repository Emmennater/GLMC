/**
 * Cloud layer: a grid of cells above the world, each either a box of cloud or
 * clear sky, chosen by noise
 */

const CLOUD_HEIGHT = 260; // y of the bottom of the clouds, just above the world
const CLOUD_THICKNESS = 4; // blocks
const CLOUD_CELL_SIZE = 12; // blocks along each side of a cell
const CLOUD_RADIUS = 32; // cells around the player that have clouds
const CLOUD_SCALE = 8; // cells across the noise's broad features
const CLOUD_COVER = 0.25; // noise value above which a cell is cloud, higher gives fewer clouds
const CLOUD_SPEED = 1; // blocks per second the clouds drift along x

// Brightness of each side, so the shape of the clouds shows
const CLOUD_TOP_SHADE = 1;
const CLOUD_BOTTOM_SHADE = 0.88;
const CLOUD_X_SHADE = 0.96;
const CLOUD_Z_SHADE = 0.92;

/**
 * Check whether a cell of the cloud grid holds cloud
 * @param {number} x Cell x coordinate
 * @param {number} z Cell z coordinate
 * @returns {boolean} Whether the cell is cloud
 */
function isCloudCell(x, z) {
  const broad = noise.simplex2(x / CLOUD_SCALE, z / CLOUD_SCALE);
  const detail = noise.simplex2(x * 3 / CLOUD_SCALE + 100, z * 3 / CLOUD_SCALE + 100);

  return broad + detail * 0.4 > CLOUD_COVER;
}

/**
 * Get the distance from the player at which clouds have finished fading out.
 * It stays inside the cells a mesh covers wherever the player is in its center
 * cell, so the mesh's edge never shows.
 * @returns {number} Distance in blocks
 */
function getCloudFadeEnd() {
  return (CLOUD_RADIUS - 2) * CLOUD_CELL_SIZE;
}

/**
 * Build the mesh of the clouds in a circle of cells. Sides between two cloud
 * cells are left out, so neighboring cells join into one shape.
 * @param {number} centerX Center cell x coordinate
 * @param {number} centerZ Center cell z coordinate
 * @param {number} radius Cells from the center to the edge of the circle
 * @param {Object|null} previous Cells of the last mesh built, whose overlap is reused instead of sampling noise again
 * @returns {{vertices: Float32Array, indices: Uint32Array, cells: Object}} Vertices of x, y, z and shade, triangle indices, and the cells for the next build
 */
function buildCloudMesh(centerX, centerZ, radius, previous = null) {
  const cells = getCloudCells(centerX - radius - 1, centerZ - radius - 1, 2 * radius + 3, previous);
  const vertices = [];
  const indices = [];

  // Add a face from its four corners, given in order around it
  function addFace(corners, shade) {
    const start = vertices.length / 4;
    for (const [x, y, z] of corners) vertices.push(x, y, z, shade);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }

  const y0 = CLOUD_HEIGHT;
  const y1 = CLOUD_HEIGHT + CLOUD_THICKNESS;

  for (let x = centerX - radius; x <= centerX + radius; x++) {
    for (let z = centerZ - radius; z <= centerZ + radius; z++) {
      if (!cells.isCloud(x, z) || (x - centerX) ** 2 + (z - centerZ) ** 2 > radius ** 2) continue;

      const x0 = x * CLOUD_CELL_SIZE;
      const x1 = x0 + CLOUD_CELL_SIZE;
      const z0 = z * CLOUD_CELL_SIZE;
      const z1 = z0 + CLOUD_CELL_SIZE;

      addFace([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], CLOUD_TOP_SHADE);
      addFace([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], CLOUD_BOTTOM_SHADE);

      if (!cells.isCloud(x - 1, z))
        addFace([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], CLOUD_X_SHADE);
      if (!cells.isCloud(x + 1, z))
        addFace([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], CLOUD_X_SHADE);
      if (!cells.isCloud(x, z - 1))
        addFace([[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], CLOUD_Z_SHADE);
      if (!cells.isCloud(x, z + 1))
        addFace([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], CLOUD_Z_SHADE);
    }
  }

  return { vertices: new Float32Array(vertices), indices: new Uint32Array(indices), cells: cells };
}

/**
 * Find which cells of a square of the cloud grid are cloud, so each cell's
 * noise is sampled once however many neighbors look at it. Sampling is slow,
 * so cells another square already knows are copied from it.
 * @param {number} minX Smallest cell x coordinate
 * @param {number} minZ Smallest cell z coordinate
 * @param {number} size Cells along each side
 * @param {Object|null} previous Cells found before, to copy from
 * @returns {{covers: function(number, number): boolean, isCloud: function(number, number): boolean}} Whether a cell is in the square, and whether a cell in it is cloud
 */
function getCloudCells(minX, minZ, size, previous = null) {
  const cells = new Uint8Array(size * size);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const x = minX + i;
      const z = minZ + j;
      const cloud = previous?.covers(x, z) ? previous.isCloud(x, z) : isCloudCell(x, z);
      cells[i * size + j] = cloud ? 1 : 0;
    }
  }

  return {
    covers: (x, z) => x >= minX && x < minX + size && z >= minZ && z < minZ + size,
    isCloud: (x, z) => cells[(x - minX) * size + (z - minZ)] === 1
  };
}
