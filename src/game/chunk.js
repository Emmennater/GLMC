class Chunk {
    constructor(x, z) {
        this.x = x;
        this.z = z;
        this.X = this.x * LENGTH;
        this.Z = this.z * WIDTH;
        this.faces = 0;
        this.buffer = new Buffer();
        this.blocks = [];
        this.complete = false;
        this.calculating = false;
    }

    getBlock(x, y, z) {
        return this.blocks[x][y][z];
    }

    setBlock(x, y, z, block, update = false) {
        if (block == null && block == this.blocks[x][z][y]) return;
        this.blocks[x][z][y] = block;
        
        if (!update) return;
        
        saveChange(block, x+this.X, y, z+this.Z);

        CubeHandler.buildCube(block, true, this.buffer);
    }

    updateBlock(block) {
        // Only update if not null (air)
        if (!block) return;

        // Calculate the block
        CubeHandler.buildCube(block, true, this.buffer);
    }

    updateBlocksNearby(x, y, z, bx, by, bz) {
        // Update nearby blocks
        let chunks = [];
        chunks.push(this);
        for (let xo = -1; xo <= 1; xo++) {
            for (let yo = -1; yo <= 1; yo++) {
                for (let zo = -1; zo <= 1; zo++) {
                    if (xo == 0 && yo == 0 && zo == 0) continue;
                    // Get offset position
                    bx = x + xo;
                    by = y + yo;
                    bz = z + zo;

                    // Get chunk and block for that position
                    let chunk2 = getChunk(bx, bz);
                    let coord = getChunkCoord(bx, by, bz);
                    let block = chunk2.blocks[coord.x][coord.z][coord.y];
                    
                    // If the block isnt null (air) update it
                    if (!block) continue;
                    chunk2.updateBlock(block);

                    // Add it to chunks that require updating
                    chunks.push(chunk2);
                }
            }
        }

        // Update the chunks
        for (let i in chunks) {
            if (chunks[i].accounted) continue;
            chunks[i].accounted = true;
            chunks[i].calcVertices(false);
        }
        for (let i in chunks)
            chunks[i].accounted = false;
    }

    render() {
        if (this.buffer == null) return;
        this.buffer.setUsing(gl);
        setupVertexAttribs();
        // gl.vertexAttribPointer(glCache.vertPos, 3, gl.FLOAT, false, 24, 0);
        // gl.vertexAttribPointer(glCache.vertTex, 2, gl.FLOAT, false, 24, 12);
        // gl.vertexAttribPointer(glCache.aShadow, 1, gl.FLOAT, false, 24, 20);
        gl.drawElements(gl.TRIANGLES, 6 * this.faces, gl.UNSIGNED_INT, 0);
        data.renderedChunks++;
    }

    async calcVertices(overwrite = true) {
        // console.log("calcing: ", this.x, this.z);
        // if (this.hasCalculated) console.log("recalc!");
        this.hasCalculated = true;
        this.calculating = true;
        this.buffer.vertices = [];
        this.buffer.indices = [];

        // Generate indices and vertices
        // and add them to the buffer
        // await buildChunk(this, overwrite);
        for (let x = 0; x < LENGTH; x++) {
            if (overwrite) await sleep(VertexWaitTime);
            for (let z = 0; z < WIDTH; z++) {
                for (let y = 0; y < HEIGHT; y++) {
                    let block = this.blocks[x][z][y];
                    CubeHandler.buildCube(block, overwrite, this.buffer);
                }
            }
        }

        // Update buffer after adding verticies / indices
        this.updateBuffer();
        this.complete = true;
    }

    updateBuffer() {
        this.buffer.setAttributes(gl);
        this.faces = this.buffer.indices.length / 6;
    }

}

function generateChunk(x, z) {
    const DELAY = data.chunkDelay;

    // Resume loading chunks
    if (LazyChunk != null) {
        let cx = LazyChunk.cx;
        let cz = LazyChunk.cz;
        let blocks = Generate(cx, cz, LazyChunk.x, LazyChunk.z, LazyChunk.blocks);
        if (LazyChunk == null) {
            let chunk = new Chunk(cx, cz);
            chunk.blocks = blocks;
            Chunks[cx][cz] = chunk;
        }
        return DELAY;
    }

    // Chunk already generated
    if (Chunks[x] && Chunks[x][z] && (Chunks[x][z].complete || Chunks[x][z].calculating)) {
        data.chunkBusy = false;
        return 0;
    }

    // Before Generate Make sure surrounded
    // chunks are generated
    let cx = x,
        cz = z;
    for (let x1=-1; x1<=1; x1++) {
    for (let z1=-1; z1<=1; z1++) {
        if (x1 == 0 && z1 == 0) continue;
        cx = x+x1;
        cz = z+z1;

        if (Chunks[cx] == undefined) {
            Chunks[cx] = {};
        }
        if (Chunks[cx][cz] == undefined) {
            let blocks = Generate(cx, cz);
            if (LazyChunk == null) {
                let chunk = new Chunk(cx, cz);
                chunk.blocks = blocks;
                Chunks[cx][cz] = chunk;
            } else { return DELAY; }
            
            return DELAY; // 10 delay
        }
    }}

    // Build Chunk if not done so already
    if (Chunks[x] == undefined) Chunks[x] = {};
    if (Chunks[x][z] == undefined) {
        let blocks = Generate(x, z);
        if (LazyChunk == null) {
            let chunk = new Chunk(x, z);
            chunk.blocks = blocks;
            Chunks[x][z] = chunk;
        } else { return DELAY; }
    }

    // Loop through queued blocks to see if
    // any blocks need to be added to the array.
    if (BlockQueue[x] != undefined && BlockQueue[x][z] != undefined) {
        if (!Chunks[x][z]) return 0;
        let queue = BlockQueue[x][z];
        let blocks = Chunks[x][z].blocks;
        for (let i = 0; i < queue.length; i++) {
            let block = queue[i];
            let bx = block.x - x * LENGTH;
            let bz = block.z - z * WIDTH;
            if (block.y >= HEIGHT) continue;

            // Check if replacing a block
            if (block.replace.length > 0) {
                let target = blocks[bx][bz][block.y];
                if (target == null) target = "air"; else
                target = target.type;
                if (block.replace.indexOf(target) == -1) continue;
            }

            // Update Block
            let block2 = null;
            if (block.type != null) {
                block2 = createBlock(block.x, block.y, block.z, block.type);
                block2.X = bx;
                block2.Z = bz;
            }

            blocks[bx][bz][block.y] = block2;
        }
        BlockQueue[x][z] = [];
    }

    // Now that the chunk and surrounding chunks are made
    // we can calculate the vertices
    Chunks[x][z].calcVertices();

    data.chunkBusy = false;

    return DELAY;
}

function generateRadius() {
    if (data.waitTime > 0) {
        data.waitTime--;
        data.waitTime = Math.max(data.waitTime, 0);
        return;
    }

    // if (data.chunkBusy) return;
    // else data.waitTime += data.chunkDelay;

    let cx = floor(player.x / LENGTH);
    let cz = floor(player.z / WIDTH);
    let r = data.renderDistance;
    let delay = 0;

    // Sort by distance from player
    let chunksToLoad = [];
    for (let x = -r + cx; x <= r + cx; x++) {
        for (let z = -r + cz; z <= r + cz; z++) {
            chunksToLoad.push([x, z]);
        }
    }

    // Sort them
    chunksToLoad.sort(function (a, b) {
        let acx = a[0] * LENGTH + LENGTH / 2;
        let acz = a[1] * WIDTH + WIDTH / 2;
        let bcx = b[0] * LENGTH + LENGTH / 2;
        let bcz = b[1] * WIDTH + WIDTH / 2;
        let ad = dist2(acx, acz, player.x, player.z);
        let bd = dist2(bcx, bcz, player.x, player.z);
        return ad - bd;
    });

    // Find a chunk to generate
    for (let i in chunksToLoad) {
        let x = chunksToLoad[i][0];
        let z = chunksToLoad[i][1];
        data.chunkBusy = true;
        data.chunkTime = 0;
        delay = generateChunk(x, z);
        // if (data.chunkBusy) return;
        if (delay > 0) {
            data.waitTime += delay;
            if (data.waitTime >= 1)
                return;
        }
    }
}

function renderChunks() {
    data.renderedChunks = 0;
    let cx = floor(player.x / LENGTH);
    let cz = floor(player.z / WIDTH);
    let r = data.renderDistance;
    data.furthestChunk = 0;

    // Find a chunk to generate
    for (let x = -r + cx; x <= r + cx; x++) {
        for (let z = -r + cz; z <= r + cz; z++) {
            if (!Chunks[x] || !Chunks[x][z]) continue;

            let chunk = Chunks[x][z];
            if (chunk && chunk.complete) {
                chunk.render();

                let d = dist2(x, z, cx, cz);
                if (d > data.furthestChunk) {
                    data.furthestChunk = d;
                }
            }
        }
    }
}
