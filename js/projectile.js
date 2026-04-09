/**
 * Projectile (Thrown Carrots)
 *
 * Manages carrot projectiles thrown by the player. Carrots fly horizontally
 * and are destroyed when they:
 *   - Hit a solid wall tile
 *   - Hit a crab enemy (killing it)
 *   - Leave the visible screen area
 */
window.Game = window.Game || {};

Game.Projectile = (function () {
    var TILE = 16;
    var SPEED = 4;         // horizontal speed (pixels per frame)
    var projectiles = [];

    // ---------------------------------------------------------------
    // Spawning
    // ---------------------------------------------------------------

    /** Create a new carrot projectile at (x, y) moving in the given direction. */
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

    // ---------------------------------------------------------------
    // Update
    // ---------------------------------------------------------------

    function update(level) {
        // Iterate backwards for safe removal via splice
        for (var i = projectiles.length - 1; i >= 0; i--) {
            var p = projectiles[i];
            p.x += p.vx;

            // Remove if off-screen (with some margin)
            var camX = Game.Renderer.getCameraX();
            if (p.x < camX - 20 || p.x > camX + 460) {
                projectiles.splice(i, 1);
                continue;
            }

            // Remove if hitting a solid wall
            var col = Math.floor((p.x + p.width / 2) / TILE);
            var row = Math.floor((p.y + p.height / 2) / TILE);
            if (Game.Level.isSolid(level, col, row)) {
                projectiles.splice(i, 1);
                continue;
            }

            // Remove if hitting an enemy (enemy dies)
            if (Game.Enemies.hitTest(p.x, p.y, p.width, p.height)) {
                projectiles.splice(i, 1);
                continue;
            }
        }
    }

    // ---------------------------------------------------------------
    // Drawing
    // ---------------------------------------------------------------

    function draw() {
        for (var i = 0; i < projectiles.length; i++) {
            var p = projectiles[i];
            var name = p.vx > 0 ? 'carrot_projectile' : 'carrot_projectile_left';
            Game.Renderer.drawSprite(name, p.x, p.y, 0);
        }
    }

    /** Remove all projectiles (used on death/respawn). */
    function clear() {
        projectiles = [];
    }

    return {
        spawn: spawn,
        update: update,
        draw: draw,
        clear: clear
    };
})();
