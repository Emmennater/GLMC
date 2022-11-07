
var GuiElements = {};

function initGui() {
    canvas2D = document.getElementById("gui");
    canvas2D.width = window.innerWidth;
    canvas2D.height = window.innerHeight;
    gui = canvas2D.getContext("2d");
    setpixelated(gui);

    gui.fillRect(0, 0, window.innerWidth, window.innerHeight);
    GuiElements.hand = new DirImage("assets/stevehand.webp");
    GuiElements.vignette = new DirImage("assets/vignette.png");
    // pattern = '#FFFFFF';
    // titleScreenImg = new DirImage("https://cdn.mos.cms.futurecdn.net/52K7sgnQLSJ8ggfyfvz9yB-1200-80.jpg",
    //     ()=>{pattern = gui.createPattern(titleScreenImg.img, "no-repeat");}
    // );

    Components = [];
    Components.push(new GuiComponenet(gui, ()=>"FPS: "+data.fps));
    Components.push(new GuiComponenet(gui, ()=>"XYZ: "+floor(player.x)+" "+floor(player.y)+" "+floor(player.z)));
    Components.push(new GuiComponenet(gui, ()=>"chunks: "+data.chunksGenerated));
    Components.push(new GuiComponenet(gui, ()=>"seed: "+seedPhrase));
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

    // Hand
    let sizeX = 1400 * 3/14;
    let sizeY = GuiElements.hand.getHeightWith(sizeX);

    gui.save();

    let A = player.swing;
    let B = 0.5 - Math.abs(A - 0.5);
    gui.translate(W*0.72, H+B*sizeY/2);
    gui.rotate(-B);

    let xoff = Math.cos(-A*Math.PI*2) * sizeX / 2;
    let yoff = Math.sin(-A*Math.PI*2) * sizeY / 3 + B * sizeY;
    let hmult = 1.2 * (1 + B * 2);

    if (settings.hand == "right" || settings.hand == "both")
        GuiElements.hand.draw(xoff, yoff-sizeY/2, sizeX * 1.2, sizeY * hmult);

    gui.restore();
    gui.save();

    gui.translate(W/2-W*0.22, H+B*sizeY/2);
    gui.rotate(B);
    gui.scale(-1, 1);

    if (settings.hand == "left" || settings.hand == "both")
        GuiElements.hand.draw(xoff, yoff-sizeY/2, sizeX * 1.2, sizeY * hmult);

    // GuiElements.hand.draw(-A * sizeX, -sizeY/2, sizeX * 1.2, sizeY * 1.2 * (1 + A * 1.5));

    gui.restore();

    // Vignette
    GuiElements.vignette.draw(W/2, H/2, W, H);

    // Debug menu
    for (let i=0; i<Components.length; i++) {
        Components[i].draw(i);
    }

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
        let sz = 18;
        let yo = 4 + i * (sz + 4);
        let txt = this.txt();

        gui.font = sz+"px mcfont";
        gui.textAlign = "left";
        gui.textBaseline = "top";

        gui.fillStyle = "#00000070";
        let w = txt.length * sz * 0.6; //0.56;

        const fontSize = sz;
        let text = document.createElement("span");
        document.body.appendChild(text);

        text.style.font = gui.font;
        text.style.fontSize = sz + "px";
        text.style.height = 'auto';
        text.style.width = 'auto';
        text.style.position = 'absolute';
        text.style.whiteSpace = 'no-wrap';
        text.innerHTML = txt;

        w = text.clientWidth;
        
        document.body.removeChild(text);

        gui.fillRect(xo-gpx, yo-gpy-0.5, w+gpx*2, sz+gpy*2)

        gui.fillStyle = "#FFFFFF";
        gui.fillText(txt, xo, yo);
    }
}
