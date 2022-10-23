function Generate(cx, cz, seed) {
    let blocks = [];
    let cxoff = cx * LENGTH;
    let czoff = cz * WIDTH;

    noise.seed(seed);

    // Prep Blocks
    for (let x = 0; x < LENGTH; x++) {
        blocks[x] = [];
        for (let z = 0; z < WIDTH; z++) {
            blocks[x][z] = [];
        }
    }

    // Generate terrain
    let y1 = 0;
    for (let x = 0; x < LENGTH; x++) {
        for (let z = 0; z < WIDTH; z++) {
            let x1 = x + cxoff;
            let z1 = z + czoff;

            if (data.superflat) {
                y1 = 4;
            } else {

                // noise terrain
                y1 = noise.simplex2(x1 / 100, z1 / 100) + 1;
                y1 += (noise.simplex2(x1 / 50 + 10, z1 / 50 + 10) + 1) ** 2 / 2;
                y1 += (noise.simplex2(x1 / 20 + 0.4, z1 / 20 + 1.5) + 1) / 12;
                y1 = floor(y1 * 10);

            }

            for (let y = y1; y >= 0; y--) {
                // Resource height map
                let type = depthMap(y1 - y, y, x1, y1);

                // Spawning trees
                if (data.superflat) {
                    // type = superflatMap(x, y, z, e, r);
                } else {
                    if (type == "grass") {
                        let rnd = rand();
                        if (rnd < 0.005) spawnTree(x1, y1+1, z1); else
                        if (rnd < 0.01) spawnTree(x1, y1+1, z1, "birch_log", "birch_leaves");
                    }
                }

                // Create block
                blocks[x][z][y] = createBlock(x1, y, z1, type);
                blocks[x][z][y].X = x;
                blocks[x][z][y].Y = y;
                blocks[x][z][y].Z = z;
            }
        }
    }

    return blocks;
}

function depthMap(depth, elev, x, y) {

    if (data.superflat) return "stone";

    let stoneElev = 25 + noise.simplex2(x / 15 + 0.2, y / 15 + 0.4) * 3;

    // Grassy
    if (elev < stoneElev) {
        if (depth < 1) return "grass";
        if (depth < 4) return "dirt";
        return "stone";
    }

    // Stone peaks
    if (elev < 50) {
        return "stone";
    }
}

function spawnTree(x, y, z, log = "log", leaves = "leaves") {
    if (y >= HEIGHT) return false;

    // Tree Height
    let h = Math.floor(Math.random() * 3 + 4);

    // Lower Leaves
    for (let x1 = -2; x1 <= 2; x1++) {
        for (let y1 = h - 3; y1 < h - 1; y1++) {
            for (let z1 = -2; z1 <= 2; z1++) {
                pushQueue(leaves, x + x1, y + y1, z + z1, ["air"]);
            }
        }
    }

    // Upper Leaves
    for (let x1 = -1; x1 <= 1; x1++) {
        for (let y1 = -1; y1 < 1; y1++) {
            for (let z1 = -1; z1 <= 1; z1++) {
                if (Math.abs(x1) == (Math.abs(z1)) && y1 > -1 && x1) continue;
                pushQueue(leaves, x + x1, y + y1 + h, z + z1, ["air"]);
            }
        }
    }

    // Trunk
    for (let i = 0; i < h; i++)
        pushQueue(log, x, y + i, z);
    pushQueue("dirt", x, y - 1, z);

    // Success
    return true;
}

function pushQueue(type, x, y, z, replace = []) {
    let cx = floor(x / LENGTH);
    let cz = floor(z / WIDTH);
    if (y >= HEIGHT || y < 0) return false;
    if (BlockQueue[cx] == undefined)
        BlockQueue[cx] = {};
    if (BlockQueue[cx][cz] == undefined)
        BlockQueue[cx][cz] = [];
    let queue = BlockQueue[cx][cz];

    // Add Blocks to the Queue
    queue.push({
        type: type,
        x: x,
        y: y,
        z: z,
        replace: replace
    });
}