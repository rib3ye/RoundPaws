window.Game = window.Game || {};

(function () {
    var TILE = 16;
    var state = 'title';
    var currentLevelIndex = 0;
    var currentLevel = null;
    var animFrame = 0;
    var animTimer = 0;
    var levelNames = ['The Poop Deck', 'Below Deck', "The Crow's Nest"];
    var levelFiles = ['levels/level1.txt', 'levels/level2.txt', 'levels/level3.txt'];
    var carrotPickups = [];
    var flagAnimFrame = 0;

    function startGame() {
        currentLevelIndex = 0;
        loadLevel(currentLevelIndex);
    }

    function loadLevel(index) {
        state = 'loading';
        Game.Level.load(levelFiles[index], function (level) {
            currentLevel = level;
            Game.Player.init(level);
            Game.Player.setCarrots(0);
            Game.Enemies.init(level);
            Game.Projectile.clear();
            Game.Renderer.resetCamera();
            initCarrotPickups(level);
            state = 'playing';
            Game.Music.play('gameplay');
        });
    }

    function initCarrotPickups(level) {
        carrotPickups = [];
        for (var i = 0; i < level.carrots.length; i++) {
            var c = level.carrots[i];
            carrotPickups.push({
                x: c.x * TILE + 4,
                y: c.y * TILE + 1,
                collected: false
            });
        }
    }

    function update() {
        Game.Input.update();

        animTimer++;
        if (animTimer > 12) {
            animTimer = 0;
            animFrame = (animFrame + 1) % 4;
            flagAnimFrame = (flagAnimFrame + 1) % 2;
        }

        switch (state) {
            case 'title':
                var result = Game.Title.update();
                if (result === 'start_game') {
                    Game.Music.init();
                    startGame();
                }
                break;

            case 'playing':
                if (!Game.Player.isAlive()) break;

                var playerResult = Game.Player.update(currentLevel);
                Game.Enemies.update(currentLevel);
                Game.Projectile.update(currentLevel);

                var px = Game.Player.getX();
                var py = Game.Player.getY();
                var pw = Game.Player.getWidth();
                var ph = Game.Player.getHeight();

                for (var i = 0; i < carrotPickups.length; i++) {
                    var cp = carrotPickups[i];
                    if (cp.collected) continue;
                    if (px + pw > cp.x && px < cp.x + 8 &&
                        py + ph > cp.y && py < cp.y + 14) {
                        cp.collected = true;
                        Game.Player.collectCarrot();
                    }
                }

                if (Game.Enemies.checkPlayerCollision(px, py, pw, ph)) {
                    Game.Player.respawn();
                    Game.Projectile.clear();
                    initCarrotPickups(currentLevel);
                    Game.Enemies.init(currentLevel);
                }

                Game.Renderer.updateCamera(px + pw / 2, currentLevel.width);

                if (playerResult === 'level_complete') {
                    currentLevelIndex++;
                    if (currentLevelIndex >= levelFiles.length) {
                        state = 'ending';
                        Game.Ending.init();
                        Game.Music.play('ending');
                    } else {
                        loadLevel(currentLevelIndex);
                    }
                }
                break;

            case 'ending':
                Game.Ending.update();
                break;
        }
    }

    function draw() {
        Game.Renderer.clear();

        switch (state) {
            case 'title':
                Game.Title.draw();
                break;

            case 'loading':
                Game.Renderer.drawTextCentered('Loading...', 112, '#fff', 10);
                break;

            case 'playing':
                Game.Renderer.drawLevel(currentLevel, animFrame);

                if (currentLevel.flag) {
                    Game.Renderer.drawSprite('flag', currentLevel.flag.x * TILE, currentLevel.flag.y * TILE, flagAnimFrame);
                }

                for (var i = 0; i < carrotPickups.length; i++) {
                    var cp = carrotPickups[i];
                    if (cp.collected) continue;
                    var bob = Math.sin((animTimer + i * 20) * 0.15) * 2;
                    Game.Renderer.drawSprite('carrot', cp.x, cp.y + bob, 0);
                }

                Game.Enemies.draw();
                Game.Projectile.draw();
                Game.Player.draw();
                Game.Player.drawHUD();

                var name = levelNames[currentLevelIndex] || '';
                Game.Renderer.drawText(name, 448 - name.length * 5 - 8, 12, '#fff', 8);
                break;

            case 'ending':
                Game.Ending.draw();
                break;
        }
    }

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    window.addEventListener('load', function () {
        Game.Renderer.init();
        Game.Input.init();
        Game.Title.init();
        Game.Music.init();
        Game.Music.play('title');
        gameLoop();
    });
})();
