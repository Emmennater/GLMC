
class VertexForm {
    constructor() {
        // [x, y, z, tx, ty, r, g, b]
        // this.data = data;
    }

    setData(data) {
        this.data = data;
    }

    appendData(vtArray) {
        // Fast way to concat two arrays
        vtArray = [].concat.apply([], [vtArray, this.data]);
    }
}
