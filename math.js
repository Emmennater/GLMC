function getNormal(obj) {
    let MAX = -Infinity;
    for (let i in obj) MAX = Math.abs(obj[i]) > MAX ? Math.abs(obj[i]) : MAX;
    for (let i in obj) obj[i] /= MAX;
    return obj;
}

function vectorTo(x1, y1, x2, y2) {
    return getNormal({
        x: x2 - x1,
        y: y2 - y1
    });
}

function vectorToXY(p1, p2) {
    return getNormal({
        x: p2.x - p1.x,
        y: p2.y - p1.y
    });
}

function vectorToXZ(p1, p2) {
    return getNormal({
        x: p2.x - p1.x,
        z: p2.z - p1.z
    });
}

function vectorToXYZ(p1, p2) {
    return getNormal({
        x: p2.x - p1.x,
        y: p2.y - p1.y,
        z: p2.z - p1.z
    });
}

function vDot(A, B) {
    return A.x * B.x + A.y * B.y;
}

function v3Dot(A, B) {
    return A.x * B.x + A.y * B.y + A.z * B.z;
}

function v2Mag(v) {
    return sqrt(v.x ** 2 + v.y ** 2);
}

function v3Cross(U, V) {
    return {
        x: U.y * V.z - U.z * V.y,
        y: U.z * V.x - U.x * V.z,
        z: U.x * V.y - U.y * V.x,
    };
}

function v3Mult(V, n) {
    return {
        x: V.x * n,
        y: V.y * n,
        z: V.z * n,
    };
}

function v3Add(U, V) {
    return {
        x: U.x + V.x,
        y: U.y + V.y,
        z: U.z + V.z,
    };
}

function v3Neg(V) {
    return {
        x: -V.x,
        y: -V.y,
        z: -V.z,
    };
}

function vAngleBetween(A, B) {
    return Math.acos(vDot(A, B) / (v2Mag(A) * v2Mag(B)));
}

function getPlaneNormalVector(p1, p2, p3) {
    let a = vectorToXYZ(p1, p2);
    let b = vectorToXYZ(p1, p3);
    return v3Cross(a, b);
}

function vectorPlaneIntersect(rayP, rayT, p1, p2, p3) {
    let planeP = p1;
    let rayD = vectorToXYZ(rayP, rayT); // Make sure direction is normalized
    let planeN = getPlaneNormalVector(p1, p2, p3);

    let denom = v3Dot(rayD, planeN);
    if (Math.abs(denom) < 0.0001) return null;
    let d = v3Dot(planeP, v3Neg(planeN));
    let t = -(d + v3Dot(rayP, planeN)) / denom;
    return v3Add(rayP, v3Mult(rayD, t));
}

function boxOverlapBox(a, b) {
    return (
        a.x + a.l / 2 > b.x - b.l / 2 &&
        a.x - a.l / 2 < b.x + b.l / 2 &&
        a.z + a.w / 2 > b.z - b.w / 2 &&
        a.z - a.w / 2 < b.z + b.w / 2 &&
        a.y + a.h / 2 > b.y - b.h / 2 &&
        a.y - a.h / 2 < b.y + b.h / 2
    );
}

function boxOverlapBoxValues(ax, ay, az, al, ah, aw, bx, by, bz, bl, bh, bw) {
    return (
        ax + al / 2 > bx - bl / 2 &&
        ax - al / 2 < bx + bl / 2 &&
        az + aw / 2 > bz - bw / 2 &&
        az - aw / 2 < bz + bw / 2 &&
        ay + ah / 2 > by - bh / 2 &&
        ay - ah / 2 < by + bh / 2
    );
}

function floor(x) {
    return Math.floor(x);
}

function ceil(x) {
    return Math.ceil(x);
}

function constrain(a, b, c) {
    if (a < b) return b;
    if (a > c) return c;
    return a;
}

function lerp(a, b, c) {
    return (1 - c) * a + b * c
}

function bresenhamFloat3D(gx0, gy0, gz0, gx1, gy1, gz1) {
    let plots = [];
    let gx0idx = Math.floor(gx0);
    let gy0idx = Math.floor(gy0);
    let gz0idx = Math.floor(gz0);

    let gx1idx = Math.floor(gx1);
    let gy1idx = Math.floor(gy1);
    let gz1idx = Math.floor(gz1);

    let sx = gx1idx > gx0idx ? 1 : gx1idx < gx0idx ? -1 : 0;
    let sy = gy1idx > gy0idx ? 1 : gy1idx < gy0idx ? -1 : 0;
    let sz = gz1idx > gz0idx ? 1 : gz1idx < gz0idx ? -1 : 0;

    let gx = gx0idx;
    let gy = gy0idx;
    let gz = gz0idx;

    //Planes for each axis that we will next cross
    let gxp = gx0idx + (gx1idx > gx0idx ? 1 : 0);
    let gyp = gy0idx + (gy1idx > gy0idx ? 1 : 0);
    let gzp = gz0idx + (gz1idx > gz0idx ? 1 : 0);

    //Only used for multiplying up the error margins
    let vx = gx1 === gx0 ? 1 : gx1 - gx0;
    let vy = gy1 === gy0 ? 1 : gy1 - gy0;
    let vz = gz1 === gz0 ? 1 : gz1 - gz0;

    //Error is normalized to vx * vy * vz so we only have to multiply up
    let vxvy = vx * vy;
    let vxvz = vx * vz;
    let vyvz = vy * vz;

    //Error from the next plane accumulators, scaled up by vx*vy*vz
    let errx = (gxp - gx0) * vyvz;
    let erry = (gyp - gy0) * vxvz;
    let errz = (gzp - gz0) * vxvy;

    let derrx = sx * vyvz;
    let derry = sy * vxvz;
    let derrz = sz * vxvy;

    // console.log("v",vx,vy,vz);
    // console.log("step",sx,sy,sz);
    let testEscape = 100;
    do {
        plots.push([gx, gy, gz]);

        if (gx === gx1idx && gy === gy1idx && gz === gz1idx) break;

        //Which plane do we cross first?
        var xr = Math.abs(errx);
        var yr = Math.abs(erry);
        var zr = Math.abs(errz);

        // console.log("err",errx,erry,errz);

        if (sx !== 0 && (sy === 0 || xr < yr) && (sz === 0 || xr < zr)) {
            gx += sx;
            errx += derrx;
        } else if (sy !== 0 && (sz === 0 || yr < zr)) {
            gy += sy;
            erry += derry;
        } else if (sz !== 0) {
            gz += sz;
            errz += derrz;
        }
    } while (testEscape-- > 0);
    return plots;
}

function rnd(v, d = 4) {
    return Math.round(v * (10 ** d)) / (10 ** d);
}

function dist(x1, y1, z1, x2, y2, z2) {
    return Math.sqrt(
        (x2 - x1) ** 2 +
        (y2 - y1) ** 2 +
        (z2 - z1) ** 2
    );
}

function dist2(x1, y1, x2, y2) {
    return Math.sqrt(
        (x2 - x1) ** 2 +
        (y2 - y1) ** 2
    );
}

function map(x, a1, a2, b1, b2) {
    return ((x - a1) / a2) * b2 + b1;
}

/*





















*/