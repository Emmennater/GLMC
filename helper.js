
mouse = {x:0, y:0, movedX:0, movedY:0, focused:false};

function canvasResize(canvas, gl, w = window.innerWidth, h = window.innerHeight) {
  // Resize canvas
  canvas.width = w;
  canvas.height = h;
  gl.viewport(0, 0, w, h);
}

function toConstFormat(string) {
  let newString = string.replaceAll(/[a-z][A-Z]/g, function(e){
    return e[0] + "_" + e[1];
  }).toUpperCase();
  return newString;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

window.addEventListener("mousemove", e => {
  try { if (canvas == undefined) return; } catch (E) { return; }
  pmouse = {x: 0, y: 0};
  if (mouse) pmouse = {x: mouse.x, y: mouse.y};
  mouse = getMousePos(canvas, e);
  mouse.px = pmouse.x;
  mouse.py = pmouse.y;
  mouse.movedX = (mouse.x - mouse.px);
  mouse.movedY = (mouse.y - mouse.py);
});

/*



























*/
