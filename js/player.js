window.Game = window.Game || {};

Game.Player = (function () {
    var TILE = 16;
    var GRAVITY = 0.09;
    var MAX_FALL = 2.0;
    var MOVE_SPEED = 1.5;
    var JUMP_FORCE = -2.5;
    var JUMP_HOLD_FORCE = -0.08;
    var JUMP_HOLD_FRAMES = 18;
    var AIR_CONTROL = 0.85;
    var FRICTION = 0.75;
    var ROPE_CLIMB_SPEED = 1.2;
    var MAX_CARROTS = 5;
    var THROW_COOLDOWN = 15;

    var x, y, vx, vy;
    var width = 12, height = 14;
    var facing = 1;
    var onGround = false;
    var onRope = false;
    var jumpHeld = 0;
    var carrots = 0;
    var throwCooldown = 0;
    var alive = true;
    var animFrame = 0;
    var animTimer = 0;
    var startX, startY;
    var sliding = false;
    var slideTimer = 0;
    var SLIDE_SPEED = 3.0;
    var SLIDE_DURATION = 20;

    function init(level) {
        startX = level.playerStart.x * TILE + 2;
        startY = level.playerStart.y * TILE + 2;
        respawn();
    }

    function respawn() {
        x = startX;
        y = startY;
        vx = 0;
        vy = 0;
        onGround = false;
        onRope = false;
        jumpHeld = 0;
        alive = true;
        throwCooldown = 0;
        sliding = false;
        slideTimer = 0;
    }

    function update(level) {
        if (!alive) return;

        var Input = Game.Input;

        var isMoving = Game.Input.isDown('left') || Game.Input.isDown('right');
        var animSpeed = isMoving ? 8 : 24;
        animTimer++;
        if (animTimer > animSpeed) {
            animTimer = 0;
            animFrame = (animFrame + 1) % 4;
        }

        if (throwCooldown > 0) throwCooldown--;

        var tileCX = Math.floor((x + width / 2) / TILE);
        var tileCY = Math.floor((y + height / 2) / TILE);
        onRope = Game.Level.isRope(level, tileCX, tileCY);

        if (onRope) {
            vy = 0;
            vx = 0;
            if (Input.isDown('up')) vy = -ROPE_CLIMB_SPEED;
            if (Input.isDown('down')) vy = ROPE_CLIMB_SPEED;
            // Jump off rope when pressing left or right while on rope
            if (Input.wasPressed('up') && (Input.isDown('left') || Input.isDown('right'))) {
                onRope = false;
                vy = JUMP_FORCE;
                jumpHeld = JUMP_HOLD_FRAMES;
                facing = Input.isDown('left') ? -1 : 1;
                vx = facing * MOVE_SPEED;
                Game.Music.sfx('jump');
            }
        } else if (sliding) {
            // Slide movement — override normal controls
            slideTimer--;
            vx = facing * SLIDE_SPEED * (slideTimer / SLIDE_DURATION);
            if (slideTimer <= 0) {
                sliding = false;
                vx = 0;
            }
            vy += GRAVITY;
            if (vy > MAX_FALL) vy = MAX_FALL;
        } else {
            var accel = onGround ? 1 : AIR_CONTROL;
            if (Input.isDown('left')) {
                vx -= MOVE_SPEED * 0.15 * accel;
                facing = -1;
            }
            if (Input.isDown('right')) {
                vx += MOVE_SPEED * 0.15 * accel;
                facing = 1;
            }
            vx *= FRICTION;
            if (Math.abs(vx) > MOVE_SPEED) vx = MOVE_SPEED * Math.sign(vx);
            if (Math.abs(vx) < 0.05) vx = 0;

            if (Input.wasPressed('up') && onGround && Input.isDown('down')) {
                sliding = true;
                slideTimer = SLIDE_DURATION;
                vx = facing * SLIDE_SPEED;
                Game.Music.sfx('jump');
            } else if (Input.wasPressed('up') && onGround) {
                vy = JUMP_FORCE;
                onGround = false;
                jumpHeld = JUMP_HOLD_FRAMES;
                Game.Music.sfx('jump');
            }
            if (Input.isDown('up') && jumpHeld > 0) {
                vy += JUMP_HOLD_FORCE;
                jumpHeld--;
            }
            if (!Input.isDown('up')) jumpHeld = 0;

            vy += GRAVITY;
            if (vy > MAX_FALL) vy = MAX_FALL;
        }

        if (Input.wasPressed('throw') && carrots > 0 && throwCooldown === 0) {
            carrots--;
            throwCooldown = THROW_COOLDOWN;
            Game.Projectile.spawn(x + width / 2, y + height / 2 - 2, facing);
            Game.Music.sfx('shoot');
        }

        x += vx;
        if (x < 0) { x = 0; vx = 0; }
        resolveCollisionX(level);

        y += vy;
        resolveCollisionY(level);

        // Ground probe: check 1px below feet for solid ground
        // Fixes frames where gravity is tiny and feet don't yet overlap the tile
        if (!onGround && vy >= 0) {
            var probeRow = Math.floor((y + height + 1) / TILE);
            var lCol = Math.floor(x / TILE);
            var rCol = Math.floor((x + width - 1) / TILE);
            for (var c = lCol; c <= rCol; c++) {
                if (Game.Level.isSolid(level, c, probeRow) || Game.Level.isThinPlatform(level, c, probeRow)) {
                    onGround = true;
                    break;
                }
            }
        }

        var feetRow = Math.floor((y + height) / TILE);
        var leftCol = Math.floor(x / TILE);
        var rightCol = Math.floor((x + width) / TILE);
        if (Game.Level.isWater(level, leftCol, feetRow) || Game.Level.isWater(level, rightCol, feetRow)) {
            die();
        }

        if (level.flag) {
            var fx = level.flag.x * TILE;
            var fy = level.flag.y * TILE;
            if (x + width > fx && x < fx + 8 && y + height > fy && y < fy + 16) {
                return 'level_complete';
            }
        }

        return 'playing';
    }

    function resolveCollisionX(level) {
        var top = Math.floor(y / TILE);
        var bottom = Math.floor((y + height - 1) / TILE);
        var left = Math.floor(x / TILE);
        var right = Math.floor((x + width - 1) / TILE);

        for (var row = top; row <= bottom; row++) {
            for (var col = left; col <= right; col++) {
                if (Game.Level.isSolid(level, col, row)) {
                    if (vx > 0) {
                        x = col * TILE - width;
                    } else if (vx < 0) {
                        x = (col + 1) * TILE;
                    }
                    vx = 0;
                }
            }
        }
    }

    function resolveCollisionY(level) {
        var top = Math.floor(y / TILE);
        var bottom = Math.floor((y + height - 1) / TILE);
        var left = Math.floor(x / TILE);
        var right = Math.floor((x + width - 1) / TILE);

        onGround = false;

        for (var row = top; row <= bottom; row++) {
            for (var col = left; col <= right; col++) {
                if (Game.Level.isSolid(level, col, row)) {
                    if (vy > 0) {
                        y = row * TILE - height;
                        vy = 0;
                        onGround = true;
                    } else if (vy < 0) {
                        y = (row + 1) * TILE;
                        vy = 0;
                    }
                }
                if (Game.Level.isThinPlatform(level, col, row) && vy > 0) {
                    var feetY = y + height;
                    var platTop = row * TILE;
                    if (feetY >= platTop && feetY <= platTop + vy + 2) {
                        y = platTop - height;
                        vy = 0;
                        onGround = true;
                    }
                }
            }
        }
    }

    function die() {
        alive = false;
        Game.Music.sfx('death');
        setTimeout(function () { respawn(); }, 500);
    }

    function collectCarrot() {
        if (carrots < MAX_CARROTS) carrots++;
    }

    function draw() {
        var spriteName;
        if (sliding) {
            spriteName = facing === 1 ? 'cat_slide' : 'cat_slide_left';
            Game.Renderer.drawSprite(spriteName, x, y + 6, 0);
        } else {
            spriteName = facing === 1 ? 'cat' : 'cat_left';
            Game.Renderer.drawSprite(spriteName, x, y, animFrame);
        }
    }

    function isSliding() { return sliding; }

    function drawHUD() {
        Game.Renderer.drawSpriteAbsolute('carrot', 4, 2, 0);
        Game.Renderer.drawText('x ' + carrots, 14, 12, '#ff8800', 8);
    }

    function getX() { return x; }
    function setX(val) { x = val; }
    function getY() { return y; }
    function getWidth() { return width; }
    function getHeight() { return height; }
    function isAlive() { return alive; }
    function getCarrots() { return carrots; }
    function setCarrots(n) { carrots = n; }

    return {
        init: init, update: update, draw: draw, drawHUD: drawHUD,
        respawn: respawn, collectCarrot: collectCarrot,
        getX: getX, setX: setX, getY: getY, getWidth: getWidth, getHeight: getHeight,
        isAlive: isAlive, isSliding: isSliding, getCarrots: getCarrots, setCarrots: setCarrots
    };
})();
