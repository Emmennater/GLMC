class Buffer2D {
    constructor(GL, PROGRAM) {
        this.gl = GL;
        this.program = PROGRAM;
        this.vertices = [];
        this.indices = [];
        this.vertexBuffer = GL.createBuffer();
        this.indexBuffer = GL.createBuffer();
        this.attribCount = 8;
        this.vertexCount = 0;
    }

    loadTexture(src, callback) {
        this.img = createTextures2D(this.gl, this.program, src, callback);
    }

    updateBuffer() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
        this.setAttributes();
    }

    setAttributes() {
        // 2 pos, 2 tex
        var GL = this.gl;
        var PROGRAM = this.program;
        let pos = programInfo2D.vertPosLoc;
        let tex = programInfo2D.texCoordLoc;
        let col = programInfo2D.vertColLoc;
        let atlas = programInfo2D.atlasLoc;
        // var colorAttribLoc = GL.getAttribLocation(program, 'vertColor');

        let vtSize = this.attribCount * Float32Array.BYTES_PER_ELEMENT;
        GL.vertexAttribPointer(pos, 2, GL.FLOAT, GL.FALSE, vtSize, 0);
        GL.vertexAttribPointer(tex, 2, GL.FLOAT, GL.FALSE, vtSize, 2 * Float32Array.BYTES_PER_ELEMENT);
        GL.vertexAttribPointer(col, 3, GL.FLOAT, GL.FALSE, vtSize, 4 * Float32Array.BYTES_PER_ELEMENT);
        GL.vertexAttribPointer(atlas, 1, GL.FLOAT, GL.FALSE, vtSize, 7 * Float32Array.BYTES_PER_ELEMENT);

        GL.enableVertexAttribArray(pos);
        GL.enableVertexAttribArray(tex);
        GL.enableVertexAttribArray(col);
        GL.enableVertexAttribArray(atlas);
    }

    loadVertices(vertices) {
        this.vertices = this.vertices.concat(vertices);

        // Add indices
        let pauseIndex = 0;
        let totalVerts = vertices.length / this.attribCount;
        let offset = 0;
        let indices = [];
        for (let i = 0; i < totalVerts * 1.5; i++) {
            indices[i] = (i + offset) % totalVerts + this.vertexCount;
            if (i % 3 == 2) offset--;
        }

        this.indices = this.indices.concat(indices);
        this.vertexCount += vertices.length / this.attribCount;
    }

    clear() {
        this.vertices = [];
        this.indices = [];
        this.vertexCount = 0;
    }

    render() {
        // Render loop
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.gl.useProgram(this.program);
        this.gl.drawElements(this.gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
    }
}

class TextureQuad {
    constructor(img, atlas) {
        this.pts = [];
        this.txr = [];
        this.tx1 = 0;
        this.tx2 = 0;
        this.ty1 = 0;
        this.ty2 = 0;
        this.img = img;
        this.atlas = atlas;
        this.col = {r:1, g:1, b:1};
    }

    setPoints(x1, y1, x2, y2, x3, y3, x4, y4) {
        this.pts = [{
            x: x1,
            y: y1
        }, {
            x: x2,
            y: y2
        }, {
            x: x3,
            y: y3
        }, {
            x: x4,
            y: y4
        }];
    }

    setPoint(i, x, y) {
        this.pts[i] = {
            x: x,
            y: y
        };
    }

    setRect(x, y, w = this.txr.width, h = this.txr.height) {
        this.x = x;
        this.y = y;
        this.setPoints(x, y, x + w, y, x + w, y + h, x, y + h);
    }

    setWidth(w) {
        let ratio = w / this.txr.width;
        this.w = w;
        this.h = ratio * this.txr.height;
        this.setRect(this.x, this.y, this.w, this.h);
    }

    setHeight(h) {
        let ratio = h / this.txr.height;
        this.w = ratio * this.txr.width;
        this.h = h;
        this.setRect(this.x, this.y, this.w, this.h);
    }

    setColor(r, g, b) {
        this.col = {r:r, g:g, b:b};
    }

    textureCoords(tx1, ty1, tx2, ty2) {
        this.txr.width = tx2 - tx1;
        this.txr.height = ty2 - ty1;

        this.txr[0] = {
            x: tx1,
            y: ty2
        };
        this.txr[1] = {
            x: tx2,
            y: ty2
        };
        this.txr[2] = {
            x: tx2,
            y: ty1
        };
        this.txr[3] = {
            x: tx1,
            y: ty1
        };

        // Normalize
        for (let i = 0; i < 4; i++) {
            this.txr[i].x /= this.img.width;
            this.txr[i].y /= this.img.height;
        }
    }

    getCenter() {
        let sumx = 0;
        let sumy = 0;
        for (let i = 0; i < this.pts.length; i++) {
            sumx += this.pts[i].x;
            sumy += this.pts[i].y;
        }
        return {
            x: sumx / this.pts.length,
            y: sumy / this.pts.length
        };
    }

    getBottomLeft() {
        let minx = Infinity;
        let miny = Infinity;
        for (let i = 0; i < this.pts.length; i++) {
            if (this.pts[i].x < minx)
                minx = this.pts[i].x;
            if (this.pts[i].y < miny)
                miny = this.pts[i].y;
        }
        return {
            x: minx,
            y: miny
        };
    }

    setLoc(x, y) {
        let center = this.getBottomLeft();
        let offx = x - center.x;
        let offy = y - center.y;
        for (let i = 0; i < this.pts.length; i++) {
            this.pts[i].x += offx;
            this.pts[i].y += offy;
        }
    }

    getVertices() {
        // map 0 -> width to -1 -> +1
        // map 0 -> height to -1 -> +1
        let vertices = [];

        for (let i = 0; i < this.pts.length; i++) {
            let x = this.pts[i].x;
            let y = this.pts[i].y;
            x /= window.innerWidth;
            y /= window.innerHeight;
            x = (x * 2) - 1;
            y = (y * 2) - 1;
            vertices.push(
                x, y,
                this.txr[i].x, this.txr[i].y,
                this.col.r, this.col.g, this.col.b,
                this.atlas
            );
        }

        return vertices;
    }

}

class TextureHex {
    constructor(img, atlas) {
        this.img = img;
        this.atlas = atlas;
        this.faces = [];
        this.quads = [
            new TextureQuad(img, atlas),
            new TextureQuad(img, atlas),
            new TextureQuad(img, atlas)
        ];

        this.x = 0;
        this.y = 0;
        this.w = 16;
        this.h = 16;
    }

    setFaceTxr(index, tx1, ty1, tx2, ty2) {
        this.faces[index] = {x1:tx1, y1:ty2, x2:tx2, y2:ty1};
    }

    setLoc(x, y) {
        this.x = x;
        this.y = y;
    }

    setWidth(w) {
        this.w = w;
    }

    setHeight(h) {
        this.h = h;
    }

    update() {
        let x = this.x;
        let y = this.y;
        let w = this.w / 2;
        let h = this.h / 2;

        // Texture Coords
        let f = this.faces[0];
        this.quads[0].textureCoords(f.x1, f.y1, f.x2, f.y2);
        this.quads[0].setPoints(
            x + w * 0, y + h * 1,
            x + w * 1, y + h * 0.5,
            x + w * 0, y + h * 0,
            x + w * -1, y + h * 0.5
            );
        f = this.faces[1];
        this.quads[1].textureCoords(f.x1, f.y1, f.x2, f.y2);
        this.quads[1].setColor(0.8, 0.8, 0.8);
        this.quads[1].setPoints(
            x + w * -1, y + h * 0.5,
            x + w * 0, y + h * 0,
            x + w * 0, y + h * -1,
            x + w * -1, y + h * -0.5
        );
        f = this.faces[2];
        this.quads[2].textureCoords(f.x1, f.y1, f.x2, f.y2);
        this.quads[2].setColor(0.6, 0.6, 0.6);
        this.quads[2].setPoints(
            x + w * 1, y + h * 0.5,
            x + w * 0, y + h * 0,
            x + w * 0, y + h * -1,
            x + w * 1, y + h * -0.5
        );
    }

    getVertices(index = 0) {
        let verts = [];
        verts = this.quads[index].getVertices();;
        return verts;
    }
}

class Texture {
    constructor(url) {
        this.url = url;
        this.img = null;
        this.init();
        // this.loaded = false;
    }

    init() {
        this.texture = gl2d.createTexture();
        gl2d.bindTexture(gl2d.TEXTURE_2D, this.texture);
        gl2d.texParameteri(gl2d.TEXTURE_2D, gl2d.TEXTURE_WRAP_S, gl2d.CLAMP_TO_EDGE);
        gl2d.texParameteri(gl2d.TEXTURE_2D, gl2d.TEXTURE_WRAP_T, gl2d.CLAMP_TO_EDGE);
        gl2d.texParameteri(gl2d.TEXTURE_2D, gl2d.TEXTURE_MIN_FILTER, gl2d.NEAREST);
        gl2d.texParameteri(gl2d.TEXTURE_2D, gl2d.TEXTURE_MAG_FILTER, gl2d.NEAREST);
        gl2d.bindTexture(gl2d.TEXTURE_2D, null);
        return this.texture;
    }

    loadImage(callback) {
        this.img = new Image();
        this.img.alt = "txr2d";
        this.img.crossOrigin = "anonymous";
        this.img.onload = function () {
            callback();
        }
        this.img.src = this.url + "?not-from-cache-please";
    }

    glBind(GL) {
        // if (!this.loaded) return false;
        GL.bindTexture(GL.TEXTURE_2D, this.texture);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, this.img);
        return true;
    }
}