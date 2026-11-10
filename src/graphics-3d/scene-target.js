/**
 * Where the 3D scene is drawn, for anti-aliasing. Between begin and end:
 * - with supersampling (SSAA), the scene is drawn factor times the screen's
 *   size along each axis, and end averages it down onto the screen
 * - with multisampling (MSAA), each pixel keeps several samples of shape
 *   edges, and end resolves them into one color. Needs WebGL 2.
 * The two can be combined. With both off the scene is drawn straight to the
 * screen and no extra memory is held.
 */
class SceneTarget {
  /**
   * Create the downsampling program and the triangle that covers the screen
   * @param {WebGLRenderingContext} gl WebGL context
   */
  constructor(gl) {
    this._gl = gl;
    this._webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    this._program = createProgramObject(gl, downsampleVertexShaderSrc, downsampleFragmentShaderSrc);
    this._position = gl.getAttribLocation(this._program, 'aPosition');
    this._sceneUniform = gl.getUniformLocation(this._program, 'uScene');
    this._sizeUniform = gl.getUniformLocation(this._program, 'uSceneSize');
    this._factorUniform = gl.getUniformLocation(this._program, 'uFactor');
    this._attributeCount = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    this._maxSamples = this._webgl2 ? gl.getParameter(gl.MAX_SAMPLES) : 0;

    // Largest target the GPU can draw to, in texels
    const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    const largest = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
    this._maxWidth = Math.min(largest, viewport[0]);
    this._maxHeight = Math.min(largest, viewport[1]);

    // One triangle larger than the screen, so every pixel is drawn once
    this._triangle = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._triangle);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    this._supersampled = null; // {framebuffer, texture, depth, width, height, samples: 0}
    this._multisampled = null; // {framebuffer, color, depth, width, height, samples}
    this._unsupported = new Set(); // sizes the GPU couldn't create, so they aren't retried every frame
    this._factor = 1; // supersampling factor of the current frame
    this._samples = 0; // multisamples of the current frame
  }

  /**
   * Get the supersampling factor the current frame is drawn at, which can be
   * lower than asked for if the target would be too large for the GPU
   * @returns {number} Samples per pixel along each axis, 1 when off
   */
  getFactor() {
    return this._factor;
  }

  /**
   * Get the multisamples the current frame is drawn with
   * @returns {number} Samples per pixel, 0 when off
   */
  getSamples() {
    return this._samples;
  }

  /**
   * Check whether the current frame is multisampled, so cutout blocks can
   * use their alpha as coverage
   * @returns {boolean} Whether MSAA is on
   */
  isMultisampled() {
    return this._samples > 0;
  }

  /**
   * Get the multisample counts this GPU supports, for cycling through
   * @returns {number[]} Sample counts, starting with 0 for off
   */
  getSampleOptions() {
    return [0, ...[2, 4, 8].filter(samples => samples <= this._maxSamples)];
  }

  /**
   * Start a frame, drawing into the off-screen targets anti-aliasing needs.
   * The frame is cleared to the sky, and its alpha is then kept at 1, since
   * the canvas would otherwise let the page behind it show through wherever
   * a translucent block or a partly covered MSAA sample wrote a lower alpha.
   * @param {number} factor Supersamples per pixel along each axis, 1 for off
   * @param {number} samples Multisamples per pixel, 0 for off
   * @param {{r: number, g: number, b: number}} sky Color to clear to
   */
  begin(factor, samples, sky) {
    const gl = this._gl;
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;

    // Supersampling draws a larger scene, which multisampling then works on
    this._factor = this._getSupportedFactor(factor, width, height);
    const supersampledSize = { width: width * this._factor, height: height * this._factor, samples: 0 };
    this._supersampled = this._useTarget(this._supersampled, this._factor > 1 ? supersampledSize : null);
    if (this._supersampled == null) this._factor = 1;

    const sceneWidth = width * this._factor;
    const sceneHeight = height * this._factor;
    this._samples = this._getSupportedSamples(samples);
    const multisampledSize = { width: sceneWidth, height: sceneHeight, samples: this._samples };
    this._multisampled = this._useTarget(this._multisampled, this._samples > 0 ? multisampledSize : null);
    if (this._multisampled == null) this._samples = 0;

    const target = this._multisampled ?? this._supersampled;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
    gl.viewport(0, 0, sceneWidth, sceneHeight);

    gl.colorMask(true, true, true, true);
    gl.clearColor(sky.r, sky.g, sky.b, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.colorMask(true, true, true, false);
  }

  /**
   * Finish a frame, resolving and averaging the scene down onto the screen
   */
  end() {
    const gl = this._gl;
    gl.colorMask(true, true, true, true);

    // Resolve each pixel's samples into one color
    if (this._multisampled) {
      const { width, height } = this._multisampled;
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this._multisampled.framebuffer);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this._supersampled ? this._supersampled.framebuffer : null);
      gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (this._supersampled) this._downsample();
  }

  /**
   * Average the supersampled scene onto the screen
   */
  _downsample() {
    const gl = this._gl;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);

    // Only the triangle's position is read; the scene's attributes are set again before each draw
    for (let i = 0; i < this._attributeCount; i++) gl.disableVertexAttribArray(i);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._triangle);
    gl.vertexAttribPointer(this._position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this._position);

    // Use texture unit 1 so the block atlas stays bound to unit 0
    gl.useProgram(this._program);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this._supersampled.texture);
    gl.uniform1i(this._sceneUniform, 1);
    gl.uniform2f(this._sizeUniform, this._supersampled.width, this._supersampled.height);
    gl.uniform1i(this._factorUniform, this._factor);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Put back the state the scene is drawn with
    gl.activeTexture(gl.TEXTURE0);
    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
  }

  /**
   * Limit a supersampling factor to what the shader and the GPU allow
   * @param {number} factor Requested samples per pixel along each axis
   * @param {number} width Screen width in px
   * @param {number} height Screen height in px
   * @returns {number} Factor to use
   */
  _getSupportedFactor(factor, width, height) {
    const fit = Math.min(Math.floor(this._maxWidth / width), Math.floor(this._maxHeight / height));

    return Math.max(1, Math.min(Math.floor(factor) || 1, MAX_SSAA_FACTOR, fit));
  }

  /**
   * Limit a multisample count to what the GPU allows
   * @param {number} samples Requested samples per pixel
   * @returns {number} Samples to use, 0 without WebGL 2
   */
  _getSupportedSamples(samples) {
    return Math.max(0, Math.min(Math.floor(samples) || 0, this._maxSamples));
  }

  /**
   * Keep a target if it already has the size needed, or replace it
   * @param {Object|null} current Target in use now
   * @param {{width: number, height: number, samples: number}|null} size Size needed, or null for none
   * @returns {Object|null} Target to use, or null if none is needed or it couldn't be created
   */
  _useTarget(current, size) {
    if (current && size && current.width === size.width && current.height === size.height &&
      current.samples === size.samples) return current;

    this._freeTarget(current);
    if (size == null) return null;

    const key = `${size.width}x${size.height}, ${size.samples} samples`;
    if (this._unsupported.has(key)) return null;

    const target = size.samples > 0 ? this._createMultisampled(size) : this._createSupersampled(size);
    if (target == null) {
      this._unsupported.add(key);
      console.warn(`Anti-aliasing at ${key} isn't supported by this GPU, so it is off`);
    }

    return target;
  }

  /**
   * Create a target whose color can be read by the downsampling shader
   * @param {{width: number, height: number}} size Size in texels
   * @returns {Object|null} Target, or null if the GPU can't draw to it
   */
  _createSupersampled({ width, height }) {
    const gl = this._gl;

    // Color, on texture unit 1 so the block atlas stays bound to unit 0
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);

    // Depth with at least 24 bits, like the screen's, so distant faces don't flicker
    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, this._webgl2 ? gl.DEPTH_COMPONENT24 : gl.DEPTH_STENCIL, width, height);

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, this._webgl2 ? gl.DEPTH_ATTACHMENT : gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, depth);

    const target = { framebuffer: framebuffer, texture: texture, depth: depth, width: width, height: height, samples: 0 };
    return this._checkComplete(target);
  }

  /**
   * Create a target that keeps several samples per pixel
   * @param {{width: number, height: number, samples: number}} size Size in texels and samples per pixel
   * @returns {Object|null} Target, or null if the GPU can't draw to it
   */
  _createMultisampled({ width, height, samples }) {
    const gl = this._gl;

    const color = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, color);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, width, height);

    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, width, height);

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, color);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);

    const target = { framebuffer: framebuffer, color: color, depth: depth, width: width, height: height, samples: samples };
    return this._checkComplete(target);
  }

  /**
   * Check that the GPU can draw to a new target, freeing it if not
   * @param {Object} target New target, with its framebuffer bound
   * @returns {Object|null} The target, or null if it can't be drawn to
   */
  _checkComplete(target) {
    const gl = this._gl;
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (complete) return target;

    this._freeTarget(target);
    return null;
  }

  /**
   * Free a target's GPU memory
   * @param {Object|null} target Target to free
   */
  _freeTarget(target) {
    if (target == null) return;

    const gl = this._gl;
    gl.deleteFramebuffer(target.framebuffer);
    if (target.texture) gl.deleteTexture(target.texture);
    if (target.color) gl.deleteRenderbuffer(target.color);
    gl.deleteRenderbuffer(target.depth);
  }
}
