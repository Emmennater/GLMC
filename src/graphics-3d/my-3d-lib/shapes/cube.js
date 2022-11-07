
class CubeForm {
    constructor(data) {
        this.data = data;
        this.faces = [
            new FaceForm(),
            new FaceForm(),
            new FaceForm(),
            new FaceForm(),
            new FaceForm(),
            new FaceForm()
        ];
    }

    create() {
        let data = this.data;
        
        // Create vertices
        for (let i=0, f=0; i<CUBE_VERTICES.length; i+=20, f++) {
            // x, y, z, tx, ty
            let face = this.faces[f];

        }

    }

    appendData() {

    }
}


