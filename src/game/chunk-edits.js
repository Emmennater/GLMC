/**
 * The player's changes to the generated world, kept per chunk so chunks can
 * be freed and later regenerated from the seed with the changes reapplied.
 * Each edit also remembers the block generation made there, so changing a
 * block back to how it was generated removes the edit instead of storing it.
 */
class ChunkEdits {
  /**
   * Create an empty set of edits
   */
  constructor() {
    this._chunks = new Map(); // chunk key -> {cx, cz, blocks: Map of block index -> packed edit}
  }

  /**
   * Record the player changing a block in a loaded chunk
   * @param {number} cx Chunk x coordinate
   * @param {number} cz Chunk z coordinate
   * @param {number} index Block index within the chunk
   * @param {number} id New block id
   * @param {number} currentId Block id before the change
   */
  setBlock(cx, cz, index, id, currentId) {
    const blocks = this._chunks.get(getChunkKey(cx, cz))?.blocks;
    const previous = blocks?.get(index);

    // Without an earlier edit, the current block is the generated one
    const original = previous === undefined ? currentId : this._getOriginal(previous);

    if (id === original) this._delete(cx, cz, index);
    else this._set(cx, cz, index, id, original);
  }

  /**
   * Record an edit read from a save, before the generated block under it is known
   * @param {number} cx Chunk x coordinate
   * @param {number} cz Chunk z coordinate
   * @param {number} index Block index within the chunk
   * @param {number} id Block id
   */
  loadBlock(cx, cz, index, id) {
    this._set(cx, cz, index, id, -1);
  }

  /**
   * Apply a chunk's edits to its freshly generated blocks, remembering the
   * generated block under each edit and dropping edits that match it
   * @param {Chunk} chunk Chunk that has just been generated
   */
  applyTo(chunk) {
    const key = getChunkKey(chunk.x, chunk.z);
    const entry = this._chunks.get(key);
    if (!entry) return;

    for (const [index, packed] of entry.blocks) {
      const id = this._getId(packed);
      const generated = chunk.blocks[index];

      if (id === generated) {
        entry.blocks.delete(index);
        continue;
      }

      entry.blocks.set(index, this._pack(id, generated));
      chunk.blocks[index] = id;
    }

    if (entry.blocks.size === 0) this._chunks.delete(key);
  }

  /**
   * Get every chunk that has edits, for saving
   * @returns {Array<{cx: number, cz: number, blocks: Array<number[]>}>} Each chunk's [index, block id] pairs sorted by index
   */
  getEditedChunks() {
    return [...this._chunks.values()].map(({ cx, cz, blocks }) => ({
      cx: cx,
      cz: cz,
      blocks: [...blocks]
        .map(([index, packed]) => [index, this._getId(packed)])
        .sort((a, b) => a[0] - b[0])
    }));
  }

  /**
   * Get the total number of edited blocks
   * @returns {number} Number of edits
   */
  getCount() {
    let count = 0;
    for (const entry of this._chunks.values()) count += entry.blocks.size;
    return count;
  }

  /**
   * Remove every edit
   */
  clear() {
    this._chunks.clear();
  }

  /**
   * Store an edit
   * @param {number} cx Chunk x coordinate
   * @param {number} cz Chunk z coordinate
   * @param {number} index Block index within the chunk
   * @param {number} id Block id
   * @param {number} original Generated block id, or -1 if unknown
   */
  _set(cx, cz, index, id, original) {
    const key = getChunkKey(cx, cz);
    let entry = this._chunks.get(key);

    if (!entry) {
      entry = { cx: cx, cz: cz, blocks: new Map() };
      this._chunks.set(key, entry);
    }

    entry.blocks.set(index, this._pack(id, original));
  }

  /**
   * Remove an edit, and the chunk's entry once it has none left
   * @param {number} cx Chunk x coordinate
   * @param {number} cz Chunk z coordinate
   * @param {number} index Block index within the chunk
   */
  _delete(cx, cz, index) {
    const key = getChunkKey(cx, cz);
    const entry = this._chunks.get(key);
    if (!entry) return;

    entry.blocks.delete(index);
    if (entry.blocks.size === 0) this._chunks.delete(key);
  }

  /**
   * Pack an edit into one number so each edit is a single map value
   * @param {number} id Block id
   * @param {number} original Generated block id, or -1 if unknown
   * @returns {number} Packed edit
   */
  _pack(id, original) {
    return id | ((original + 1) << 8);
  }

  /**
   * Get the block id of a packed edit
   * @param {number} packed Packed edit
   * @returns {number} Block id
   */
  _getId(packed) {
    return packed & 0xff;
  }

  /**
   * Get the generated block id of a packed edit
   * @param {number} packed Packed edit
   * @returns {number} Generated block id, or -1 if unknown
   */
  _getOriginal(packed) {
    return (packed >> 8) - 1;
  }
}
