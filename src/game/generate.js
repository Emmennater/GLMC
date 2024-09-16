function Generate(cx, cz, bx = 0, bz = 0, blocks = null) {

    let mode = data.mode;
    let cxoff = cx * LENGTH;
    let czoff = cz * WIDTH;

    if (blocks == null) {
        blocks = [];

        // Prep Blocks
        for (let x = 0; x < LENGTH; x++) {
            blocks[x] = [];
            for (let z = 0; z < WIDTH; z++) {
                blocks[x][z] = [];
            }
        }
    }

    // Generate terrain
    let y1 = 0;
    for (let x = bx; x < LENGTH; x++) {
        for (let z = bz; z < WIDTH; z++) {
            bz = 0;

            // Lazy chunks
            if (TotalBlockGen > MaxBlockGen) {
                TotalBlockGen = 0;
                LazyChunk = {cx:cx, cz:cz, x:x, z:z, blocks:blocks};
                return;
            }

            let x1 = x + cxoff;
            let z1 = z + czoff;

            // Superflat center
            // if (dist2(0, 0, x1, z1) < 100) {
            //     mode = "superflat";
            // } else {
            //     mode = "normal";
            // }

            if (mode == "superflat") {
                y1 = 5;
            } else
            if (mode == "void") {
                y1 = 1;
            } else {

                // noise terrain
                // y1 = noise.simplex2(x1 / 100, z1 / 100) + 1;
                // y1 += (noise.simplex2(x1 / 50 + 10, z1 / 50 + 10) + 1) ** 2 / 2;
                // y1 += (noise.simplex2(x1 / 20 + 0.4, z1 / 20 + 1.5) + 1) / 12;
                // y1 = floor(y1 * 10);

                // y1 = 20;
                // y1 += (noise.simplex2(x1/50, z1/50)+1) ** 2 * 10;
                // y1 = floor(y1);

                y1 = HEIGHT;

            }

            let depth = 0;
            for (let y = y1; y >= 0; y--) {

                if (mode == "normal") {
                    let result = ChaosHills.generate(x1, y, z1);
                    if (!result) {
                        depth = 0;
                        continue;
                    }
                }
                
                // Resource height map
                let type = depthMap(mode, depth, y, x1, y, z1);
                
                if (!type) {
                    depth = 0;
                    continue;
                }
                
                depth++;

                // Spawning trees
                if (mode == "superflat") {
                    // type = superflatMap(x, y, z, e, r);
                } else if (mode == "normal") {
                    if (type == "grass") {
                        let rnd = rand();
                        const FREQ = 0.01;
                        if (rnd < FREQ/2) spawnTree(x1, y, z1); else
                        if (rnd < 0.01) spawnTree(x1, y, z1, "birch_log", "birch_leaves");
                    }
                }

                // Create block
                blocks[x][z][y] = createBlock(x1, y, z1, type);
                blocks[x][z][y].X = x;
                blocks[x][z][y].Y = y;
                blocks[x][z][y].Z = z;
                TotalBlockGen++;
            }
        }
    }

    data.chunksGenerated++;

    LazyChunk = null;
    return blocks;
}

function depthMap(mode, depth, elev, x, y, z) {

    if (mode == "void") {
        return "void_block";
        // return "smooth_stone";
        // return "black_grid_block";
        // if (y == 40) return "glass";
        // if ((Math.abs(x)+Math.abs(y)+Math.abs(z)) % 3 == 1) return null;
        // else return "glass";
    }

    if (elev < 4) {
        switch (elev) {
            case 0: return "bedrock";
            case 1: if (rand() < 0.75) return "bedrock";
            case 2: if (rand() < 0.5) return "bedrock";
            case 3: if (rand() < 0.25) return "bedrock";
        }
    }

    
    // if (data.superflat) return "stone";
    let stoneElev = 105 + noise.simplex2(x / 15 + 0.2, y / 15 + 0.4) * 3;

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

    return "stone";
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

function biomeBlendGen(heat, moisture, ...Algorithms) {

}

class Biome {
    static generate(x, y, z) {
        return true;
    }
}

class ChaosHills extends Biome {
    static generate(x, y, z) {
        let value = noise.simplex3(x/50, z/50, y/50) - 1;
        value += noise.simplex3(x/25+10, z/25+20, y/25+30) ** 2 - 1;
        value += (y / 20);
        value /= 2;
        return (value <= 0.5);
    }
}
