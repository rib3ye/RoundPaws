window.Game = window.Game || {};

Game.Projectile = (function () {
    var SPEED = 4;
    var projectiles = [];

    function spawn(x, y, direction) {
        projectiles.push({
            x: x,
            y: y,
            vx: SPEED * direction,
            width: 8,
            height: 4,
            alive: true
        });
    }

    function update(level) {
        for (var i = projectiles.length - 1; i >= 0; i--) {
            var p = projectiles[i];
            p.x += p.vx;

            var camX = Game.Renderer.getCameraX();
            if (p.x < camX - 20 || p.x > camX + 460) {
                projectiles.splice(i, 1);
                continue;
            }

            var col = Math.floor((p.x + p.width / 2) / 16);
            var row = Math.floor((p.y + p.height / 2) / 16);
            if (Game.Level.isSolid(level, col, row)) {
                projectiles.splice(i, 1);
                continue;
            }

            if (Game.Enemies.hitTest(p.x, p.y, p.width, p.height)) {
                projectiles.splice(i, 1);
                continue;
            }
        }
    }

    function draw() {
        for (var i = 0; i < projectiles.length; i++) {
            var p = projectiles[i];
            var name = p.vx > 0 ? 'carrot_projectile' : 'carrot_projectile_left';
            Game.Renderer.drawSprite(name, p.x, p.y, 0);
        }
    }

    function clear() {
        projectiles = [];
    }

    return { spawn: spawn, update: update, draw: draw, clear: clear };
})();
