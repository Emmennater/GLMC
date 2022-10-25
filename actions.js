
let pointerLockActivatedAt = -2000;

keys = {};

function mousePress() {
  if (performance.now() - pointerLockActivatedAt < 2000) {
    return;
  }
  
  canvas2D.requestPointerLock();
  pointerLockActivatedAt = performance.now();
}

/*
























*/
