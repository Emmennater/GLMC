
let pointerLockActivatedAt = -2000;

keys = {};

function mousePress() {
  if (performance.now() - pointerLockActivatedAt < 2000) {
    return;
  }
  
  canvas.requestPointerLock();
  pointerLockActivatedAt = performance.now();
}

/*
























*/
