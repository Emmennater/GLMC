/**
 * A layer of blocky white clouds just above the world, drifting along x. The
 * mesh covers the cells around the player and is rebuilt when they move into
 * another cell.
 */
class Clouds {
  /**
   * Create the clouds' program and buffers
   * @param {WebGLRenderingContext} gl WebGL context
   */
  constructor(gl) {
    this._gl = gl;
    this._program = createProgramObject(gl, cloudVertexShaderSrc, cloudFragmentShaderSrc);
    this._position = gl.getAttribLocation(this._program, 'aPosition');
    this._shade = gl.getAttribLocation(this._program, 'aShade');
    this._viewUniform = gl.getUniformLocation(this._program, 'uView');
    this._projectionUniform = gl.getUniformLocation(this._program, 'uProjection');
    this._eyeUniform = gl.getUniformLocation(this._program, 'uEye');
    this._driftUniform = gl.getUniformLocation(this._program, 'uDrift');
    this._fadeUniform = gl.getUniformLocation(this._program, 'uFade');
    this._vertexBuffer = gl.createBuffer();
    this._indexBuffer = gl.createBuffer();
    this._indexCount = 0;
    this._center = null; // cell the mesh is built around, as {x, z}
    this._cells = null; // which cells around the center are cloud, reused by the next build
  }

  /**
   * Draw the clouds. They go after the sky and before the blocks: blocks are
   * always below them, so are never hidden behind them.
   * @param {Float32Array} view View matrix
   * @param {Float32Array} projection Projection matrix
   * @param {number[]} eye Eye position as [x, y, z]
   * @param {number} time Seconds since the game started
   */
  draw(view, projection, eye, time) {
    const gl = this._gl;
    const drift = time * CLOUD_SPEED; // blocks

    this._centerOn(Math.floor((eye[0] - drift) / CLOUD_CELL_SIZE), Math.floor(eye[2] / CLOUD_CELL_SIZE));
    if (this._indexCount === 0) return;

    gl.useProgram(this._program);
    gl.uniformMatrix4fv(this._viewUniform, false, view);
    gl.uniformMatrix4fv(this._projectionUniform, false, projection);
    gl.uniform2f(this._eyeUniform, eye[0], eye[2]);
    gl.uniform1f(this._driftUniform, drift);
    gl.uniform2f(this._fadeUniform, getCloudFadeEnd() / 2, getCloudFadeEnd());

    // Each vertex is x, y, z and shade
    disableVertexAttribs(gl);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.vertexAttribPointer(this._position, 3, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this._shade, 1, gl.FLOAT, false, 16, 12);
    gl.enableVertexAttribArray(this._position);
    gl.enableVertexAttribArray(this._shade);

    // Only the nearest surface is colored: depth is drawn first, then color
    // where it matches, so see-through faces never stack up. That picks the
    // nearest face whichever way faces wind, so none are culled.
    const colorMask = gl.getParameter(gl.COLOR_WRITEMASK);
    const culling = gl.isEnabled(gl.CULL_FACE);
    gl.disable(gl.CULL_FACE);

    gl.colorMask(false, false, false, false);
    gl.drawElements(gl.TRIANGLES, this._indexCount, gl.UNSIGNED_INT, 0);

    gl.colorMask(...colorMask);
    gl.depthFunc(gl.LEQUAL);
    gl.drawElements(gl.TRIANGLES, this._indexCount, gl.UNSIGNED_INT, 0);

    // Put back the state the scene is drawn with
    gl.depthFunc(gl.LESS);
    if (culling) gl.enable(gl.CULL_FACE);
    gl.useProgram(program);
  }

  /**
   * Rebuild the mesh around a cell, unless it is already built around it
   * @param {number} x Cell x coordinate, in the clouds' drifting grid
   * @param {number} z Cell z coordinate
   */
  _centerOn(x, z) {
    if (this._center && this._center.x === x && this._center.z === z) return;

    const gl = this._gl;
    const mesh = buildCloudMesh(x, z, CLOUD_RADIUS, this._cells);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    this._indexCount = mesh.indices.length;
    this._center = { x: x, z: z };
    this._cells = mesh.cells;
  }
}
