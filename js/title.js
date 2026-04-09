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

        R.drawRect(370, 20, 20, 20, '#ffffaa');
        R.drawRect(372, 18, 16, 2, '#ffffaa');
        R.drawRect(368, 22, 2, 16, '#ffffaa');

        R.drawTextCentered('THE ADVENTURE OF', 60, '#ffaa00', 10);
        R.drawTextCentered('ROUND PAWS', 83, '#aa0000', 24);
        R.drawTextCentered('ROUND PAWS', 82, '#ff6600', 24);
        R.drawTextCentered('ROUND PAWS', 80, '#ffffff', 24);

        R.drawSpriteAbsolute('happy_cat', 208, 96, 0);

        R.drawRect(0, 190, 448, 4, '#BF6530');
        R.drawRect(0, 194, 448, 30, '#8B4513');

        if (timer % 40 < 28) {
            R.drawTextCentered('PRESS START', 180, '#ffffff', 12);
        }
    }

    return { init: init, update: update, draw: draw };
})();
