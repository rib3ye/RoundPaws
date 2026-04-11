/**
 * Main Game Loop & State Machine
 *
 * Ties all modules together: runs the game loop, manages state transitions,
 * handles carrot pickups, barrel physics, and enemy collisions.
 *
 * Game states:
 *   title          — Title screen, waiting for player to press Start
 *   loading        — Loading a level file from disk
 *   playing        — Active gameplay
 *   level_complete — Victory screen (240 frame hold, then next level)
 *   ending         — Story epilogue after beating all levels
 *
 * Level progression:
 *   Level 1: "The Poop Deck"
 *   Level 2: "Below Deck"
 *   Level 3: "The Crow's Nest"
 */
window.Game = window.Game || {};

(function () {
    var TILE = 16;

    // ---------------------------------------------------------------
    // Game state
    // ---------------------------------------------------------------

    var state = 'title';
    var currentLevelIndex = 0;
    var currentLevel = null;

    var levelNames = ['The Poop Deck', 'Below Deck', "The Crow's Nest"];
    var levelFiles = ['levels/level1.txt', 'levels/level2.txt', 'levels/level3.txt'];

    // Global animation counters (shared by water tiles, carrots, flag)
    var animFrame = 0;
    var animTimer = 0;
    var flagAnimFrame = 0;

    // Level-complete transition state
    var transitionTimer = 0;
    var transitionFlash = 0;

    // Dynamic objects (re-initialized each level)
    var carrotPickups = [];
    var barrels = [];

    // Debug "No Level X" message (shown when pressing a digit for a missing level)
    var noLevelMessage = '';
    var noLevelTimer = 0;

    // ---------------------------------------------------------------
    // Level loading
    // ---------------------------------------------------------------

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
            initBarrels(level);
            state = 'playing';
            Game.Music.play('gameplay');
        });
    }

    // ---------------------------------------------------------------
    // Carrot pickups
    // ---------------------------------------------------------------

    /** Create pickup objects from level data positions. */
    function initCarrotPickups(level) {
        carrotPickups = [];
        for (var i = 0; i < level.carrots.length; i++) {
            var c = level.carrots[i];
            carrotPickups.push({
                x: c.x * TILE + 4,    // centered within tile
                y: c.y * TILE + 1,
                collected: false
            });
        }
    }

    // ---------------------------------------------------------------
    // Barrels (pushable physics objects)
    // ---------------------------------------------------------------

    /** Create barrel objects from level data positions. */
    function initBarrels(level) {
        barrels = [];
        for (var i = 0; i < level.barrels.length; i++) {
            var b = level.barrels[i];
            barrels.push({
                x: b.x * TILE,
                y: b.y * TILE,
                vx: 0
            });
        }
    }

    /** Update barrel physics: player pushing, friction, wall collision, crab crushing. */
    function updateBarrels() {
        var BARREL_FRICTION = 0.85;
        var PUSH_SPEED = 1.8;

        var px = Game.Player.getX();
        var py = Game.Player.getY();
        var pw = Game.Player.getWidth();
        var ph = Game.Player.getHeight();

        for (var i = 0; i < barrels.length; i++) {
            var b = barrels[i];

            // Check if player is overlapping this barrel
            if (px + pw > b.x && px < b.x + TILE &&
                py + ph > b.y && py < b.y + TILE) {
                var playerCenterX = px + pw / 2;
                var barrelCenterX = b.x + TILE / 2;

                // Push barrel away from player, push player back
                if (playerCenterX < barrelCenterX) {
                    b.vx = PUSH_SPEED;
                    Game.Player.setX(b.x - pw);
                } else {
                    b.vx = -PUSH_SPEED;
                    Game.Player.setX(b.x + TILE);
                }
            }

            // Apply velocity and friction
            b.x += b.vx;
            b.vx *= BARREL_FRICTION;
            if (Math.abs(b.vx) < 0.05) b.vx = 0;

            // Stop barrel at walls
            var bCol = Math.floor((b.vx > 0 ? b.x + TILE - 1 : b.x) / TILE);
            var bRow = Math.floor(b.y / TILE);
            if (Game.Level.isSolid(currentLevel, bCol, bRow)) {
                if (b.vx > 0) {
                    b.x = bCol * TILE - TILE;
                } else if (b.vx < 0) {
                    b.x = (bCol + 1) * TILE;
                }
                b.vx = 0;
            }

            // Moving barrels crush crabs on contact
            if (Math.abs(b.vx) > 0.3) {
                Game.Enemies.hitTest(b.x, b.y, TILE, TILE);
            }
        }
    }

    // ---------------------------------------------------------------
    // Main update (called once per frame)
    // ---------------------------------------------------------------

    function update() {
        Game.Input.update();

        // Global hotkeys (work in any state)
        if (Game.Input.wasPressed('mute')) {
            Game.Music.toggleMute();
        }
        if (Game.Input.wasPressed('volUp')) {
            Game.Music.setVolume(Math.min(1, Game.Music.getVolume() + 0.05));
        }
        if (Game.Input.wasPressed('volDown')) {
            Game.Music.setVolume(Math.max(0, Game.Music.getVolume() - 0.05));
        }
        if (Game.Input.wasPressed('reload')) {
            Game.Sprites.clearCache();
            Game.Sprites.loadImages(function () {});
        }

        // Debug: press 1-9 to skip directly to that level
        if (state !== 'loading') {
            for (var d = 1; d <= 9; d++) {
                if (Game.Input.wasKeyPressed('Digit' + d)) {
                    if (d <= levelFiles.length) {
                        currentLevelIndex = d - 1;
                        loadLevel(currentLevelIndex);
                    } else {
                        noLevelMessage = 'No Level ' + d;
                        noLevelTimer = 120;
                    }
                    break;
                }
            }
        }
        if (noLevelTimer > 0) noLevelTimer--;

        // Global animation timer (water, carrot bob, flag wave)
        animTimer++;
        if (animTimer > 12) {
            animTimer = 0;
            animFrame = (animFrame + 1) % 4;
            flagAnimFrame = (flagAnimFrame + 1) % 2;
        }

        // --- State machine ---

        switch (state) {
            case 'title':
                var result = Game.Title.update();
                if (result === 'start_game') {
                    startGame();
                }
                break;

            case 'playing':
                if (!Game.Player.isAlive()) break;

                // Update all gameplay systems
                var playerResult = Game.Player.update(currentLevel);
                Game.Enemies.update(currentLevel);
                Game.Projectile.update(currentLevel);
                updateBarrels();

                // Check carrot pickup collisions
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

                // Check player-enemy collision
                if (Game.Enemies.checkPlayerCollision(px, py, pw, ph)) {
                    var died = Game.Player.hit();
                    if (died) {
                        // Full death — reset level after delay
                        setTimeout(function () {
                            Game.Player.respawn();
                            Game.Projectile.clear();
                            initCarrotPickups(currentLevel);
                            initBarrels(currentLevel);
                            Game.Enemies.init(currentLevel);
                        }, 500);
                    }
                }

                // Scroll camera to follow player
                Game.Renderer.updateCamera(
                    px + pw / 2, currentLevel.width,
                    py + ph / 2, currentLevel.height
                );

                // Check for level completion (player reached the flag)
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

                // Fade out the white flash overlay
                if (transitionFlash > 0) transitionFlash -= 8;
                if (transitionFlash < 0) transitionFlash = 0;

                // After 240 frames (~4 seconds), advance to next level or ending
                if (transitionTimer >= 240) {
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

    // ---------------------------------------------------------------
    // Main draw (called once per frame, after update)
    // ---------------------------------------------------------------

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
                // Draw level tiles
                Game.Renderer.drawLevel(currentLevel, animFrame);

                // Draw flag at level exit
                if (currentLevel.flag) {
                    Game.Renderer.drawSprite('flag',
                        currentLevel.flag.x * TILE,
                        currentLevel.flag.y * TILE,
                        flagAnimFrame);
                }

                // Draw carrot pickups with gentle floating bob
                for (var i = 0; i < carrotPickups.length; i++) {
                    var cp = carrotPickups[i];
                    if (cp.collected) continue;
                    var bob = Math.sin(animTimer * 0.0075) * 2;
                    Game.Renderer.drawSprite('carrot', cp.x, cp.y + bob, 0);
                }

                // Draw barrels
                for (var bi = 0; bi < barrels.length; bi++) {
                    Game.Renderer.drawSprite('barrel', barrels[bi].x, barrels[bi].y, 0);
                }

                // Draw entities and HUD
                Game.Enemies.draw();
                Game.Projectile.draw();
                Game.Player.draw();
                Game.Player.drawHUD();

                // Level name in upper-right corner
                var name = levelNames[currentLevelIndex] || '';
                Game.Renderer.drawText(name, 448 - name.length * 5 - 8, 12, '#fff', 8);
                break;

            case 'level_complete':
                // Freeze the level scene in the background
                Game.Renderer.drawLevel(currentLevel, animFrame);
                for (var bj = 0; bj < barrels.length; bj++) {
                    Game.Renderer.drawSprite('barrel', barrels[bj].x, barrels[bj].y, 0);
                }
                Game.Enemies.draw();
                Game.Player.draw();

                // White flash overlay (fades out)
                if (transitionFlash > 0) {
                    Game.Renderer.drawRect(0, 0, 448, 224,
                        'rgba(255,255,255,' + (transitionFlash / 255) + ')');
                }

                // Victory text
                var bannerY = 70;
                Game.Renderer.drawTextCentered('LEVEL COMPLETE!', bannerY + 22, '#ffaa00', 16);
                var completedName = levelNames[currentLevelIndex] || '';
                Game.Renderer.drawTextCentered(completedName, bannerY + 38, '#ffffff', 10);
                break;

            case 'ending':
                Game.Ending.draw();
                break;
        }

        // "No Level X" debug message (visible in all states while timer > 0)
        if (noLevelTimer > 0) {
            Game.Renderer.drawTextCentered(noLevelMessage, 108, '#ff4444', 16);
        }

        // Mute indicator (visible in all states)
        if (Game.Music.isMuted()) {
            Game.Renderer.drawText('MUTED', 4, 218, '#ff4444', 8);
        }
    }

    // ---------------------------------------------------------------
    // Game loop & initialization
    // ---------------------------------------------------------------

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    window.addEventListener('load', function () {
        Game.Sprites.loadImages(function () {
            Game.Renderer.init();
            Game.Input.init();
            Game.Title.init();
            Game.Music.init();
            Game.Music.play('title');

            // Resume audio context on first user interaction (browser autoplay policy).
            // Some browsers suspend AudioContext until a user gesture occurs.
            var resumeAudio = function () {
                Game.Music.play('title');
                document.removeEventListener('keydown', resumeAudio);
                document.removeEventListener('click', resumeAudio);
            };
            document.addEventListener('keydown', resumeAudio);
            document.addEventListener('click', resumeAudio);

            gameLoop();
        });
    });
})();
