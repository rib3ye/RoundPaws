window.Game = window.Game || {};

Game.Sprites = (function () {
    var cache = {};

    function createCanvas(w, h) {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    function px(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
    }

    function rect(ctx, x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    }

    // Round Paws — 16x16, facing right
    function drawCat(ctx, frame) {
        var f = frame || 0;
        // Body
        rect(ctx, 4, 4, 8, 8, '#222');
        // White triangle mouth area
        rect(ctx, 6, 7, 4, 1, '#fff');
        rect(ctx, 7, 8, 2, 1, '#fff');
        // Nose
        px(ctx, 7, 7, '#f99');
        px(ctx, 8, 7, '#f99');
        // Eyes - green
        rect(ctx, 5, 5, 2, 2, '#4f4');
        rect(ctx, 9, 5, 2, 2, '#4f4');
        // Pupils
        px(ctx, 6, 5, '#0a0');
        px(ctx, 10, 5, '#0a0');
        // Ears
        px(ctx, 4, 3, '#222');
        px(ctx, 5, 2, '#222');
        px(ctx, 5, 3, '#222');
        px(ctx, 11, 3, '#222');
        px(ctx, 10, 2, '#222');
        px(ctx, 10, 3, '#222');
        // Inner ears
        px(ctx, 5, 3, '#a0407a');
        px(ctx, 10, 3, '#a0407a');
        // Legs - animate
        if (f % 2 === 0) {
            rect(ctx, 5, 12, 2, 2, '#222');
            rect(ctx, 9, 12, 2, 2, '#222');
        } else {
            rect(ctx, 4, 12, 2, 2, '#222');
            rect(ctx, 10, 12, 2, 2, '#222');
        }
        // Tail
        px(ctx, 12, 6, '#222');
        px(ctx, 13, 5, '#222');
        px(ctx, 13, 4, '#222');
    }

    // Happy cat for title screen — 32x32
    function drawHappyCat(ctx) {
        // Larger body
        rect(ctx, 8, 8, 16, 14, '#222');
        // White triangle
        rect(ctx, 12, 14, 8, 2, '#fff');
        rect(ctx, 13, 16, 6, 2, '#fff');
        rect(ctx, 14, 18, 4, 1, '#fff');
        // Nose
        rect(ctx, 15, 14, 2, 1, '#f99');
        // Happy eyes (^_^) — arcs as pixels
        px(ctx, 11, 11, '#4f4');
        px(ctx, 12, 10, '#4f4');
        px(ctx, 13, 11, '#4f4');
        px(ctx, 19, 11, '#4f4');
        px(ctx, 20, 10, '#4f4');
        px(ctx, 21, 11, '#4f4');
        // Ears
        rect(ctx, 8, 5, 2, 3, '#222');
        px(ctx, 9, 4, '#222');
        px(ctx, 10, 5, '#222');
        rect(ctx, 22, 5, 2, 3, '#222');
        px(ctx, 23, 4, '#222');
        px(ctx, 22, 5, '#222');
        // Inner ears
        px(ctx, 9, 6, '#a0407a');
        px(ctx, 22, 6, '#a0407a');
        // Paws
        rect(ctx, 10, 22, 4, 3, '#222');
        rect(ctx, 18, 22, 4, 3, '#222');
        // Tail up (happy!)
        px(ctx, 24, 12, '#222');
        px(ctx, 25, 11, '#222');
        px(ctx, 26, 10, '#222');
        px(ctx, 26, 9, '#222');
        px(ctx, 25, 8, '#222');
        // Mouth smile
        px(ctx, 14, 19, '#f99');
        px(ctx, 15, 20, '#f99');
        px(ctx, 16, 20, '#f99');
        px(ctx, 17, 19, '#f99');
    }

    // Sleeping cat for ending — 32x16
    function drawSleepingCat(ctx, frame) {
        var f = frame || 0;
        rect(ctx, 6, 4, 20, 10, '#222');
        rect(ctx, 4, 6, 24, 6, '#222');
        rect(ctx, 2, 4, 8, 8, '#222');
        rect(ctx, 3, 7, 4, 1, '#fff');
        rect(ctx, 4, 8, 2, 1, '#fff');
        rect(ctx, 3, 5, 3, 1, '#4f4');
        rect(ctx, 7, 5, 3, 1, '#4f4');
        px(ctx, 2, 3, '#222');
        px(ctx, 3, 2, '#222');
        px(ctx, 8, 3, '#222');
        px(ctx, 9, 2, '#222');
        px(ctx, 26, 6, '#222');
        px(ctx, 27, 5, '#222');
        px(ctx, 28, 5, '#222');
        px(ctx, 29, 6, '#222');
        if (f % 3 === 1) {
            rect(ctx, 12, 1, 1, 1, '#88f');
        } else if (f % 3 === 2) {
            rect(ctx, 12, 1, 1, 1, '#88f');
            rect(ctx, 14, 0, 1, 1, '#66d');
        }
    }

    // Crab — 16x12
    function drawCrab(ctx, frame) {
        var f = frame || 0;
        rect(ctx, 3, 4, 10, 6, '#e44');
        rect(ctx, 4, 3, 8, 1, '#e44');
        rect(ctx, 4, 1, 2, 3, '#e44');
        rect(ctx, 10, 1, 2, 3, '#e44');
        px(ctx, 4, 1, '#111');
        px(ctx, 5, 1, '#111');
        px(ctx, 10, 1, '#111');
        px(ctx, 11, 1, '#111');
        if (f % 2 === 0) {
            rect(ctx, 0, 4, 3, 3, '#e44');
            rect(ctx, 13, 4, 3, 3, '#e44');
        } else {
            rect(ctx, 0, 3, 3, 3, '#e44');
            rect(ctx, 13, 3, 3, 3, '#e44');
        }
        rect(ctx, 4, 10, 2, 2, '#c33');
        rect(ctx, 7, 10, 2, 2, '#c33');
        rect(ctx, 10, 10, 2, 2, '#c33');
    }

    // Carrot pickup — 8x14
    function drawCarrot(ctx, bobOffset) {
        var y = bobOffset || 0;
        rect(ctx, 3, 4 + y, 2, 8, '#f80');
        rect(ctx, 2, 6 + y, 4, 4, '#f80');
        px(ctx, 4, 11 + y, '#f80');
        px(ctx, 3, 12 + y, '#e70');
        rect(ctx, 2, 2 + y, 4, 3, '#4a4');
        px(ctx, 3, 1 + y, '#4a4');
        px(ctx, 4, 1 + y, '#4a4');
    }

    // Carrot projectile — 8x4 horizontal
    function drawCarrotProjectile(ctx) {
        rect(ctx, 0, 1, 6, 2, '#f80');
        rect(ctx, 6, 1, 2, 2, '#4a4');
        px(ctx, 0, 2, '#e70');
    }

    // Flag — 8x16
    function drawFlag(ctx, frame) {
        var f = frame || 0;
        rect(ctx, 1, 0, 2, 16, '#aa8');
        var offset = (f % 2 === 0) ? 0 : 1;
        rect(ctx, 3, 1 + offset, 5, 5, '#f22');
        rect(ctx, 3, 2 + offset, 4, 3, '#f44');
        px(ctx, 5, 3 + offset, '#fff');
        px(ctx, 6, 3 + offset, '#fff');
    }

    // Tile sprites
    function drawWoodPlank(ctx) {
        rect(ctx, 0, 0, 16, 16, '#8B4513');
        rect(ctx, 0, 0, 16, 2, '#A0522D');
        rect(ctx, 7, 2, 1, 14, '#6B3410');
        px(ctx, 2, 1, '#555');
        px(ctx, 13, 1, '#555');
    }

    function drawHullWall(ctx) {
        rect(ctx, 0, 0, 16, 16, '#5C3310');
        rect(ctx, 0, 0, 16, 1, '#6B3410');
        rect(ctx, 3, 4, 10, 1, '#4A2508');
        rect(ctx, 1, 9, 14, 1, '#4A2508');
        rect(ctx, 4, 13, 8, 1, '#4A2508');
    }

    function drawWater(ctx, frame) {
        var f = frame || 0;
        rect(ctx, 0, 0, 16, 16, '#1a3a8c');
        var offset = (f % 4) * 4;
        rect(ctx, (0 + offset) % 16, 2, 4, 1, '#2a5aac');
        rect(ctx, (8 + offset) % 16, 6, 4, 1, '#2a5aac');
    }

    function drawRope(ctx) {
        rect(ctx, 7, 0, 2, 16, '#c8a86e');
        px(ctx, 7, 2, '#aa8844');
        px(ctx, 8, 5, '#aa8844');
        px(ctx, 7, 8, '#aa8844');
        px(ctx, 8, 11, '#aa8844');
        px(ctx, 7, 14, '#aa8844');
    }

    function drawBarrel(ctx) {
        rect(ctx, 2, 1, 12, 14, '#8B6914');
        rect(ctx, 1, 3, 14, 10, '#8B6914');
        rect(ctx, 1, 4, 14, 1, '#777');
        rect(ctx, 1, 11, 14, 1, '#777');
        rect(ctx, 5, 2, 2, 12, '#9B7924');
    }

    function drawMast(ctx) {
        rect(ctx, 6, 0, 4, 16, '#aa8');
        rect(ctx, 7, 0, 2, 16, '#bb9');
    }

    function drawThinPlatform(ctx) {
        rect(ctx, 0, 0, 16, 3, '#A0522D');
        rect(ctx, 0, 0, 16, 1, '#BF6530');
        px(ctx, 5, 1, '#8B4513');
        px(ctx, 11, 1, '#8B4513');
    }

    function get(name, frame) {
        var key = name + '_' + (frame || 0);
        if (cache[key]) return cache[key];

        var c, ctx;
        switch (name) {
            case 'cat':
                c = createCanvas(16, 16); ctx = c.getContext('2d'); drawCat(ctx, frame); break;
            case 'cat_left':
                c = createCanvas(16, 16); ctx = c.getContext('2d');
                ctx.save(); ctx.scale(-1, 1); ctx.translate(-16, 0); drawCat(ctx, frame); ctx.restore(); break;
            case 'happy_cat':
                c = createCanvas(32, 32); ctx = c.getContext('2d'); drawHappyCat(ctx); break;
            case 'sleeping_cat':
                c = createCanvas(32, 16); ctx = c.getContext('2d'); drawSleepingCat(ctx, frame); break;
            case 'crab':
                c = createCanvas(16, 12); ctx = c.getContext('2d'); drawCrab(ctx, frame); break;
            case 'carrot':
                c = createCanvas(8, 14); ctx = c.getContext('2d'); drawCarrot(ctx, 0); break;
            case 'carrot_projectile':
                c = createCanvas(8, 4); ctx = c.getContext('2d'); drawCarrotProjectile(ctx); break;
            case 'carrot_projectile_left':
                c = createCanvas(8, 4); ctx = c.getContext('2d');
                ctx.save(); ctx.scale(-1, 1); ctx.translate(-8, 0); drawCarrotProjectile(ctx); ctx.restore(); break;
            case 'flag':
                c = createCanvas(8, 16); ctx = c.getContext('2d'); drawFlag(ctx, frame); break;
            case 'wood_plank':
                c = createCanvas(16, 16); ctx = c.getContext('2d'); drawWoodPlank(ctx); break;
            case 'hull_wall':
                c = createCanvas(16, 16); ctx = c.getContext('2d'); drawHullWall(ctx); break;
            case 'water':
                c = createCanvas(16, 16); ctx = c.getContext('2d'); drawWater(ctx, frame); break;
            case 'rope':
                c = createCanvas(16, 16); ctx = c.getContext('2d'); drawRope(ctx); break;
            case 'barrel':
                c = createCanvas(16, 16); ctx = c.getContext('2d'); drawBarrel(ctx); break;
            case 'mast':
                c = createCanvas(16, 16); ctx = c.getContext('2d'); drawMast(ctx); break;
            case 'thin_platform':
                c = createCanvas(16, 16); ctx = c.getContext('2d'); drawThinPlatform(ctx); break;
            default:
                c = createCanvas(16, 16); ctx = c.getContext('2d'); rect(ctx, 0, 0, 16, 16, '#f0f');
        }

        cache[key] = c;
        return c;
    }

    function clearCache() { cache = {}; }

    return { get: get, clearCache: clearCache };
})();
