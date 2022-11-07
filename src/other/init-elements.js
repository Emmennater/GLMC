
function initCanvasElements() {
    // Initiliaze Input
  focus = false;
  moveX = 0;
  moveY = 0;
  TOPCANVAS.onclick = function() {
    mousePress();
  }
  
  data.lastSpace = 0;

  // pointer lock event listeners
  // Hook pointer lock state change events for different browsers
  document.addEventListener('pointerlockchange', lockChangeAlert, false);
  document.addEventListener('mozpointerlockchange', lockChangeAlert, false);

  function lockChangeAlert() {
    focus = (document.pointerLockElement === TOPCANVAS ||
    document.mozPointerLockElement === TOPCANVAS);
    if (focus) {
      document.addEventListener("mousemove", canvasLoop, false);
    } else {
      document.removeEventListener("mousemove", canvasLoop, false);
    }
  }
  
  function canvasLoop(e) {
    var movementX = e.movementX || e.mozMovementX || 0;
    var movementY = e.movementY || e.mozMovementY ||  0;
    moveX = movementX;
    moveY = movementY;
  }
  
  document.addEventListener("keydown", function(evt){ 

    let KEY = toConstFormat(evt.key);
    if (KEY == " ") KEY = "SPACE";
    
    if (KEY == "SPACE" && !keys.SPACE) {
      let diff = performance.now() - data.lastSpace;
      if (diff < 300 && !player.grounded) {
        player.flying = !player.flying;
      } 
      data.lastSpace = performance.now();
    }

    if (KEY == "R") {
      console.log(floor(player.x), floor(player.y), floor(player.z));
    }

    if (KEY == "B") {
      player.toggleGamemode();
    }

    if (KEY == "E" || KEY == "T") {
      document.exitPointerLock();
    }

    let index = null;
    // console.log(KEY);
    switch (KEY) {
      case "!": case "1": index = 0; break;
      case "@": case "2": index = 1; break;
      case "#": case "3": index = 2; break;
      case "$": case "4": index = 3; break;
      case "%": case "5": index = 4; break;
      case "^": case "6": index = 5; break;
      case "&": case "7": index = 6; break;
      case "*": case "8": index = 7; break;
      case "(": case "9": index = 8; break;
    }

    if (index != null) {
      player.setHotslot(index);
      resizeGui();
      // updateHotbarSlot(index);
    }
    
    keys[KEY] = true;
  });
  
  document.addEventListener("keyup", function(evt){ 
    data.keybusy = false;
    let KEY = toConstFormat(evt.key);
    if (KEY == " ") KEY = "SPACE";
    keys[KEY] = false;
  });

  window.addEventListener("resize", function(evt){ 
    // 2d canvas
    canvas2D.width = window.innerWidth;
    canvas2D.height = window.innerHeight;
    canvas2d.width = window.innerWidth;
    canvas2d.height = window.innerHeight;
    resizeGui();

    canvasResize(canvas, gl);
    mat4.perspective(matrices.proj, player.FOV, canvas.width/canvas.height, 0.1, 1000.0);
    gl.uniformMatrix4fv(matrices.projUniform, gl.FALSE, matrices.proj);
  });

  window.addEventListener("mousedown", function(evt){
    if (evt.button == 0) {
      player.breakBlock();
    } else if (evt.button == 1) {
      player.pickBlock();
    } else if (evt.button == 2) {
      player.placeBlock();
    }
  });

  window.addEventListener('wheel', (event) => {
    let deltaY = event.deltaY;
    let off = Math.sign(deltaY);
    
    if (player.zooming) {
      let mult = Math.abs(deltaY) / 100 * 1.2;
      if (deltaY < 0) mult = 1 / mult;
      player.ZOOM_FOV *= mult;
      player.ZOOM_FOV = constrain(player.ZOOM_FOV, 0.05, 1);
      return;
    }
    
    let newSlot = (((player.hotslot + off) % 9) + 9) % 9;
    player.setHotslot(newSlot);
    resizeGui();
  });

}
