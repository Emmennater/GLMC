/**
 * A column of blocks LENGTH by WIDTH wide and HEIGHT tall. Blocks are stored
 * as one byte ids, and the mesh only lives on the GPU.
 */
class Chunk {
  /**
   * Create a chunk from generated blocks
   * @param {number} x Chunk x coordinate
   * @param {number} z Chunk z coordinate
   * @param {Uint8Array} blocks Block ids, empty if not given
   * @param {Map<string, Uint32Array>} features Chunk key -> packed blocks this chunk's trees place in that chunk
   */
  constructor(x, z, blocks = new Uint8Array(LENGTH * WIDTH * HEIGHT), features = new Map()) {
    this.x = x;
    this.z = z;
    this.X = this.x * LENGTH; // world x of the chunk's corner
    this.Z = this.z * WIDTH; // world z of the chunk's corner
    this.blocks = blocks;
    this.features = features;
    this.decorated = false;
    this.buffer = null;
    this.faces = 0;
    this.complete = false;
    this.calculating = false;
    this._meshVersion = 0; // bumped so meshes started earlier are ignored when they finish
  }

  /**
   * Add the trees that this chunk and its neighbors grow into it, then the
   * player's edits. Every neighbor must be generated first.
   */
  decorate() {
    const key = getChunkKey(this.x, this.z);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const features = getLoadedChunk(this.x + dx, this.z + dz).features.get(key);
        if (features) applyFeatureBlocks(this.blocks, features);
      }
    }

    data.edits.applyTo(this);
    this.decorated = true;
  }

  /**
   * Draw the chunk's mesh
   */
  render() {
    if (this.buffer == null || this.faces === 0) return;

    this.buffer.setUsing(gl);
    setupVertexAttribs();
    gl.drawElements(gl.TRIANGLES, 6 * this.faces, gl.UNSIGNED_INT, 0);
    data.renderedChunks++;
  }

  /**
   * Mark the chunk as having a mesh on the way. The chunk and its neighbors
   * must be decorated first.
   * @returns {number} Version to pass to setMesh when the mesh is built
   */
  startMesh() {
    this.calculating = true;
    return ++this._meshVersion;
  }

  /**
   * Upload a built mesh to the GPU, unless the chunk changed or was freed
   * since the mesh was started
   * @param {number} version Version from startMesh
   * @param {Float32Array} vertices Vertex data
   * @param {Uint32Array} indices Index data
   */
  setMesh(version, vertices, indices) {
    if (version !== this._meshVersion) return;

    if (this.buffer == null) this.buffer = new Buffer();
    this.buffer.upload(gl, vertices, indices);
    this.faces = indices.length / 6;
    this.calculating = false;
    this.complete = true;
  }

  /**
   * Rebuild the mesh on the main thread right away, for changes the player
   * should see immediately
   */
  buildMeshNow() {
    const version = this.startMesh();
    const mesh = buildChunkMesh(createMeshArea(this), this.X, this.Z);
    this.setMesh(version, mesh.vertices, mesh.indices);
  }

  /**
   * Free the chunk's mesh, keeping its blocks
   */
  freeMesh() {
    this._meshVersion++;

    if (this.buffer) {
      this.buffer.destroy(gl);
      this.buffer = null;
    }

    this.faces = 0;
    this.complete = false;
    this.calculating = false;
  }

  /**
   * Free everything the chunk holds on the GPU before it is dropped
   */
  unload() {
    this.freeMesh();
  }
}
