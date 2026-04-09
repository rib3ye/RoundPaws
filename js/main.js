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
    var transitionTimer = 0;
    var transitionFlash = 0;

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
                        Game.Music.sfx('collect');
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
                    state = 'level_complete';
                    transitionTimer = 0;
                    transitionFlash = 255;
                    Game.Music.stop();
                    Game.Music.sfx('flag');
                }
                break;

            case 'level_complete':
                transitionTimer++;
                if (transitionFlash > 0) transitionFlash -= 8;
                if (transitionFlash < 0) transitionFlash = 0;

                if (transitionTimer >= 120) {
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
                    var bob = Math.sin((animTimer + i * 20) * 0.0375) * 2;
                    Game.Renderer.drawSprite('carrot', cp.x, cp.y + bob, 0);
                }

                Game.Enemies.draw();
                Game.Projectile.draw();
                Game.Player.draw();
                Game.Player.drawHUD();

                var name = levelNames[currentLevelIndex] || '';
                Game.Renderer.drawText(name, 448 - name.length * 5 - 8, 12, '#fff', 8);
                break;

            case 'level_complete':
                // Keep drawing the level frozen in background
                Game.Renderer.drawLevel(currentLevel, animFrame);
                Game.Enemies.draw();
                Game.Player.draw();

                // White flash overlay fading out
                if (transitionFlash > 0) {
                    Game.Renderer.drawRect(0, 0, 448, 224, 'rgba(255,255,255,' + (transitionFlash / 255) + ')');
                }

                // Banner
                var bannerY = 70;
                Game.Renderer.drawRect(0, bannerY, 448, 50, 'rgba(0,0,0,0.7)');
                Game.Renderer.drawRect(0, bannerY, 448, 2, '#ffaa00');
                Game.Renderer.drawRect(0, bannerY + 48, 448, 2, '#ffaa00');

                // Level complete text
                Game.Renderer.drawTextCentered('LEVEL COMPLETE!', bannerY + 22, '#ffaa00', 16);
                var completedName = levelNames[currentLevelIndex] || '';
                Game.Renderer.drawTextCentered(completedName, bannerY + 38, '#ffffff', 10);

                // Stars twinkling in
                if (transitionTimer > 30) {
                    var starCount = Math.min(Math.floor((transitionTimer - 30) / 10), 5);
                    var starX = 224 - (starCount - 1) * 12;
                    for (var s = 0; s < starCount; s++) {
                        Game.Renderer.drawText('*', starX + s * 24, bannerY + 12, '#ffff44', 10);
                    }
                }
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
