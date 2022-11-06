function editBlock(x, y, z, type, update = false) {
    let cx = floor(x / LENGTH);
    let cz = floor(z / WIDTH);
    let bx = x - cx * LENGTH;
    let by = y;
    let bz = z - cz * WIDTH;

    if (Chunks[cx] == undefined) return null;
    if (Chunks[cx][cz] == undefined) return null;
    if (y < 0 || y >= HEIGHT) return null;

    let block = null;
    if (type != null) block = createBlock(x, y, z, type);

    Chunks[cx][cz].setBlock(bx, by, bz, block, update);

    // Test surrounding blocks for chunk boarders
    let chunks = [];
    chunks.push(Chunks[cx][cz]);
    for (let xo = -1; xo <= 1; xo++) {
        for (let yo = -1; yo <= 1; yo++) {
            for (let zo = -1; zo <= 1; zo++) {
                if (xo == 0 && yo == 0 && zo == 0) continue;
                bx = x + xo;
                by = y + yo;
                bz = z + zo;

                // Get blocks chunk
                // let cx2 = floor(bx / LENGTH);
                // let cz2 = floor(bz / WIDTH);
                let chunk2 = getChunk(bx, bz);
                let coord = getChunkCoord(bx, by, bz);
                let block = chunk2.blocks[coord.x][coord.z][coord.y];
                if (!block) continue;
                chunk2.updateBlock(block);
                // buildBlock(chunk2, chunk2.blocks[coord.x][coord.z][coord.y], true);
                chunks.push(chunk2);

            }
        }
    }

    for (let i in chunks) {
        if (chunks[i].accounted) continue;
        chunks[i].accounted = true;
        chunks[i].calcVertices(false);
    }
    for (let i in chunks)
        chunks[i].accounted = false;

}

function calcNearby(x, y, z) {
    for (let xo = -1; xo <= 1; xo++) {
        for (let yo = -1; yo <= 1; yo++) {
            for (let zo = -1; zo <= 1; zo++) {
                if (xo == 0 && yo == 0 && zo == 0) continue;
                let block = getBlock(x + xo, y + yo, z + zo);
                let chunk = getChunk(x + xo, z + zo);
                if (!block) continue;
                buildBlock(chunk, block, true);
            }
        }
    }
}

function setBlock(x, y, z, type = null) {

}

function getChunk(x, z) {
    let cx = floor(x / LENGTH);
    let cz = floor(z / WIDTH);

    if (Chunks[cx] == undefined) return null;
    if (Chunks[cx][cz] == undefined) return null;

    return Chunks[cx][cz];
}

function getChunkCoord(x, y, z) {
    let cx = floor(x / LENGTH);
    let cz = floor(z / WIDTH);
    let bx = x - cx * LENGTH;
    let by = y;
    let bz = z - cz * WIDTH;
    return {
        x: bx,
        y: by,
        z: bz
    };
}

function getBlock(x, y, z) {
    let cx = floor(x / LENGTH);
    let cz = floor(z / WIDTH);
    let bx = x - cx * LENGTH;
    let by = y;
    let bz = z - cz * WIDTH;

    if (Chunks[cx] == undefined) return null;
    if (Chunks[cx][cz] == undefined) return null;
    if (y < 0 || y >= HEIGHT) return null;

    return Chunks[cx][cz].blocks[bx][bz][by];
}

function saveChange(block, x, y, z) {
    let type = block;
    if (block != null && typeof block == "object") type = block.type;
    data.blockEdits[x + "," + y + "," + z] = [
        type, x, y, z
    ];
}