
/**
 * Stores 4 vertices
 *    and 6 indices
 * The indices specify
 * which vertices are connected
 */
class FaceForm {
    constructor() {
        this.vertices = [
            new VertexForm(),
            new VertexForm(),
            new VertexForm(),
            new VertexForm()
        ];
    }

    setVertex(index, data) {
        this.vertices[index].setData(data);
    }

    appendData(vtArray, idArray) {
        let idxOffset = idArray * (2/3); // 4 vertices / 6 indices

        // Vertices are straight forward appending
        for (let i=0; i<this.vertices.length; i++) {
            this.vertices[i].appendData(vtArray);
        }

        // Indices are clockwise
        idArray.push
        (idxOffset + 0,
         idxOffset + 1,
         idxOffset + 2,
         idxOffset + 2,
         idxOffset + 3,
         idxOffset + 0);
    }
}









