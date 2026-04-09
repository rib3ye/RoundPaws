window.Game = window.Game || {};

Game.Renderer = (function () {
    var canvas, ctx;
    var TILE = 16;
    var camera = { x: 0 };
    var canvasW, canvasH;

    function init() {
        canvas = document.getElementById('game');
        canvas.width = 448;
        canvas.height = 224;
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        canvasW = canvas.width;
        canvasH = canvas.height;
    }

    function clear() {
        ctx.fillStyle = '#0a1a3c';
        ctx.fillRect(0, 0, canvasW, canvasH);
    }

    function updateCamera(playerX, levelWidth) {
        var target = playerX - canvasW / 2;
        camera.x += (target - camera.x) * 0.1;
        var maxX = levelWidth * TILE - canvasW;
        if (camera.x < 0) camera.x = 0;
        if (camera.x > maxX) camera.x = maxX;
    }

    function resetCamera() {
        camera.x = 0;
    }

    function drawLevel(level, animFrame) {
        var startCol = Math.floor(camera.x / TILE);
        var endCol = startCol + Math.ceil(canvasW / TILE) + 1;
        if (endCol > level.width) endCol = level.width;

        for (var row = 0; row < level.height; row++) {
            for (var col = startCol; col < endCol; col++) {
                var tile = level.grid[row][col];
                var screenX = col * TILE - camera.x;
                var screenY = row * TILE;
                var sprite = null;

                switch (tile) {
                    case '=': sprite = Game.Sprites.get('wood_plank'); break;
                    case '#': sprite = Game.Sprites.get('hull_wall'); break;
                    case '~': sprite = Game.Sprites.get('water', animFrame); break;
                    case 'R': sprite = Game.Sprites.get('rope'); break;
                    case 'B': sprite = Game.Sprites.get('barrel'); break;
                    case 'M': sprite = Game.Sprites.get('mast'); break;
                    case '-': sprite = Game.Sprites.get('thin_platform'); break;
                }

                if (sprite) {
                    ctx.drawImage(sprite, Math.round(screenX), Math.round(screenY));
                }
            }
        }
    }

    function drawSprite(spriteName, x, y, frame) {
        var sprite = Game.Sprites.get(spriteName, frame);
        ctx.drawImage(sprite, Math.round(x - camera.x), Math.round(y));
    }

    function drawSpriteAbsolute(spriteName, x, y, frame) {
        var sprite = Game.Sprites.get(spriteName, frame);
        ctx.drawImage(sprite, Math.round(x), Math.round(y));
    }

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

    function getWidth() { return canvasW; }
    function getHeight() { return canvasH; }
    function getCtx() { return ctx; }
    function getCameraX() { return camera.x; }

    return {
        init: init,
        clear: clear,
        updateCamera: updateCamera,
        resetCamera: resetCamera,
        drawLevel: drawLevel,
        drawSprite: drawSprite,
        drawSpriteAbsolute: drawSpriteAbsolute,
        drawText: drawText,
        drawTextCentered: drawTextCentered,
        drawRect: drawRect,
        getWidth: getWidth,
        getHeight: getHeight,
        getCtx: getCtx,
        getCameraX: getCameraX
    };
})();
