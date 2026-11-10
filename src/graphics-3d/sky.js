/**
 * The sky behind the world: a gradient from light blue at the horizon to
 * saturated blue straight up, drawn over the whole frame before anything else
 */
class Sky {
  /**
   * Create the sky's program and the triangle that covers the screen
   * @param {WebGLRenderingContext} gl WebGL context
   */
  constructor(gl) {
    this._gl = gl;
    this._program = createProgramObject(gl, skyVertexShaderSrc, skyFragmentShaderSrc);
    this._position = gl.getAttribLocation(this._program, 'aPosition');
    this._inverseUniform = gl.getUniformLocation(this._program, 'uInverseViewProjection');
    this._triangle = createScreenTriangle(gl);
    this._inverse = new Float32Array(16); // reused each frame: clip space to view directions
  }

  /**
   * Draw the sky over the whole frame, behind everything drawn after it
   * @param {Float32Array} view View matrix
   * @param {Float32Array} projection Projection matrix
   */
  draw(view, projection) {
    const gl = this._gl;

    // Turn clip space back into directions, leaving out where the eye is
    const inverse = this._inverse;
    mat4.copy(inverse, view);
    inverse[12] = inverse[13] = inverse[14] = 0;
    mat4.multiply(inverse, projection, inverse);
    mat4.invert(inverse, inverse);

    // Only the triangle's position is read
    disableVertexAttribs(gl);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._triangle);
    gl.vertexAttribPointer(this._position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this._position);

    // Cover the frame without touching depth, so everything is drawn in front
    gl.useProgram(this._program);
    gl.uniformMatrix4fv(this._inverseUniform, false, inverse);
    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Put back the state the scene is drawn with
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(program);
  }
}
