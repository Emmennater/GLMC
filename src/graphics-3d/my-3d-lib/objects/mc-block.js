
const TEXTURE_WIDTH = 384; //256;
const TEXTURE_HEIGHT = 1520; //944;
const TXRW = TEXTURE_WIDTH / 16;
const TXRH = TEXTURE_HEIGHT / 16;
const BLOCKL = 1, BLOCKW = 1, BLOCKH = 1;

/**
 * Each chunk has a 3D array of cubes
 * Each cube looks like this:
 * [x, y, z, type, data...]
 * 
 * Each cube has a total of 8 vertices
 * Each vertex looks like this:
 * [x, y, z, tx, ty, r, g, b, a, dofog]
 */

class CubeHandler {

    // static VBUFFER = null;
    // static IBUFFER = null;

    static buildCube(block, overwrite, buffer) {
        if (block == null) return;

        // Stop if no sides to display
        if (!overwrite && block.bits == 0) return;

        // Update data
        data.blocksUpdated++;

        // Find visible sides
        if (overwrite) {
            // Reconstruct references
            block.refs = this.createReferences(block);

            // Calculate
            block.bits = CubeVertexHandler.removedCoveredFaces(block);

            // Stop if no sides to display
            if (block.bits == 0) return;
        }

        // Get sizes
        let vertices = buffer.vertices;
        let indices = buffer.indices;
        const TOTAL_SIDES = indices.length / 6;
        const TOTAL_VERTS = TOTAL_SIDES * 4;
        
        // Store info
        let x = block.x;
        let y = block.y;
        let z = block.z;
        let totalVerts = 0;

        // Vertex colors
        let txr = getTexture(block.type);
        let glow = getShadow(block.type);
        let color = [1, 1, 1];
        if (glow == null)
            color = getColor(block.type);
        let COL = [1, 1, 1];

        // Iterate over all 6 sides
        for (let side = 0; side < 6; side++) {
            if (block.bits && !(block.bits & 2 ** side)) continue;

            let colors = [0, 0, 0, 0];
            
            // Calculate shade
            const STRENGTH = 1 / 24;
            let shade = 1 - side * STRENGTH;
            if (glow != null) shade = 1;

            // We need to calculate the color here first now
            for (let vert = 0; vert < 4; vert++) {
                let shadow = calcShadow(block, x, y, z, side, vert, glow);

                // Append vertices
                colors[vert] = colToBin(
                    Math.floor(shade * shadow.r * color[0] * COL[0] * 255 / 2),
                    Math.floor(shade * shadow.g * color[1] * COL[1] * 255 / 2),
                    Math.floor(shade * shadow.b * color[2] * COL[2] * 255 / 2)
                );
            }

            // Iterate over vertices
            for (let vert = 0; vert < 4; vert++) {
                CubeVertexHandler.buildVertex(vertices, x, y, z, side, vert, txr, colors);
            }

            // Append indices
            for (let id = side * 6; id < side * 6 + 6; id++) {
                let idx = CUBE_INDICES[id] - side * 4;
                indices.push(TOTAL_VERTS + totalVerts + idx);
            }
            totalVerts += 4; // next face is 4 vertices away
        }
    }

    static loadCube(vtArray, idArray, block, overwrite) {
        if (block == null) return;

        let cubeData = buildCube(block, overwrite);
        let vtData = cubeData[0];
        let idData = cubeData[1];
    }

    static createReferences(block) {

        let x = block.x;
        let y = block.y;
        let z = block.z;
        let cx2, cz2, bx2, bz2;
        let cx = Math.floor(x / LENGTH);
        let cz = Math.floor(z / WIDTH);
        let bx = x - cx * LENGTH;
        let bz = z - cz * WIDTH;
        let chunk = Chunks[cx];
        if (chunk == null) return [];
        chunk = chunk[cz];
        if (chunk == null) return [];

        // TOP, LEFT, RIGHT, FRONT, BACK, BOTTOM
        let nearby = [chunk.blocks[bx][bz][y+1]];
        nearby.push
        (Chunks[cx2 = Math.floor((x-1)/LENGTH)][cz].blocks[(x-1) - cx2 * LENGTH][bz][y],
         Chunks[cx2 = Math.floor((x+1)/LENGTH)][cz].blocks[(x+1) - cx2 * LENGTH][bz][y],
         Chunks[cx][cz2 = Math.floor((z+1)/WIDTH)].blocks[bx][(z+1) - cz2 * WIDTH][y],
         Chunks[cx][cz2 = Math.floor((z-1)/WIDTH)].blocks[bx][(z-1) - cz2 * WIDTH][y],
         Chunks[cx][cz].blocks[bx][bz][y-1]);
        
        return nearby;
    }

    static bindVertexBuffer(buffer) {
        this.VBUFFER = buffer;
    }

    static bindIndexBuffer(buffer) {
        this.IBUFFER = buffer;
    }

}

/**
 * Used to calculate data specific to each vertex
 * Optimizing this code will be a major time saver
 */

class CubeVertexHandler {
    
    static removedCoveredFaces(block) {
        // References should have been made before this step
        // reset bits
        let bits = 0;

        // Compare neighbors faces
        for (let face=0; face<6; face++) {
            bits += (2 ** face) * (1 - this.compareBlockFaceTypes(block, block.refs[face]));
        }

        return bits;
    }

    static compareBlockFaceTypes(b1, b2) {
        if (!b2) return 0;
        if (!b1.solid && !b2.solid) return 0;
        if (!(b1.transparent ^ b2.transparent)) return 1;
        // if (!b1.transparent && !b2.transparent) return 1;
        return 0;
    }

    static buildVertex(vtArray, x, y, z, side, vert, txr, col) {
        let vstart = 4 * 5 * side + vert * 5; // skip 5 attributes

        // Calculate texture coordinates
        let U = txr[2 * side + 0];
        let V = txr[2 * side + 1];
        let u = (CUBE_VERTICES[vstart + 3] + U) / TXRW;
        let v = (CUBE_VERTICES[vstart + 4] + V) / TXRH;

        // Calculate positon
        let X = CUBE_VERTICES[vstart + 0] / 2 * BLOCKL + x;
        let Y = CUBE_VERTICES[vstart + 1] / 2 * BLOCKW + y;
        let Z = CUBE_VERTICES[vstart + 2] / 2 * BLOCKH + z;

        // Calculate cx, cy
        let cu = 1 - (vert % 3 == 0); // 0, 1, 1, 0
        let cv = 1 - Math.floor(vert / 2); // 0, 0, 1, 1

        // Append vertices [x, y, z, u, v, tl, tr, br, bl, cu, cv, dofog]
        vtArray.push(X, Y, Z, u, v, col[0], col[1], col[2], col[3], cu, cv, 1);
    }

}
