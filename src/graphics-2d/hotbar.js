class Hotbar {
    constructor(img) {
        this.slots = [null, null, null, null, null, null, null, null, null];
        this.hexes = [];
        this.img = img;
    }

    setSlot(index, type) {
        if (type == null || type == "air") {
            this.slots[index] = null;
            this.hexes[index] = null;
            return;
        }
        
        this.slots[index] = type;
        let hex = new TextureHex(this.img, 1);
        let coords = getTexture(type);
        let x1 = coords[0] * 16;
        let y1 = coords[1] * 16;
        let x2 = coords[6] * 16;
        let y2 = coords[7] * 16;
        let x3 = coords[2] * 16;
        let y3 = coords[3] * 16;
        hex.setFaceTxr(0, x1+0.01, y1+0.01, x1+16, y1+16);
        hex.setFaceTxr(1, x2+0.01, y2+0.01, x2+16, y2+16);
        hex.setFaceTxr(2, x3+0.01, y3+0.01, x3+16, y3+16);
        this.hexes[index] = hex;
    }

    update() {
        let width = window.innerWidth;
        let height = window.innerHeight;
        let hotbar = Objs.hotbar;
        let boxw = Objs.hotbar.h * 0.91;

        for (let i=0; i<this.hexes.length; i++) {
            if (this.hexes[i] == null) continue;
            this.hexes[i].setLoc(width/2 - hotbar.w/2 + hotbar.h/2 + boxw * i, hotbar.h/2);
            this.hexes[i].setWidth(hotbar.h*0.64 * (1-60/700));
            this.hexes[i].setHeight(hotbar.h*0.64);
            this.hexes[i].update();
        }

        // Render new figure
        // renderAll2D();
    }

    getItem(index) {
        return this.slots[index];
    }
    
    addItem(type) {
        // returns index of new slot or null if none found
        for (let i=0; i<this.slots.length; i++) {
            if (this.slots[i] == null) {
                this.slots[i] = type;
                return i;
            }
        }

        return null;
    }

    loadVerts(buffer) {
        for (let i=0; i<this.hexes.length; i++) {
            if (this.hexes[i] == null) continue;
            buffer.loadVertices(this.hexes[i].getVertices(0));
            buffer.loadVertices(this.hexes[i].getVertices(1));
            buffer.loadVertices(this.hexes[i].getVertices(2));
        }
    }

    findItem(item) {
        // returns null if not found otherwise index
        for (let i=0; i<this.slots.length; i++) {
            if (this.slots[i] == item) return i;
        }

        return null;
    }

}