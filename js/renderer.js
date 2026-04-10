/**
 * Renderer
 *
 * All drawing goes through this module. Manages the canvas, a horizontal
 * scrolling camera, and provides helpers for sprites, text, and rectangles.
 *
 * Canvas: 448 x 224 pixels, pixel-art style (no smoothing).
 * Camera: smoothly tracks the player horizontally.
 */
window.Game = window.Game || {};

Game.Renderer = (function () {
    var canvas, ctx;
    var TILE = 16;
    var camera = { x: 0, y: 0 };
    var canvasW, canvasH;

    // ---------------------------------------------------------------
    // Setup
    // ---------------------------------------------------------------

    function init() {
        canvas = document.getElementById('game');
        canvas.width = 448;
        canvas.height = 224;
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false; // crisp pixel art
        canvasW = canvas.width;
        canvasH = canvas.height;
    }

    function clear() {
        ctx.fillStyle = '#87CEEB'; // daytime sky blue background
        ctx.fillRect(0, 0, canvasW, canvasH);
    }

    // ---------------------------------------------------------------
    // Camera
    // ---------------------------------------------------------------

    /** Smoothly scroll toward the player. Clamped to level bounds. */
    function updateCamera(playerX, levelWidth, playerY, levelHeight) {
        var targetX = playerX - canvasW / 2;
        camera.x += (targetX - camera.x) * 0.1;
        var maxX = levelWidth * TILE - canvasW;
        if (camera.x < 0) camera.x = 0;
        if (camera.x > maxX) camera.x = maxX;

        // Vertical tracking only kicks in if the level is taller than the viewport
        if (typeof playerY === 'number' && typeof levelHeight === 'number' &&
            levelHeight * TILE > canvasH) {
            var targetY = playerY - canvasH / 2;
            camera.y += (targetY - camera.y) * 0.1;
            var maxY = levelHeight * TILE - canvasH;
            if (camera.y < 0) camera.y = 0;
            if (camera.y > maxY) camera.y = maxY;
        } else {
            camera.y = 0;
        }
    }

    function resetCamera() {
        camera.x = 0;
        camera.y = 0;
    }

    // ---------------------------------------------------------------
    // Level rendering
    // ---------------------------------------------------------------

    /** Draw only the tiles visible on screen (culled by camera). */
    function drawLevel(level, animFrame) {
        var startCol = Math.floor(camera.x / TILE);
        var endCol = startCol + Math.ceil(canvasW / TILE) + 1;
        if (endCol > level.width) endCol = level.width;

        var startRow = Math.floor(camera.y / TILE);
        var endRow = startRow + Math.ceil(canvasH / TILE) + 1;
        if (endRow > level.height) endRow = level.height;
        if (startRow < 0) startRow = 0;

        for (var row = startRow; row < endRow; row++) {
            for (var col = startCol; col < endCol; col++) {
                var tile = level.grid[row][col];
                var screenX = col * TILE - camera.x;
                var screenY = row * TILE - camera.y;
                var sprite = null;

                switch (tile) {
                    case '=': sprite = Game.Sprites.get('wood_plank'); break;
                    case '#': sprite = Game.Sprites.get('hull_wall'); break;
                    case '~': sprite = Game.Sprites.get('water', animFrame); break;
                    case 'R': sprite = Game.Sprites.get('rope'); break;
                    case 'M': sprite = Game.Sprites.get('mast'); break;
                    case '-': sprite = Game.Sprites.get('thin_platform'); break;
                }

                if (sprite) {
                    ctx.drawImage(sprite, Math.round(screenX), Math.round(screenY));
                }
            }
        }
    }

    // ---------------------------------------------------------------
    // Sprite drawing
    // ---------------------------------------------------------------

    /** Draw a sprite in world space (offset by camera). */
    function drawSprite(spriteName, x, y, frame) {
        var sprite = Game.Sprites.get(spriteName, frame);
        ctx.drawImage(sprite, Math.round(x - camera.x), Math.round(y - camera.y));
    }

    /** Draw a sprite in screen space (ignores camera). Used for HUD / title. */
    function drawSpriteAbsolute(spriteName, x, y, frame) {
        var sprite = Game.Sprites.get(spriteName, frame);
        ctx.drawImage(sprite, Math.round(x), Math.round(y));
    }

    /** Draw a sprite in screen space at a given scale factor. */
    function drawSpriteScaled(spriteName, x, y, scale, frame) {
        var sprite = Game.Sprites.get(spriteName, frame);
        var w = sprite.width * scale;
        var h = sprite.height * scale;
        ctx.drawImage(sprite, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }

    // ---------------------------------------------------------------
    // Text & primitives
    // ---------------------------------------------------------------

    function drawText(text, x, y, color, size) {
        ctx.fillStyle = color || '#fff';
        ctx.font = (size || 8) + 'px monospace';
        ctx.fillText(text, x, y);
    }

    function drawTextCentered(text, y, color, size) {
        ctx.fillStyle = color || '#fff';
        ctx.font = (size || 8) + 'px monospace';
        var w = ctx.measureText(text).width;
        ctx.fillText(text, (canvasW - w) / 2, y);
    }

    function drawRect(x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    }

    // ---------------------------------------------------------------
    // Accessors (used by particles, title screen, etc.)
    // ---------------------------------------------------------------

    function getWidth()   { return canvasW; }
    function getHeight()  { return canvasH; }
    function getCtx()     { return ctx; }
    function getCameraX() { return camera.x; }
    function getCameraY() { return camera.y; }

    return {
        init: init,
        clear: clear,
        updateCamera: updateCamera,
        resetCamera: resetCamera,
        drawLevel: drawLevel,
        drawSprite: drawSprite,
        drawSpriteAbsolute: drawSpriteAbsolute,
        drawSpriteScaled: drawSpriteScaled,
        drawText: drawText,
        drawTextCentered: drawTextCentered,
        drawRect: drawRect,
        getWidth: getWidth,
        getHeight: getHeight,
        getCtx: getCtx,
        getCameraX: getCameraX,
        getCameraY: getCameraY
    };
})();
