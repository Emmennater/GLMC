class Chunk {
    constructor(x, z) {
        this.x = x;
        this.z = z;
        this.faces = 0;
        this.buffer = new Buffer();
        this.blocks = [];
        this.complete = false;
    }

    getBlock(x, y, z) {
        return this.blocks[x][y][z];
    }

    setBlock(x, y, z, block, update = false) {
        this.blocks[x][z][y] = block;
        if (!update) return;
        this.calcVertices();
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

    calcVertices() {
        this.buffer.vertices = [];
        this.buffer.indices = [];

        // Generate indices and vertices
        // and add them to the buffer
        for (let x = 0; x < LENGTH; x++) {
            for (let z = 0; z < WIDTH; z++) {
                for (let y = 0; y < HEIGHT; y++) {
                    buildBlock(this.buffer, this.blocks[x][z][y]);
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
    const DELAY = 5;

    // Chunk already generated
    if (Chunks[x] && Chunks[x][z] && Chunks[x][z].complete) {
        return 0;
    }

    // Before Generate Make sure surrounded
    // chunks are generated
    let cx = x,
        cz = z;
    for (let i = 0; i < 4; i++) {
        cx = x;
        cz = z;
        switch (i) {
            case 0:
                cx--;
                break;
            case 1:
                cx++;
                break;
            case 2:
                cz--;
                break;
            case 3:
                cz++;
                break;
        }

        if (Chunks[cx] == undefined) {
            Chunks[cx] = {};
        }
        if (Chunks[cx][cz] == undefined) {
            Chunks[cx][cz] = new Chunk(x, z);
            Chunks[cx][cz].blocks = Generate(cx, cz, seed);
            return DELAY; // 10 delay
        }
    }

    // Build Chunk if not done so already
    if (Chunks[x] == undefined) Chunks[x] = {};
    if (Chunks[x][z] == undefined) {
        Chunks[x][z] = new Chunk(x, z);
        Chunks[x][z].blocks = Generate(x, z, seed);
    }

    // Loop through queued blocks to see if
    // any blocks need to be added to the array.
    if (BlockQueue[x] != undefined && BlockQueue[x][z] != undefined) {
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
            blocks[bx][bz][block.y] = createBlock(block.x, block.y, block.z, block.type);
        }
        BlockQueue[x][z] = [];
    }

    // Now that the chunk and surrounding chunks are made
    // we can calculate the vertices
    Chunks[x][z].calcVertices();

    return DELAY;
}

function generateRadius() {
    if (data.waitTime > 0) {
        data.waitTime--;
        return;
    }

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
        delay += generateChunk(x, z);
        if (delay > 0) {
            data.waitTime = delay;
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

    // Rendering all chunks
    // for (let x in Chunks) {
    //     for (let z in Chunks[x]) {
    //         let chunk = Chunks[x][z];
    //         if (chunk.complete) {
    //             Chunks[x][z].render();
    //         }
    //     }
    // }
}
