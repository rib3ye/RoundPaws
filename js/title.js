window.Game = window.Game || {};

Game.Title = (function () {
    var timer = 0;
    var stars = [];

    function init() {
        timer = 0;
        stars = [];
        for (var i = 0; i < 30; i++) {
            stars.push({
                x: Math.random() * 448,
                y: Math.random() * 120,
                size: Math.random() > 0.7 ? 2 : 1,
                twinkle: Math.random() * 100 | 0
            });
        }
    }

    function update() {
        timer++;
        if (Game.Input.wasPressed('start')) {
            return 'start_game';
        }
        return 'title';
    }

    function draw() {
        var R = Game.Renderer;
        R.drawRect(0, 0, 448, 224, '#0a0a2e');

        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            if ((timer + s.twinkle) % 60 < 50) {
                R.drawRect(s.x, s.y, s.size, s.size, '#ffff88');
            }
        }

        var ctx = R.getCtx();
        ctx.fillStyle = '#ffffaa';
        ctx.beginPath();
        ctx.arc(380, 30, 14, 0, Math.PI * 2);
        ctx.fill();

        R.drawSpriteScaled('happy_cat', (448 - 112) / 2, (224 - 112) / 2 + 20, 3.5, 0);

        R.drawTextCentered('THE ADVENTURE OF', 42, '#ffaa00', 17);
        R.drawTextCentered('ROUND PAWS', 85, '#aa0000', 41);
        R.drawTextCentered('ROUND PAWS', 84, '#ff6600', 41);
        R.drawTextCentered('ROUND PAWS', 82, '#ffffff', 41);

        R.drawRect(0, 190, 448, 4, '#BF6530');
        R.drawRect(0, 194, 448, 30, '#8B4513');

        if (timer % 40 < 28) {
            R.drawTextCentered('PRESS START', 180, '#ffffff', 12);
        }
    }

    return { init: init, update: update, draw: draw };
})();
