
let pointerLockActivatedAt = -2000;

keys = {};

function mousePress() {
  // if (performance.now() - pointerLockActivatedAt < 2000) {
  //   return;
  // }
  
  lockPointer(TOPCANVAS);
  pointerLockActivatedAt = performance.now();
}

/**
 * Lock the pointer to an element, asking for raw mouse movement without the
 * system's acceleration, which also avoids Chrome's spurious movement spikes
 * @param {HTMLElement} element Element to lock the pointer to
 */
function lockPointer(element) {
  let request = null;
  try {
    request = element.requestPointerLock({ unadjustedMovement: true });
  } catch (error) {
    request = null;
  }

  // Older browsers return nothing, and some platforms can't give raw movement
  request?.catch?.(error => {
    if (error.name === 'NotSupportedError') element.requestPointerLock()?.catch?.(() => {});
  });
}

/*
























*/
