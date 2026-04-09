window.Game = window.Game || {};

Game.Enemies = (function () {
    var TILE = 16;
    var SPEED = 0.5;
    var crabs = [];
    var animFrame = 0;
    var animTimer = 0;

    function init(level) {
        crabs = [];
        for (var i = 0; i < level.enemies.length; i++) {
            var e = level.enemies[i];
            // Find ground below spawn: scan downward for solid or thin platform
            var groundRow = e.y + 1;
            while (groundRow < level.height &&
                   !Game.Level.isSolid(level, e.x, groundRow) &&
                   !Game.Level.isThinPlatform(level, e.x, groundRow)) {
                groundRow++;
            }
            crabs.push({
                x: e.x * TILE,
                y: groundRow * TILE - 12, // snap feet to top of ground tile
                width: 16,
                height: 12,
                vx: SPEED,
                alive: true,
                flashTimer: 0
            });
        }
    }

    function update(level) {
        animTimer++;
        if (animTimer > 10) {
            animTimer = 0;
            animFrame = (animFrame + 1) % 2;
        }

        for (var i = 0; i < crabs.length; i++) {
            var c = crabs[i];
            if (!c.alive) {
                if (c.flashTimer > 0) c.flashTimer--;
                continue;
            }

            c.x += c.vx;

            var frontCol = Math.floor((c.vx > 0 ? c.x + c.width : c.x) / TILE);
            var row = Math.floor((c.y + c.height - 2) / TILE);
            if (Game.Level.isSolid(level, frontCol, row)) {
                c.vx = -c.vx;
            }

            var aheadCol = Math.floor((c.vx > 0 ? c.x + c.width + 2 : c.x - 2) / TILE);
            var belowRow = row + 1;
            if (!Game.Level.isSolid(level, aheadCol, belowRow) && !Game.Level.isThinPlatform(level, aheadCol, belowRow)) {
                c.vx = -c.vx;
            }
        }
    }

    function draw() {
        for (var i = 0; i < crabs.length; i++) {
            var c = crabs[i];
            if (!c.alive) {
                if (c.flashTimer > 0 && c.flashTimer % 2 === 0) {
                    Game.Renderer.drawSprite('crab', c.x, c.y, animFrame);
                }
                continue;
            }
            Game.Renderer.drawSprite('crab', c.x, c.y, animFrame);
        }
    }

    function checkPlayerCollision(px, py, pw, ph) {
        for (var i = 0; i < crabs.length; i++) {
            var c = crabs[i];
            if (!c.alive) continue;
            if (px + pw > c.x + 2 && px < c.x + c.width - 2 &&
                py + ph > c.y + 2 && py < c.y + c.height - 2) {
                return true;
            }
        }
        return false;
    }

    function hitTest(px, py, pw, ph) {
        for (var i = 0; i < crabs.length; i++) {
            var c = crabs[i];
            if (!c.alive) continue;
            if (px + pw > c.x && px < c.x + c.width &&
                py + ph > c.y && py < c.y + c.height) {
                c.alive = false;
                c.flashTimer = 10;
                Game.Music.sfx('kill');
                return true;
            }
        }
        return false;
    }

    return { init: init, update: update, draw: draw, checkPlayerCollision: checkPlayerCollision, hitTest: hitTest };
})();
