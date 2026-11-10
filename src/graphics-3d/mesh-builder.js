// x, y, z, u, v, 4 corner shadows, shadow u, shadow v, fog
const FLOATS_PER_VERTEX = 12;
const INDICES_PER_FACE = 6;
const VERTICES_PER_FACE = 4;

/**
 * Collects a mesh's vertices and indices in typed arrays that grow as faces
 * are added, so building a mesh never holds them as arrays of JS numbers
 */
class MeshBuilder {
  /**
   * Create an empty mesh
   * @param {number} faceCapacity Number of faces to make room for up front
   */
  constructor(faceCapacity = 1024) {
    this._vertices = new Float32Array(faceCapacity * VERTICES_PER_FACE * FLOATS_PER_VERTEX);
    this._indices = new Uint32Array(faceCapacity * INDICES_PER_FACE);
    this._vertexLength = 0;
    this._indexLength = 0;
  }

  /**
   * Get the number of vertices added so far
   * @returns {number} Vertex count
   */
  getVertexCount() {
    return this._vertexLength / FLOATS_PER_VERTEX;
  }

  /**
   * Get the number of faces added so far
   * @returns {number} Face count
   */
  getFaceCount() {
    return this._indexLength / INDICES_PER_FACE;
  }

  /**
   * Get the vertices added so far
   * @returns {Float32Array} View of the vertex data
   */
  getVertices() {
    return this._vertices.subarray(0, this._vertexLength);
  }

  /**
   * Get the indices added so far
   * @returns {Uint32Array} View of the index data
   */
  getIndices() {
    return this._indices.subarray(0, this._indexLength);
  }

  /**
   * Make room for another face, doubling the arrays when they are full
   */
  reserveFace() {
    if (this._indexLength + INDICES_PER_FACE <= this._indices.length) return;

    const vertices = new Float32Array(this._vertices.length * 2);
    vertices.set(this._vertices);
    this._vertices = vertices;

    const indices = new Uint32Array(this._indices.length * 2);
    indices.set(this._indices);
    this._indices = indices;
  }

  /**
   * Add a vertex, after reserving room for its face
   * @param {number} x World x position
   * @param {number} y World y position
   * @param {number} z World z position
   * @param {number} u Texture u coordinate
   * @param {number} v Texture v coordinate
   * @param {number[]} shadows Packed shadow colors of the face's 4 corners
   * @param {number} shadowU Position across the face for blending the corner shadows
   * @param {number} shadowV Position up the face for blending the corner shadows
   */
  addVertex(x, y, z, u, v, shadows, shadowU, shadowV) {
    const out = this._vertices;
    let i = this._vertexLength;

    out[i++] = x;
    out[i++] = y;
    out[i++] = z;
    out[i++] = u;
    out[i++] = v;
    out[i++] = shadows[0];
    out[i++] = shadows[1];
    out[i++] = shadows[2];
    out[i++] = shadows[3];
    out[i++] = shadowU;
    out[i++] = shadowV;
    out[i++] = 1; // fog applies

    this._vertexLength = i;
  }

  /**
   * Add an index, after reserving room for its face
   * @param {number} index Vertex index
   */
  addIndex(index) {
    this._indices[this._indexLength++] = index;
  }
}
