const TASKS_PER_WORKER = 2; // tasks queued per worker so it has the next one ready

/**
 * Runs chunk tasks on a pool of workers. If workers can't be created, for
 * example when the page is opened from a file, tasks run on the main thread
 * one at a time through runInline instead.
 */
class ChunkWorkerPool {
  /**
   * Create the workers
   * @param {string} scriptUrl Worker script
   * @param {number} size Number of workers
   */
  constructor(scriptUrl, size) {
    this._workers = []; // {worker, tasks: number of tasks sent and not finished}
    this._callbacks = new Map(); // task id -> {task, onDone, slot}
    this._inlineQueue = []; // {task, onDone} waiting to run on the main thread
    this._nextId = 0;

    try {
      for (let i = 0; i < size; i++) this._workers.push(this._createWorker(scriptUrl));
    } catch (error) {
      console.warn('Chunk workers are unavailable, so chunks will load on the main thread', error);
      this._workers = [];
    }
  }

  /**
   * Get the number of workers running
   * @returns {number} Worker count
   */
  getWorkerCount() {
    return this._workers.length;
  }

  /**
   * Check whether another task can be submitted without waiting in a queue
   * @returns {boolean} Whether there is room for a task
   */
  hasCapacity() {
    if (this._workers.length === 0) return this._inlineQueue.length === 0;

    return this._workers.some(slot => slot.tasks < TASKS_PER_WORKER);
  }

  /**
   * Check whether a task is waiting to run on the main thread
   * @returns {boolean} Whether runInline has work to do
   */
  hasInlineTask() {
    return this._inlineQueue.length > 0;
  }

  /**
   * Start a task. The task is copied to the worker rather than transferred,
   * so it can be retried elsewhere if the worker fails.
   * @param {Object} task Task for runChunkTask
   * @param {function(string|null, Object)} onDone Called with an error or the result
   */
  submit(task, onDone) {
    const slot = this._getLeastBusyWorker();
    if (slot == null) {
      this._inlineQueue.push({ task: task, onDone: onDone });
      return;
    }

    const id = this._nextId++;
    this._callbacks.set(id, { task: task, onDone: onDone, slot: slot });
    slot.tasks++;
    slot.worker.postMessage({ id: id, task: task });
  }

  /**
   * Run the next task waiting for the main thread
   */
  runInline() {
    const { task, onDone } = this._inlineQueue.shift();

    try {
      onDone(null, runChunkTask(task).result);
    } catch (error) {
      onDone(error.stack ?? String(error), null);
    }
  }

  /**
   * Create a worker and route its results to the tasks' callbacks
   * @param {string} scriptUrl Worker script
   * @returns {Object} Worker slot
   */
  _createWorker(scriptUrl) {
    const slot = { worker: new Worker(scriptUrl), tasks: 0 };

    slot.worker.onmessage = event => {
      const { id, result, error } = event.data;
      const callback = this._callbacks.get(id);
      this._callbacks.delete(id);
      slot.tasks--;
      callback.onDone(error ?? null, result);
    };

    // The script failed to load, so stop using this worker and run its tasks elsewhere
    slot.worker.onerror = event => {
      console.warn('A chunk worker failed, so its tasks will run elsewhere', event.message);
      this._workers = this._workers.filter(other => other !== slot);
      slot.worker.terminate();

      for (const [id, callback] of this._callbacks) {
        if (callback.slot !== slot) continue;
        this._callbacks.delete(id);
        this.submit(callback.task, callback.onDone);
      }
    };

    return slot;
  }

  /**
   * Get the worker with the fewest tasks that has room for another
   * @returns {Object|null} Worker slot, or null if none has room
   */
  _getLeastBusyWorker() {
    let best = null;
    for (const slot of this._workers)
      if (slot.tasks < TASKS_PER_WORKER && (best == null || slot.tasks < best.tasks)) best = slot;

    return best;
  }
}
