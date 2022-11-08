
class Rect {
    constructor(x, y, z, l, h, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.l = l;
        this.h = h;
        this.w = w;
        this.col = {r:1, g:1, b:1, a:1};
        this.vertices = [];
        this.indices = [];
        this.buffer = null;
        this.txr = [368/16, 144/16, 368/16, 144/16, 368/16, 144/16, 368/16, 144/16, 368/16, 144/16, 368/16, 144/16]; // getTexture("glass");
    }

    setColor(r, g, b, a=1) {
        this.col.r = r;
        this.col.g = g;
        this.col.b = b;
        this.col.a = a;
    }

    build(buffer = this.buffer) {
        this.vertices = [];
        this.indices = [];

        if (buffer) {
            this.vertices = buffer.vertices;
            this.indices = buffer.indices;
        }

        const TEXTURE_WIDTH = 384; //256;
        const TEXTURE_HEIGHT = 1520; //944;
        const TXRW = TEXTURE_WIDTH / 16;
        const TXRH = TEXTURE_HEIGHT / 16;
        const TOTAL_SIDES = this.indices.length / 6;
        const TOTAL_VERTS = TOTAL_SIDES * 4;
        let totalVerts = 0;

        // Iterate over all 6 sides
        for (let side=0; side<6; side++) {
    
            let bincol = colToBin(this.col.r/2, this.col.g/2, this.col.b/2);

            // Iterate over vertices
            for (let j=0; j<4; j++) {
                let vstart = 4*5*side + j * 5; // skip 5 attributes
        
                // Calculate texture coordinates
                let U = this.txr[2*side+0];
                let V = this.txr[2*side+1];
                let u = (CUBE_VERTICES[vstart+3] + U) / TXRW;
                let v = (CUBE_VERTICES[vstart+4] + V) / TXRH;

                u = 65/384;
                v = 0;

                // Calculate cx, cy
                let cu = 1 - (j % 3 == 0); // 0, 1, 1, 0
                let cv = 1 - Math.floor(j / 2); // 0, 0, 1, 1

                // Push vertices
                this.vertices.push(
                    CUBE_VERTICES[vstart+0] / 2 * this.l + this.x,
                    CUBE_VERTICES[vstart+1] / 2 * this.h + this.y,
                    CUBE_VERTICES[vstart+2] / 2 * this.w + this.z,
                    u,
                    v,
                    bincol,
                    bincol,
                    bincol,
                    bincol,
                    cu,
                    cv,
                    0
                );
            }
    
            // Iterate over indices
            for (let j=side*6; j<side*6+6; j++) {
                let idx = CUBE_INDICES[j] - side * 4;
                this.indices.push(TOTAL_VERTS + totalVerts + idx);
            }
    
            totalVerts += 4; // next face is 4 vertices away
        }
    }

    createBuffer() {
        this.buffer = new Buffer();
        this.buffer.setUsing(gl);
        this.buffer.setVertices(gl, this.vertices);
        this.buffer.setIndices(gl, this.indices);
        this.buffer.culling = false;
        buffers.push(this.buffer);
    }

    deleteBuffer() {
        // Remove this buffer from the array
        if (this.buffer == null) return;
        let index = buffers.findIndex(e=>e==this.buffer);
        buffers.splice(index, 1);
    }
    
    rebuild() {
        this.build(null);
        this.deleteBuffer();
        this.createBuffer();
    }

}


function createRect(x, y, z, l, w, h, r=1, g=1, b=1, a=1) {
    let newRect = new Rect(x, y, z, l, w, h);
    newRect.setColor(r, g, b, a);
    newRect.build();
    newRect.createBuffer();
    return newRect;
}

function drawRect(x, y, z, l, w, h, r=1, g=1, b=1, a=1) {
    let newRect = new Rect(x, y, z, l, w, h);
    newRect.setColor(r, g, b, a);
    newRect.build(drawBuffer);
}

function renderFog(gl) {
    let dist = (data.furthestChunk / 2) * 16;
    if (dist) data.fogDist = lerp(data.fogDist, dist, 0.1);
    if (!settings.fog) data.fogDist = 1000000;
    gl.uniform3f(glCache.uPos, player.x, player.y, player.z);
    gl.uniform1f(glCache.uDist, data.fogDist);
}
