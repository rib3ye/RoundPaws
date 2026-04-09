/**
 * Title Screen
 *
 * Displays the game's title screen with:
 *   - Night sky background with twinkling stars
 *   - Round moon in the upper right
 *   - Large happy cat sprite (3.5x scale, centered)
 *   - Title text: "THE ADVENTURE OF" / "ROUND PAWS" with shadow layers
 *   - Wooden deck at the bottom
 *   - Blinking "PRESS START" prompt
 *
 * Press Enter or Space to start the game.
 */
window.Game = window.Game || {};

Game.Title = (function () {
    var timer = 0;
    var stars = [];

    // ---------------------------------------------------------------
    // Init
    // ---------------------------------------------------------------

    function init() {
        timer = 0;
        stars = [];

        // Generate random star positions in the upper portion of the screen
        for (var i = 0; i < 30; i++) {
            stars.push({
                x: Math.random() * 448,
                y: Math.random() * 120,
                size: Math.random() > 0.7 ? 2 : 1,
                twinkle: Math.random() * 100 | 0 // random phase offset for twinkle
            });
        }
    }

    // ---------------------------------------------------------------
    // Update
    // ---------------------------------------------------------------

    function update() {
        timer++;
        if (Game.Input.wasPressed('start')) {
            return 'start_game';
        }
        return 'title';
    }

    // ---------------------------------------------------------------
    // Drawing
    // ---------------------------------------------------------------

    function draw() {
        var R = Game.Renderer;

        // Dark night sky background
        R.drawRect(0, 0, 448, 224, '#0a0a2e');

        // Twinkling stars (each star blinks off briefly based on its phase)
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            if ((timer + s.twinkle) % 60 < 50) {
                R.drawRect(s.x, s.y, s.size, s.size, '#ffff88');
            }
        }

        // Round moon (drawn as a filled circle using canvas arc)
        var ctx = R.getCtx();
        ctx.fillStyle = '#ffffaa';
        ctx.beginPath();
        ctx.arc(380, 30, 14, 0, Math.PI * 2);
        ctx.fill();

        // Happy cat sprite, scaled 3.5x and centered with slight downward shift
        R.drawSpriteScaled('happy_cat', (448 - 112) / 2, (224 - 112) / 2 + 20, 3.5, 0);

        // Title text with shadow effect (3 layers: dark, orange, white)
        R.drawTextCentered('THE ADVENTURE OF', 42, '#ffaa00', 17);
        R.drawTextCentered('ROUND PAWS', 85, '#aa0000', 41); // shadow (deepest)
        R.drawTextCentered('ROUND PAWS', 84, '#ff6600', 41); // mid layer
        R.drawTextCentered('ROUND PAWS', 82, '#ffffff', 41); // top (brightest)

        // Wooden deck at the bottom
        R.drawRect(0, 190, 448, 4, '#BF6530');  // plank edge
        R.drawRect(0, 194, 448, 30, '#8B4513'); // deck body

        // Blinking "PRESS START" prompt
        if (timer % 40 < 28) {
            R.drawTextCentered('PRESS START', 180, '#ffffff', 12);
        }
    }

    return {
        init: init,
        update: update,
        draw: draw
    };
})();
