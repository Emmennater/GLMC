const MIN_BUDGET = 1; // ms, so loading always makes progress
const MAX_BUDGET = 8; // ms, so slow frames don't give loading a large slice of time
const MAX_BUDGET_SHARE = 0.5; // largest share of a frame the budget can take
const BUDGET_GROWTH = 0.1; // ms added after each smooth frame
const BUDGET_BACKOFF = 0.7; // budget multiplier after a slow frame
const SLOW_FRAME = 1.5; // frames this many refresh intervals long count as slow
const REFRESH_WINDOW = 1000; // ms over which the refresh interval is measured
const COST_SMOOTHING = 0.2; // weight of the newest measurement in task cost averages

/**
 * Decides how much chunk work the main thread does each frame. The budget
 * grows while frames keep up with the display and shrinks when they fall
 * behind, so it adapts to the machine and to what else the frame is doing.
 * The average cost of each kind of task decides whether the next one fits.
 */
class FrameBudget {
  /**
   * Create a budget that starts small and adapts from there
   */
  constructor() {
    this._budget = 4; // ms of chunk work per frame
    this._spent = 0; // ms of chunk work done this frame
    this._lastFrame = null; // time the previous frame started
    this._refreshInterval = 1000 / 60; // ms between frames when keeping up with the display
    this._shortestInterval = Infinity; // shortest frame interval in the current window
    this._windowStart = 0;
    this._costs = new Map(); // task name -> average ms
  }

  /**
   * Get the current budget
   * @returns {number} ms of chunk work allowed per frame
   */
  getBudget() {
    return this._budget;
  }

  /**
   * Start a new frame, adapting the budget to how long the last one took
   * @param {number} now Current time in ms
   */
  startFrame(now = performance.now()) {
    if (this._lastFrame != null) this._adapt(now - this._lastFrame, now);

    this._lastFrame = now;
    this._spent = 0;
  }

  /**
   * Check whether a task is expected to fit in what is left of the budget.
   * The first task of a frame always fits, so loading never stalls.
   * @param {string} name Kind of task
   * @returns {boolean} Whether to run the task this frame
   */
  canRun(name) {
    if (this._spent === 0) return true;

    return this._spent + (this._costs.get(name) ?? 0) <= this._budget;
  }

  /**
   * Run a task, counting its time against the budget and learning its cost
   * @param {string} name Kind of task
   * @param {function(): *} task Work to do
   * @returns {*} What the task returns
   */
  run(name, task) {
    const start = performance.now();
    const result = task();
    const time = performance.now() - start;

    const average = this._costs.get(name);
    this._costs.set(name, average == null ? time : average + (time - average) * COST_SMOOTHING);
    this._spent += time;

    return result;
  }

  /**
   * Grow the budget after a smooth frame and shrink it after a slow one
   * @param {number} interval ms since the previous frame
   * @param {number} now Current time in ms
   */
  _adapt(interval, now) {
    // Learn the display's refresh interval from the shortest recent frame
    this._shortestInterval = Math.min(this._shortestInterval, interval);
    if (now - this._windowStart >= REFRESH_WINDOW) {
      this._refreshInterval = this._shortestInterval;
      this._shortestInterval = Infinity;
      this._windowStart = now;
    }

    const slow = interval > this._refreshInterval * SLOW_FRAME;
    const budget = slow ? this._budget * BUDGET_BACKOFF : this._budget + BUDGET_GROWTH;
    const max = constrain(this._refreshInterval * MAX_BUDGET_SHARE, MIN_BUDGET, MAX_BUDGET);
    this._budget = constrain(budget, MIN_BUDGET, max);
  }
}
