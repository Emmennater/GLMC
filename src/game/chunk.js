/**
 * A column of blocks LENGTH by WIDTH wide and HEIGHT tall. Blocks are stored
 * as one byte ids, and the mesh only lives on the GPU.
 */
class Chunk {
  /**
   * Create an empty chunk
   * @param {number} x Chunk x coordinate
   * @param {number} z Chunk z coordinate
   */
  constructor(x, z) {
    this.x = x;
    this.z = z;
    this.X = this.x * LENGTH; // world x of the chunk's corner
    this.Z = this.z * WIDTH; // world z of the chunk's corner
    this.blocks = new Uint8Array(LENGTH * WIDTH * HEIGHT);
    this.features = new Map(); // chunk key -> packed blocks this chunk's trees place in that chunk
    this.decorated = false;
    this.buffer = null;
    this.faces = 0;
    this.complete = false;
    this.calculating = false;
    this._meshVersion = 0; // bumped to cancel meshes still being built
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
   * Build the chunk's mesh and upload it to the GPU. The chunk and its
   * neighbors must be decorated first.
   * @param {boolean} overwrite Whether to spread the work over several frames
   */
  async calcVertices(overwrite = true) {
    const version = ++this._meshVersion;
    this.calculating = true;

    const area = createMeshArea(this);
    const builder = new MeshBuilder();

    for (let x = 0; x < LENGTH; x++) {
      if (overwrite) {
        await sleep(VertexWaitTime);

        // Stop if the chunk was freed or a newer mesh was started
        if (version !== this._meshVersion) return;
      }

      addChunkSlice(builder, area, this, x);
    }

    this._uploadMesh(builder);
    this.calculating = false;
    this.complete = true;
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

  /**
   * Send a built mesh to the GPU
   * @param {MeshBuilder} builder Built mesh
   */
  _uploadMesh(builder) {
    if (this.buffer == null) this.buffer = new Buffer();

    this.buffer.upload(gl, builder.getVertices(), builder.getIndices());
    this.faces = builder.getFaceCount();
  }
}
