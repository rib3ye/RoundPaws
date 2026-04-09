window.Game = window.Game || {};

Game.Enemies = (function () {
    var TILE = 16;
    var SPEED = 0.5;
    var crabs = [];
    var particles = [];
    var animFrame = 0;
    var animTimer = 0;

    function spawnExplosion(cx, cy) {
        var colors = ['#ff4444', '#ff8800', '#ffcc00', '#ffffff', '#ff6622'];
        for (var i = 0; i < 12; i++) {
            var angle = (Math.PI * 2 / 12) * i + (Math.random() - 0.5) * 0.5;
            var speed = 1.5 + Math.random() * 2;
            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 15 + Math.floor(Math.random() * 10),
                size: 1 + Math.floor(Math.random() * 3),
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }

    function killCrab(c) {
        c.alive = false;
        c.flashTimer = 0;
        spawnExplosion(c.x + c.width / 2, c.y + c.height / 2);
        Game.Music.sfx('kill');
    }

    function init(level) {
        crabs = [];
        particles = [];
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

        // Update particles
        for (var p = particles.length - 1; p >= 0; p--) {
            var pt = particles[p];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.1;
            pt.life--;
            if (pt.life <= 0) particles.splice(p, 1);
        }
    }

    function draw() {
        var R = Game.Renderer;
        for (var i = 0; i < crabs.length; i++) {
            var c = crabs[i];
            if (!c.alive) continue;
            R.drawSprite('crab', c.x, c.y, animFrame);
        }

        // Draw explosion particles
        var camX = R.getCameraX();
        var ctx = R.getCtx();
        for (var p = 0; p < particles.length; p++) {
            var pt = particles[p];
            var alpha = pt.life / 25;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = pt.color;
            ctx.fillRect(Math.round(pt.x - camX), Math.round(pt.y), pt.size, pt.size);
        }
        ctx.globalAlpha = 1;
    }

    function checkPlayerCollision(px, py, pw, ph) {
        var playerSliding = Game.Player.isSliding();
        for (var i = 0; i < crabs.length; i++) {
            var c = crabs[i];
            if (!c.alive) continue;
            if (px + pw > c.x + 2 && px < c.x + c.width - 2 &&
                py + ph > c.y + 2 && py < c.y + c.height - 2) {
                if (playerSliding) {
                    killCrab(c);
                } else {
                    return true;
                }
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
                killCrab(c);
                return true;
            }
        }
        return false;
    }

    return { init: init, update: update, draw: draw, checkPlayerCollision: checkPlayerCollision, hitTest: hitTest };
})();
