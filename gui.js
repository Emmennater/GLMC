
var GuiElements = {};

function initGui() {
    canvas2D = document.getElementById("gui");
    canvas2D.width = window.innerWidth;
    canvas2D.height = window.innerHeight;
    gui = canvas2D.getContext("2d");
    setpixelated(gui);

    gui.fillRect(0, 0, window.innerWidth, window.innerHeight);
    GuiElements.hotbar = new DirImage("assets/hotbar.png");
    // pattern = '#FFFFFF';
    // titleScreenImg = new DirImage("https://cdn.mos.cms.futurecdn.net/52K7sgnQLSJ8ggfyfvz9yB-1200-80.jpg",
    //     ()=>{pattern = gui.createPattern(titleScreenImg.img, "no-repeat");}
    // );

    Components = [];
    Components.push(new GuiComponenet(gui, ()=>"XYZ: "+floor(player.x)+" "+floor(player.y)+" "+floor(player.z)));
    Components.push(new GuiComponenet(gui, ()=>"Chunks: "+data.chunksGenerated));
}

function animateIntro() {
    return;
    if (data.introTime <= 0) return;
    if (!data.introTime) data.introTime = 1.1;
    
    data.introTime -= 0.0075;
    gui.globalAlpha = constrain(data.introTime, 0, 1);
    gui.clearRect(0, 0, window.innerWidth, window.innerHeight);
    gui.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function drawGui() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    
    // Clear screen
    gui.clearRect(0, 0, W, H);
    
    // Debug menu
    for (let i=0; i<Components.length; i++) {
        Components[i].draw(i);
    }

    // Hotbar
    // let sizeX = W * 3/9;
    // let sizeY = GuiElements.hotbar.getHeightWith(sizeX);
    // GuiElements.hotbar.draw(W/2, H-sizeY/2, sizeX, sizeY);

}

class GuiComponenet {
    constructor(gui, txt) {
        this.txt = txt;
    }

    draw(i) {
        // Debug menu
        let xo = 6;
        let gpx = 4;
        let gpy = 2;
        let sz = 16;
        let yo = 4 + i * (sz + 4);
        let txt = this.txt();

        gui.font = sz+"px monospace";
        gui.textAlign = "left";
        gui.textBaseline = "top";

        gui.fillStyle = "#00000070";
        let w = txt.length * sz * 0.56;
        gui.fillRect(xo-gpx, yo-gpy-0.5, w+gpx*2, sz+gpy*2)

        gui.fillStyle = "#FFFFFF";
        gui.fillText(txt, xo, yo);
    }
}
