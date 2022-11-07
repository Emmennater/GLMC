
class Player {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.l = 0.6;
    this.h = 1.8;
    this.w = 0.6;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;

    this.width = this.w;
    this.height = this.h;
    this.sightHeight = 1.7;
    this.yRot = 0;
    this.xRot = 0;
    this.zRot = 0;
    this.ZOOM_FOV = 0.3;
    this.FOV = 90;
    this.DYNAMIC_FOV = this.FOV;
    this.viewVector = [0, 0, 0];
    
    this.sensitivity = 20;
    this.reach = 4;
    this.terminalVel = 79 / 60;
    this.gravity = 0.5 / 60;
    this.jumpSpeed = 8 / 60;
    this.xSpeed = 4.317 / 60;// 4.317 / 60;
    this.ySpeed = 6 / 60; // 4.317 / 60;

    this.flying = false;
    this.sprinting = false;
    this.zooming = false;
    this.gamemode = "creative";

    this.pgamemode = this.gamemode;
    this.pgrounded = false;
    this.pjumped = false;
    this.hovered = null;
    this.hoveredSide = null;
    this.hotslot = 0;
    this.itemSelected = "smooth_stone";

    // Animations
    this.swing = 0.0;
    this.hitAnimation = 0;
  }
  
  look() {
    // Mouse
    if (focus) {
      this.xRot += moveX * this.sensitivity * 0.2 / canvas.width;
      this.yRot += moveY * this.sensitivity * 0.2 / canvas.height;
    }
    
    this.yRot = Math.min(Math.max(this.yRot, -Math.PI/2), Math.PI/2);
    this.xRot = (this.xRot * 100) / 100;
    this.yRot = (this.yRot * 100) / 100;
    
    this.viewVector = [
      Math.cos(this.xRot),
      Math.sin(this.xRot),
      0
    ];
  }

  move() {

    // Soft lock in unloaded chunk
    let cx = Math.floor(this.x / LENGTH);
    let cz = Math.floor(this.z / WIDTH);
    if (!Chunks[cx] || !Chunks[cx][cz]) return;

    let movex = 0;
    let movey = 0;
    let movez = 0;
    let mult = 1;
    let grounded = this.y == this.yMin;
    let jumped = false;
    // let DELTAT = (data.dt * 1 / (1000/60));
    let DELTAT = 60/(1/data.dt);

    if (this.gamemode == "spectator") this.flying = true;

    if (keys.W) {
      let bonus = this.sprinting ? 1.3 : 1;
      movex += -Math.cos(this.xRot + Math.PI/2) * bonus;
      movez += -Math.sin(this.xRot + Math.PI/2) * bonus;
    }
    if (keys.S) {
      movex += Math.cos(this.xRot + Math.PI/2);
      movez += Math.sin(this.xRot + Math.PI/2);
    }
    if (keys.A) {
      if (movex || movez) mult = 3 / 4;
      movex += -Math.cos(this.xRot);
      movez += -Math.sin(this.xRot);
    }
    if (keys.D) {
      if (movex || movez) mult = 3 / 4;
      movex += Math.cos(this.xRot);
      movez += Math.sin(this.xRot);
    }

    if (this.flying) {
      if (keys.SHIFT) {
        movey += -1;
      }
      if (keys.SPACE) {
        movey += 1;
      }
    } else {
      if (keys.SPACE && (grounded || (this.pgrounded && !this.pjumped))) {
        jumped = true;
        this.vy = this.jumpSpeed;
        movex *= this.sprinting ? 1.3 : 1.1;
        movez *= this.sprinting ? 1.3 : 1.1;
      }
      if (keys.SHIFT) {
        this.sprinting = true;
      } else { this.sprinting = false; }
    }

    // Opti-zoom
    this.zooming = (keys.C || keys.X || keys.Z);
    if (!this.zooming) this.ZOOM_FOV = 0.3;

    // Dyanmic FOV
    let targetFOV = this.FOV;
    if (this.zooming) {
      targetFOV *= this.ZOOM_FOV;
    }
    if (keys.SHIFT && keys.W) {
      targetFOV *= 1.1;
    }

    this.DYNAMIC_FOV = lerp(this.DYNAMIC_FOV, targetFOV * Math.PI/180, 0.25);

    // Diagonal Multiplier
    if (!this.flying) {
      movex *= mult;
      movez *= mult;
    } else {
      movex *= 2.5;
      movez *= 2.5;
    }

    // Gravity
    if (this.y != this.yMin && !this.flying) {
      this.vy -= this.gravity * Math.min((this.terminalVel - this.vy) / this.terminalVel, 1) * DELTAT;
    }

    // Accelerate
    let drag = this.y != this.yMin ? 0.05 : 0.5;
    this.vx = lerp(this.vx, movex*this.xSpeed, drag);
    this.vz = lerp(this.vz, movez*this.xSpeed, drag);

    if (this.flying) {
      this.vy = lerp(this.vy, movey*this.ySpeed, 0.75);
      if (this.y == this.yMin) this.flying = !this.flying;
    }

    // Apply Velocity
    this.collide();
    this.x += this.vx * DELTAT;
    this.y += this.vy * DELTAT;
    this.z += this.vz * DELTAT;
    
    // Collide
    if (this.gamemode != "spectator") {
      if (this.x < this.xMin) { this.x = this.xMin; this.vx = 0; }
      if (this.x > this.xMax) { this.x = this.xMax; this.vx = 0; }
      if (this.y < this.yMin) { this.y = this.yMin; this.vy = 0; }
      if (this.y > this.yMax) { this.y = this.yMax; this.vy = 0; }
      if (this.z < this.zMin) { this.z = this.zMin; this.vz = 0; }
      if (this.z > this.zMax) { this.z = this.zMax; this.vz = 0; }
    }

    this.pgrounded = grounded;
    this.pjumped = jumped;
    
    this.animate();
  }

  collide() {

    // Use velocity to find the blocks I will cross
    // paths with to tell if I will collide with them.
    // Compute the slope and see if its within the plane of the block.
    
    const give = 0.1;
    let pX = this.x+0.5;
    let pY = this.y;
    let pZ = this.z+0.5;
    this.xMin = pX+-20; let xMin2 = this.xMin;
    this.xMax = pX+20; let xMax2 = this.xMax;
    this.yMin = -10; let yMin2 = this.yMin;
    this.yMax = HEIGHT+20; let yMax2 = this.yMax;
    this.zMin = pZ+-20; let zMin2 = this.zMin;
    this.zMax = pZ+20; let zMax2 = this.zMax;
    let blockSize = 1;
    let block, newMin = null;
    let result = false;
    let pinside = this.inside;
    this.inside = false;

    if (this.gamemode != "spectator") {
      // If overlap stop
      let PX = pX;
      let PY = pY;
      let PZ = pZ;
      let D = 0.001;
      for (let x=floor(PX-this.width/2); x<ceil(PX+this.width/2); x++) {
        for (let y=floor(PY); y<ceil(PY+this.height); y++) {
          for (let z=floor(PZ-this.width/2); z<ceil(PZ+this.width/2); z++) {
            block = getBlock(x, y, z);
            // drawRect(x, y, z, 1, 1, 1, 1, 0, 0, 0.5);
            if (!block) continue;
            let X = x + 0.5;
            let Z = z + 0.5;
            let diffx = (PX - X);
            let diffz = (PZ - Z);
            if (Math.abs(diffx) > Math.abs(diffz)) {
              this.vx = 0;
              let tox = this.x;
              if (diffx > 0) {
                tox = blockSize/2 + this.w/2 + 0.001;
              } else {
                tox = -blockSize/2 - this.w/2 - 0.001;
              }
              this.x += tox * give;
            } else {
              this.vz = 0;
              let toz = this.z;
              if (diffz > 0) {
                toz = blockSize/2 + this.w/2 + 0.001;
              } else {
                toz = -blockSize/2 - this.w/2 - 0.001;
              }
              this.z += toz * give;
            }

            this.inside = true;

            // let diffy = ((PY + this.height/2) - y);
            // diffx -= diffx * Math.sign(diffx) * (this.w/2);
            // diffz -= diffz * Math.sign(diffz) * (this.w/2);
            // diffy -= diffy * Math.sign(diffy) * (this.h/2 + 0.5);
            // if (boxOverlapBox(this, block)) {
            // }
          }
        }
      }
    }

    // X Movement
    // let xvel = ceil(abs(this.vx)) * Math.sign(this.vx);
    for (let x=floor(pX-this.width/2-1); x>=ceil(pX)-16; x--) {
      for (let y=floor(pY); y<ceil(pY+this.height); y++) {
        for (let z=floor(pZ-this.width/2); z<ceil(pZ+this.width/2); z++) {
          block = getBlock(x, y, z);
          if (!block) continue;
          if (block.type != "air") {
            newMin = block.x + blockSize/2 + this.width / 2 + 0.001;
            if (newMin > xMin2) {
              xMin2 = newMin;
            }
            // drawRect(x, y, z, 1, 1, 1, 0, 1, 0, 0.5);
          }
        }
      }
      if (newMin != null) break;
    }
    
    // X2 Movement
    let newMax = null;
    for (let x=ceil(pX+this.width/2); x<=floor(pX)+16; x++) {
      for (let y=floor(pY); y<ceil(pY+this.height); y++) {
        for (let z=floor(pZ-this.width/2); z<ceil(pZ+this.width/2); z++) {
          block = getBlock(x, y, z);
          if (!block) continue;
          if (block.type != "air") {
            newMax = block.x - blockSize/2 - this.width / 2 - 0.001;
            if (newMax < xMax2) {
              xMax2 = newMax;
            }
            // drawRect(x, y, z, 1, 1, 1, 0, 1, 0, 0.5);
          }
        }
      }
      if (newMax != null) break;
    }
    
    // Z Movement
    newMin = null;
    // let zvel = ceil(abs(this.vz)) * Math.sign(this.vz);
    for (let z=floor(pZ-this.width/2-0.99); z>=ceil(pZ)-16; z--) {
      for (let y=floor(pY); y<ceil(pY+this.height); y++) {
        for (let x=floor(pX-this.width/2); x<ceil(pX+this.width/2); x++) {
          block = getBlock(x, y, z);
          if (!block) continue;
          if (block.type != "air") {
            newMin = block.z + blockSize/2 + this.width / 2 + 0.001;
            if (newMin > zMin2) {
              zMin2 = newMin;
            }
            // drawBlock(x, y, z);
          }
        }
      }
      if (newMin != null) break;
    }
    
    // Z2 Movement
    newMax = null;
    for (let z=ceil(pZ+this.width/2-0.01); z<=floor(pZ)+16; z++) {
      for (let y=floor(pY); y<ceil(pY+this.height); y++) {
        for (let x=floor(pX-this.width/2); x<ceil(pX+this.width/2); x++) {
          block = getBlock(x, y, z);
          if (!block) continue;
          if (block.type != "air") {
            newMax = block.z - blockSize/2 - this.width / 2 - 0.001;
            if (newMax < zMax2) {
              zMax2 = newMax;
            }
            // drawBlock(x, y, z);
          }
        }
      }
      if (newMax != null) break;
    }
    
    // Y Movement
    newMin = null;
    for (let y=floor(pY-1); y>=0; y--) {
      for (let x=floor(pX-this.width/2); x<ceil(pX+this.width/2); x++) {
        for (let z=floor(pZ-this.width/2); z<ceil(pZ+this.width/2); z++) {
          block = getBlock(x, y, z);
          if (!block) continue;
          if (block.type != "air") {
            newMin = block.y + blockSize;
            if (newMin > yMin2) {
              yMin2 = newMin;
            }
            // drawBlock(x, y, z);
          }
        }
      }
      if (newMin != null) break;
    }
    
    // Y2 Movement
    newMax = null;
    for (let y=ceil(pY+this.height); y<HEIGHT; y++) {
      for (let x=floor(pX-this.width/2); x<ceil(pX+this.width/2); x++) {
        for (let z=floor(pZ-this.width/2); z<ceil(pZ+this.width/2); z++) {
          block = getBlock(x, y, z);
          if (!block) continue;
          if (block.type != "air") {
            newMax = block.y - this.height - 0.001;
            if (newMax < yMax2) {
              yMax2 = newMax;
            }
            // drawBlock(x, y, z);
          }
        }
      }
      if (newMax != null) break;
    }
    
    this.xMin = xMin2;
    this.zMin = zMin2;
    this.yMin = yMin2;
    this.xMax = xMax2;
    this.yMax = yMax2;
    this.zMax = zMax2;

    let MARKER = {};
    MARKER.x = (this.xMax + this.xMin) / 2;
    MARKER.y = (this.yMax + this.yMin) / 2;
    MARKER.z = (this.zMax + this.zMin) / 2;
    MARKER.l = this.xMax - this.xMin;
    MARKER.w = this.zMax - this.zMin;
    MARKER.h = this.yMax - this.yMin;
    // MARKER.rebuild();
    // drawRect(MARKER.x,MARKER.y,MARKER.z,MARKER.l,MARKER.h,MARKER.w,1,1,1,0.3);

    return result;
  }

  use() {
    if (!focus) return;

    // When there are blocks that dont take up the
    // whole area I can use this to determine the blocks
    // I need to check with more accurate intersections...
    
    let x0 = this.x + 0.5;
    let y0 = this.y + this.sightHeight - 0.2;
    let z0 = this.z + 0.5;
    
    let xoff = 0, yoff = 0, zoff = 0;
    yoff = Math.sin(-this.yRot) * this.reach;
    xoff = Math.cos(this.xRot - Math.PI/2) * this.reach * Math.abs(Math.cos(this.yRot));
    zoff = Math.sin(this.xRot - Math.PI/2) * this.reach * Math.abs(Math.cos(this.yRot));
    
    xoff = rnd(xoff);
    yoff = rnd(yoff);
    zoff = rnd(zoff);

    let x1 = x0 + xoff;
    let y1 = y0 + yoff;
    let z1 = z0 + zoff;
    
    // drawRect(x1, y1, z1, 1, 1, 1, 1, 0, 1, 1);

    let blocks = [];
    blocks = bresenhamFloat3D(x0, y0, z0, x1, y1, z1);

    this.hovered = null;
    this.hoveredSide = null;
    
    for (let i=0; i<blocks.length; i++) {
      let x = blocks[i][0];
      let y = blocks[i][1];
      let z = blocks[i][2];
      // drawRect(x, y, z, 1, 1, 1, 0, 1, 0, 0.5);
      let block = getBlock(x, y, z);
      if (block != null) {
        if (block.type != "air") {
          drawRect(x, y, z, 1.001, 1.001, 1.001, 0, 0, 0, 0.1);
          this.hovered = {x:x, y:y, z:z, block:block};
          break;
        }
      }
      this.hoveredSide = {x:x, y:y, z:z, block:block};
    }
  }

  hit() {
    if (this.swing < 0.7 && this.swing > 0) return;
    this.hitAnimation = 1.1;
    if (this.swing > 0.3)
    this.swing = 0.3;
  }

  animate() {
    // let DELTAT = (data.dt * (1 / 16));
    let DELTAT = 60/(1/data.dt);
    this.swing += Math.sign(this.hitAnimation) * 0.09 * DELTAT;
    if (this.swing >= 1) {
      this.swing = 0;
      this.hitAnimation = 0;
    }
    
    // if (this.swing >= 0.5) this.hitAnimation = -1;
    // this.swing = constrain(this.swing, 0, 1);
  }

  breakBlock() {
    if (!focus) return;

    this.hit();

    if (!this.hovered) return;

    editBlock(this.hovered.x, this.hovered.y, this.hovered.z, null, true);
  }

  placeBlock() {
    if (!focus) return;
    if (this.itemSelected == null) return;
    if (!this.hoveredSide || !this.hovered) return;

    // let placing = createBlock(this.itemSelected);

    if (boxOverlapBoxValues(
      this.x, this.y + this.h/2 - 0.5, this.z,
      this.l, this.h - 0.001, this.w,
      this.hoveredSide.x,
      this.hoveredSide.y,
      this.hoveredSide.z,
      1,
      1,
      1
    )) return;

    this.hit();
    editBlock(this.hoveredSide.x, this.hoveredSide.y, this.hoveredSide.z, this.itemSelected, true);
  }

  pickBlock() {
    // if (!focus) return;
    if (this.hovered == null) return;
    let cube = getBlock(this.hovered.x, this.hovered.y, this.hovered.z);
    if (cube == null) return;
    this.setHolding(cube.type);

    
    // Look for item in hotbar
    let hotbar = Objs.hotslots;
    
    if (hotbar.getItem(this.hotslot) == cube.type)
      return;
    
    let index = hotbar.findItem(cube.type);
    if (index != null) {
      this.setHotslot(index);
    } else {
      let foundIndex = null;

      // If selecting occupied slot find a new slot
      let occupied = hotbar.getItem(this.hotslot) != null;
      if (occupied) {
        foundIndex = hotbar.addItem(cube.type);
      }

      if (foundIndex != null) {
        // If new slot found set that slot to new type
        hotbar.setSlot(foundIndex, cube.type);
        this.setHotslot(foundIndex);
      } else {
        hotbar.setSlot(this.hotslot, cube.type);
      }
    }

    resizeGui();
  }

  dropBlock() {
    this.setHolding(null);
    hotbar.setSlot(this.hotslot, null);
    hotbar.update();
  }

  toggleGamemode() {
    if (this.gamemode == "spectator") {
      let aux = this.gamemode;
      this.gamemode = this.pgamemode;
      this.pgamemode = aux;
    } else {
      this.pgamemode = this.gamemode;
      this.gamemode = "spectator";
    }
    console.log(this.gamemode);
  }

  setHotslot(n) {
    this.hotslot = n;
    let hotbar = Objs.hotslots;
    this.setHolding(hotbar.getItem(n));
  }

  setItemInHotbar(index, type) {
    let hotbar = Objs.hotslots;
    hotbar.setSlot(index, type);
    hotbar.update();
    updateHotbarSlot(index);
  }

  setHolding(item) {
    this.itemSelected = item;

    // Update item box
    if (item == null) itemBox.value = "";
    else itemBox.value = item;
  }

}

/*
























*/
