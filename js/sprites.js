/**
 * Sprite System
 *
 * All game sprites are defined here as programmatic pixel art drawn onto
 * small canvases. Sprites are cached after first generation.
 *
 * File override system:
 *   If a PNG exists in the tiles/ directory matching the sprite name,
 *   it will be used instead of the programmatic version. This allows
 *   artists to replace any sprite by dropping a PNG file in tiles/.
 *
 * Naming convention for override files:
 *   - Single-frame: tiles/sprite_name.png
 *   - Multi-frame:  tiles/sprite_name_0.png, tiles/sprite_name_1.png, ...
 *
 * Press R in-game to hot-reload all tile assets from disk.
 */
window.Game = window.Game || {};

Game.Sprites = (function () {
    var cache = {};           // generated canvas cache (keyed by "name_frame")
    var imageOverrides = {};  // loaded PNG overrides (keyed by "name_frame")
    var TILE_PATH = 'tiles/';

    // Sprite metadata: name -> number of animation frames
    var spriteInfo = {
        wood_plank: 1, hull_wall: 1, water: 4, rope: 1, barrel: 1, mast: 1,
        thin_platform: 1, cat: 4, cat_left: 4, cat_slide: 1, cat_slide_left: 1,
        happy_cat: 1, sleeping_cat: 3,
        crab: 4, carrot: 1, carrot_projectile: 1, carrot_projectile_left: 1, flag: 2
    };

    // ---------------------------------------------------------------
    // PNG loading (file override system)
    // ---------------------------------------------------------------

    /**
     * Attempt to load PNG overrides for every sprite from the tiles/ directory.
     * Falls back silently if a file doesn't exist (onerror just calls done).
     * Cache-busted with a timestamp to support hot-reloading via R key.
     */
    function loadImages(callback) {
        var toLoad = 0;
        var loaded = 0;
        var bust = '?t=' + Date.now();

        function done() {
            loaded++;
            if (loaded === toLoad && callback) callback();
        }

        for (var name in spriteInfo) {
            var frames = spriteInfo[name];
            for (var f = 0; f < frames; f++) {
                toLoad++;
                (function (spriteName, frame, numFrames) {
                    var filename = numFrames > 1
                        ? TILE_PATH + spriteName + '_' + frame + '.png'
                        : TILE_PATH + spriteName + '.png';

                    var img = new Image();
                    img.onload = function () {
                        imageOverrides[spriteName + '_' + frame] = img;
                        done();
                    };
                    img.onerror = done; // no file found — use programmatic sprite
                    img.src = filename + bust;
                })(name, f, frames);
            }
        }

        if (toLoad === 0 && callback) callback();
    }

    // ---------------------------------------------------------------
    // Canvas helpers for pixel art
    // ---------------------------------------------------------------

    /** Create a small offscreen canvas. */
    function createCanvas(w, h) {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    /** Draw a single pixel. */
    function px(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
    }

    /** Draw a filled rectangle. */
    function rect(ctx, x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    }

    // ---------------------------------------------------------------
    // Character sprites
    // ---------------------------------------------------------------

    /** Round Paws the cat — 16x16, facing right, 4 walk frames. */
    function drawCat(ctx, frame) {
        var f = frame || 0;

        // Body (dark circle)
        rect(ctx, 4, 4, 8, 8, '#222');

        // White muzzle area
        rect(ctx, 6, 7, 4, 1, '#fff');
        rect(ctx, 7, 8, 2, 1, '#fff');

        // Pink nose
        px(ctx, 7, 7, '#f99');
        px(ctx, 8, 7, '#f99');

        // Green eyes
        rect(ctx, 5, 5, 2, 2, '#4f4');
        rect(ctx, 9, 5, 2, 2, '#4f4');
        px(ctx, 6, 5, '#0a0');   // left pupil
        px(ctx, 10, 5, '#0a0');  // right pupil

        // Ears
        px(ctx, 4, 3, '#222');
        px(ctx, 5, 2, '#222');
        px(ctx, 5, 3, '#222');
        px(ctx, 11, 3, '#222');
        px(ctx, 10, 2, '#222');
        px(ctx, 10, 3, '#222');

        // Pink inner ears
        px(ctx, 5, 3, '#a0407a');
        px(ctx, 10, 3, '#a0407a');

        // Legs — alternate position each frame for walk cycle
        if (f % 2 === 0) {
            rect(ctx, 5, 12, 2, 2, '#222');
            rect(ctx, 9, 12, 2, 2, '#222');
        } else {
            rect(ctx, 4, 12, 2, 2, '#222');
            rect(ctx, 10, 12, 2, 2, '#222');
        }

        // Tail (curves upward)
        px(ctx, 12, 6, '#222');
        px(ctx, 13, 5, '#222');
        px(ctx, 13, 4, '#222');
    }

    /** Happy cat for title screen — 32x32, ^_^ eyes, tail up. */
    function drawHappyCat(ctx) {
        // Large body
        rect(ctx, 8, 8, 16, 14, '#222');

        // White muzzle
        rect(ctx, 12, 14, 8, 2, '#fff');
        rect(ctx, 13, 16, 6, 2, '#fff');
        rect(ctx, 14, 18, 4, 1, '#fff');

        // Nose
        rect(ctx, 15, 14, 2, 1, '#f99');

        // Happy eyes (^_^) — arcs drawn as pixels
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

        // Pink inner ears
        px(ctx, 9, 6, '#a0407a');
        px(ctx, 22, 6, '#a0407a');

        // Paws
        rect(ctx, 10, 22, 4, 3, '#222');
        rect(ctx, 18, 22, 4, 3, '#222');

        // Tail curled up (happy mood)
        px(ctx, 24, 12, '#222');
        px(ctx, 25, 11, '#222');
        px(ctx, 26, 10, '#222');
        px(ctx, 26, 9, '#222');
        px(ctx, 25, 8, '#222');

        // Smile
        px(ctx, 14, 19, '#f99');
        px(ctx, 15, 20, '#f99');
        px(ctx, 16, 20, '#f99');
        px(ctx, 17, 19, '#f99');
    }

    /** Sleeping cat for ending — 32x16, lying flat with "Zzz" bubble frames. */
    function drawSleepingCat(ctx, frame) {
        var f = frame || 0;

        // Body (flat oval shape, lying down)
        rect(ctx, 6, 4, 20, 10, '#222');
        rect(ctx, 4, 6, 24, 6, '#222');

        // Head
        rect(ctx, 2, 4, 8, 8, '#222');

        // Muzzle
        rect(ctx, 3, 7, 4, 1, '#fff');
        rect(ctx, 4, 8, 2, 1, '#fff');

        // Closed eyes (horizontal lines)
        rect(ctx, 3, 5, 3, 1, '#4f4');
        rect(ctx, 7, 5, 3, 1, '#4f4');

        // Ears
        px(ctx, 2, 3, '#222');
        px(ctx, 3, 2, '#222');
        px(ctx, 8, 3, '#222');
        px(ctx, 9, 2, '#222');

        // Curled tail
        px(ctx, 26, 6, '#222');
        px(ctx, 27, 5, '#222');
        px(ctx, 28, 5, '#222');
        px(ctx, 29, 6, '#222');

        // "Zzz" sleep bubbles (animated across 3 frames)
        if (f % 3 === 1) {
            rect(ctx, 12, 1, 1, 1, '#88f');
        } else if (f % 3 === 2) {
            rect(ctx, 12, 1, 1, 1, '#88f');
            rect(ctx, 14, 0, 1, 1, '#66d');
        }
    }

    /** Slide attack pose — 16x10, low profile, legs extended. */
    function drawCatSlide(ctx) {
        // Flat body
        rect(ctx, 2, 2, 12, 6, '#222');

        // Eyes
        rect(ctx, 9, 2, 2, 2, '#4f4');
        rect(ctx, 12, 2, 2, 2, '#4f4');
        px(ctx, 10, 2, '#0a0');
        px(ctx, 13, 2, '#0a0');

        // Ears
        px(ctx, 12, 0, '#222');
        px(ctx, 13, 1, '#222');
        px(ctx, 14, 0, '#222');
        px(ctx, 14, 1, '#222');

        // Rear leg trailing behind
        rect(ctx, 0, 6, 3, 2, '#222');

        // Front leg extended forward
        rect(ctx, 12, 8, 4, 2, '#222');

        // Tail flicked up
        px(ctx, 0, 1, '#222');
        px(ctx, 1, 0, '#222');
        px(ctx, 1, 1, '#222');
    }

    // ---------------------------------------------------------------
    // Enemy sprites
    // ---------------------------------------------------------------

    /** Crab enemy — 16x12, with animated claws. */
    function drawCrab(ctx, frame) {
        var f = frame || 0;

        // Body
        rect(ctx, 3, 4, 10, 6, '#e44');
        rect(ctx, 4, 3, 8, 1, '#e44');

        // Eye stalks
        rect(ctx, 4, 1, 2, 3, '#e44');
        rect(ctx, 10, 1, 2, 3, '#e44');

        // Eyes (dark dots on stalks)
        px(ctx, 4, 1, '#111');
        px(ctx, 5, 1, '#111');
        px(ctx, 10, 1, '#111');
        px(ctx, 11, 1, '#111');

        // Claws — animate up/down
        if (f % 2 === 0) {
            rect(ctx, 0, 4, 3, 3, '#e44');
            rect(ctx, 13, 4, 3, 3, '#e44');
        } else {
            rect(ctx, 0, 3, 3, 3, '#e44');
            rect(ctx, 13, 3, 3, 3, '#e44');
        }

        // Legs
        rect(ctx, 4, 10, 2, 2, '#c33');
        rect(ctx, 7, 10, 2, 2, '#c33');
        rect(ctx, 10, 10, 2, 2, '#c33');
    }

    // ---------------------------------------------------------------
    // Item sprites
    // ---------------------------------------------------------------

    /** Carrot pickup — 8x14, orange body with green top. */
    function drawCarrot(ctx, bobOffset) {
        var y = bobOffset || 0;

        // Orange body (tapers to a point)
        rect(ctx, 3, 4 + y, 2, 8, '#f80');
        rect(ctx, 2, 6 + y, 4, 4, '#f80');
        px(ctx, 4, 11 + y, '#f80');
        px(ctx, 3, 12 + y, '#e70'); // darker tip

        // Green leafy top
        rect(ctx, 2, 2 + y, 4, 3, '#4a4');
        px(ctx, 3, 1 + y, '#4a4');
        px(ctx, 4, 1 + y, '#4a4');
    }

    /** Carrot projectile — 8x4, horizontal flying carrot. */
    function drawCarrotProjectile(ctx) {
        rect(ctx, 0, 1, 6, 2, '#f80'); // orange body
        rect(ctx, 6, 1, 2, 2, '#4a4'); // green tail
        px(ctx, 0, 2, '#e70');          // darker tip
    }

    /** Level exit flag — 8x16, pole with waving red flag. */
    function drawFlag(ctx, frame) {
        var f = frame || 0;

        // Pole
        rect(ctx, 1, 0, 2, 16, '#aa8');

        // Red flag (shifts down 1px on alternate frames for wave effect)
        var offset = (f % 2 === 0) ? 0 : 1;
        rect(ctx, 3, 1 + offset, 5, 5, '#f22');
        rect(ctx, 3, 2 + offset, 4, 3, '#f44');

        // White emblem on flag
        px(ctx, 5, 3 + offset, '#fff');
        px(ctx, 6, 3 + offset, '#fff');
    }

    // ---------------------------------------------------------------
    // Tile sprites (16x16 each)
    // ---------------------------------------------------------------

    /** Wood plank — ship deck floor. */
    function drawWoodPlank(ctx) {
        rect(ctx, 0, 0, 16, 16, '#8B4513');  // base brown
        rect(ctx, 0, 0, 16, 2, '#A0522D');   // lighter top edge
        rect(ctx, 7, 2, 1, 14, '#6B3410');   // plank seam
        px(ctx, 2, 1, '#555');                // nail
        px(ctx, 13, 1, '#555');               // nail
    }

    /** Hull wall — ship interior walls. */
    function drawHullWall(ctx) {
        rect(ctx, 0, 0, 16, 16, '#5C3310');  // base dark brown
        rect(ctx, 0, 0, 16, 1, '#6B3410');   // top highlight
        rect(ctx, 3, 4, 10, 1, '#4A2508');   // horizontal plank lines
        rect(ctx, 1, 9, 14, 1, '#4A2508');
        rect(ctx, 4, 13, 8, 1, '#4A2508');
    }

    /** Water — deadly hazard with animated wave highlight. */
    function drawWater(ctx, frame) {
        var f = frame || 0;
        rect(ctx, 0, 0, 16, 16, '#1a3a8c');  // deep blue base

        // Scrolling wave highlights
        var offset = (f % 4) * 4;
        rect(ctx, (0 + offset) % 16, 2, 4, 1, '#2a5aac');
        rect(ctx, (8 + offset) % 16, 6, 4, 1, '#2a5aac');
    }

    /** Rope — climbable vertical rope with alternating knot texture. */
    function drawRope(ctx) {
        rect(ctx, 7, 0, 2, 16, '#c8a86e'); // main rope
        // Alternating darker knots
        px(ctx, 7, 2, '#aa8844');
        px(ctx, 8, 5, '#aa8844');
        px(ctx, 7, 8, '#aa8844');
        px(ctx, 8, 11, '#aa8844');
        px(ctx, 7, 14, '#aa8844');
    }

    /** Barrel — pushable object that can crush crabs. */
    function drawBarrel(ctx) {
        rect(ctx, 2, 1, 12, 14, '#8B6914');  // wooden body
        rect(ctx, 1, 3, 14, 10, '#8B6914');  // wider middle
        rect(ctx, 1, 4, 14, 1, '#777');       // metal band (top)
        rect(ctx, 1, 11, 14, 1, '#777');      // metal band (bottom)
        rect(ctx, 5, 2, 2, 12, '#9B7924');    // vertical plank highlight
    }

    /** Mast — decorative ship mast (background). */
    function drawMast(ctx) {
        rect(ctx, 6, 0, 4, 16, '#aa8');  // outer wood
        rect(ctx, 7, 0, 2, 16, '#bb9');  // inner highlight
    }

    /** Thin platform — one-way platform you can stand on but jump through. */
    function drawThinPlatform(ctx) {
        rect(ctx, 0, 0, 16, 3, '#A0522D');   // platform body
        rect(ctx, 0, 0, 16, 1, '#BF6530');   // top highlight
        px(ctx, 5, 1, '#8B4513');             // wood grain detail
        px(ctx, 11, 1, '#8B4513');
    }

    // ---------------------------------------------------------------
    // Sprite lookup & caching
    // ---------------------------------------------------------------

    /**
     * Get a sprite canvas by name and frame.
     * Priority: PNG override > cache > generate programmatically.
     */
    function get(name, frame) {
        var key = name + '_' + (frame || 0);

        // Check for PNG override first
        if (imageOverrides[key]) return imageOverrides[key];

        // Return cached version if available
        if (cache[key]) return cache[key];

        // Generate programmatically and cache
        var c, ctx;
        switch (name) {
            case 'cat':
                c = createCanvas(16, 16); ctx = c.getContext('2d'); drawCat(ctx, frame); break;
            case 'cat_left':
                c = createCanvas(16, 16); ctx = c.getContext('2d');
                ctx.save(); ctx.scale(-1, 1); ctx.translate(-16, 0); drawCat(ctx, frame); ctx.restore(); break;
            case 'cat_slide':
                c = createCanvas(16, 10); ctx = c.getContext('2d'); drawCatSlide(ctx); break;
            case 'cat_slide_left':
                c = createCanvas(16, 10); ctx = c.getContext('2d');
                ctx.save(); ctx.scale(-1, 1); ctx.translate(-16, 0); drawCatSlide(ctx); ctx.restore(); break;
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
                // Magenta placeholder for unknown sprites (makes them easy to spot)
                c = createCanvas(16, 16); ctx = c.getContext('2d'); rect(ctx, 0, 0, 16, 16, '#f0f');
        }

        cache[key] = c;
        return c;
    }

    /** Clear the generated sprite cache (used when hot-reloading). */
    function clearCache() {
        cache = {};
    }

    return {
        get: get,
        clearCache: clearCache,
        loadImages: loadImages,
        spriteInfo: spriteInfo
    };
})();
