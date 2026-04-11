/**
 * Player (Round Paws the Cat)
 *
 * Handles movement, jumping, rope climbing, sliding, throwing carrots,
 * collision with the level, and death/respawn.
 *
 * Movement modes:
 *   - Ground: walk left/right, jump, slide (down+jump)
 *   - Air: reduced control, variable-height jump (hold jump)
 *   - Rope: climb up/down, jump off sideways (jump + direction)
 *   - Slide: fast forward dash that kills enemies on contact
 */
window.Game = window.Game || {};

Game.Player = (function() {
  // ---------------------------------------------------------------
  // Physics constants
  // ---------------------------------------------------------------
  var TILE = 16;

  var GRAVITY = 0.25;
  var MAX_FALL = 4.0;
  var MOVE_SPEED = 2.6;
  var FRICTION = 0.75;
  var AIR_CONTROL = 0.85; // multiplier for air acceleration

  var JUMP_FORCE = -5.2;       // initial upward velocity
  var JUMP_HOLD_FORCE = -0.07; // extra lift while holding jump
  var JUMP_HOLD_FRAMES = 14;   // max frames you can hold jump for extra height

  var ROPE_CLIMB_SPEED = 1.2;

  var SLIDE_SPEED = 3.0;
  var SLIDE_DURATION = 20; // frames

  var THROW_COOLDOWN = 15; // frames between throws

  var MAX_HEALTH = 3;
  var INVINCIBLE_FRAMES = 90; // ~1.5 seconds of invincibility after hit

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  var x, y;   // position (top-left of hitbox)
  var vx, vy; // velocity
  var width =
      12; // hitbox width (smaller than 16px tile for forgiving collisions)
  var height = 14; // hitbox height
  var facing = 1;  // 1 = right, -1 = left

  var onGround = false;
  var onRope = false;
  var jumpHeld = 0; // frames remaining for variable jump height
  var ropeUngrabCooldown = 0; // frames during which rope auto-grab is suppressed (after leaping off)

  var sliding = false;
  var slideTimer = 0;

  var carrots = 0;
  var throwCooldown = 0;
  var alive = true;
  var health = MAX_HEALTH;
  var invincible = 0; // frames remaining of invincibility

  var animFrame = 0;
  var animTimer = 0;
  var idleTimer = 0; // counts up while standing still (used for breathing bob)

  var startX, startY; // respawn position

  // ---------------------------------------------------------------
  // Init & respawn
  // ---------------------------------------------------------------

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
    ropeUngrabCooldown = 0;
    alive = true;
    health = MAX_HEALTH;
    invincible = 0;
    throwCooldown = 0;
    sliding = false;
    slideTimer = 0;
  }

  // ---------------------------------------------------------------
  // Main update (called once per frame)
  // ---------------------------------------------------------------

  function update(level) {
    if (!alive)
      return;

    if (invincible > 0) invincible--;

    var Input = Game.Input;

    // Animation — walk cycle when moving, freeze on frame 0 when idle
    var isMoving = Input.isDown('left') || Input.isDown('right');
    if (isMoving) {
      animTimer++;
      if (animTimer > 6) {
        animTimer = 0;
        animFrame = (animFrame + 1) % 4;
      }
    } else {
      animFrame = 0;
      animTimer = 0;
    }

    if (throwCooldown > 0)
      throwCooldown--;

    // Rope grab/release logic.
    // Once grabbed, the rope is sticky — the player can move horizontally
    // along it without falling off. They only release by jumping off or
    // landing on the ground.
    if (ropeUngrabCooldown > 0) {
      ropeUngrabCooldown--;
      onRope = false;
    } else if (onRope) {
      // Sticky grab: stay on rope unless we landed on solid ground
      if (onGround) onRope = false;
    } else {
      // Not on rope yet — auto-grab if center overlaps a rope tile,
      // but don't grab while walking through on the ground
      var walkingOnGround = onGround && (Input.isDown('left') || Input.isDown('right'));
      if (!walkingOnGround) {
        var tileCX = Math.floor((x + width / 2) / TILE);
        var tileCY = Math.floor((y + height / 2) / TILE);
        if (Game.Level.isRope(level, tileCX, tileCY)) {
          onRope = true;
          vx = 0; // snap to rope, drop any running momentum
        }
      }
    }

    // --- Movement modes (mutually exclusive) ---

    if (onRope) {
      updateRopeMovement(Input);
    } else if (sliding) {
      updateSlideMovement();
    } else {
      updateNormalMovement(Input);
    }

    // --- Throw carrot ---

    if (Input.wasPressed('throw') && carrots > 0 && throwCooldown === 0) {
      carrots--;
      throwCooldown = THROW_COOLDOWN;
      Game.Projectile.spawn(x + width / 2, y + height / 2 - 2, facing);
      Game.Music.sfx('shoot');
    }

    // --- Apply movement and resolve collisions ---

    x += vx;
    if (x < 0) {
      x = 0;
      vx = 0;
    } // left boundary
    var rightEdge = level.width * TILE - width;
    if (x > rightEdge) {
      x = rightEdge;
      vx = 0;
    } // right boundary
    resolveCollisionX(level);

    // Snap to whole pixel when horizontal velocity is zero to prevent jitter
    if (vx === 0) x = Math.round(x);

    y += vy;
    resolveCollisionY(level);

    // Ground probe: check 1px below feet to detect ground when gravity
    // hasn't pushed us into the tile yet (prevents 1-frame "not grounded" gaps)
    if (!onGround && vy >= 0) {
      var probeRow = Math.floor((y + height + 1) / TILE);
      var lCol = Math.floor(x / TILE);
      var rCol = Math.floor((x + width - 1) / TILE);
      for (var c = lCol; c <= rCol; c++) {
        if (Game.Level.isSolid(level, c, probeRow) ||
            Game.Level.isThinPlatform(level, c, probeRow)) {
          // Snap feet to top of ground tile to prevent sub-pixel drift
          y = probeRow * TILE - height;
          vy = 0;
          onGround = true;
          break;
        }
      }
    }

    // --- Hazards ---

    var feetRow = Math.floor((y + height) / TILE);
    var leftCol = Math.floor(x / TILE);
    var rightCol = Math.floor((x + width) / TILE);
    if (Game.Level.isWater(level, leftCol, feetRow) ||
        Game.Level.isWater(level, rightCol, feetRow)) {
      die();
    }

    // --- Flag (level exit) ---

    if (level.flag) {
      var fx = level.flag.x * TILE;
      var fy = level.flag.y * TILE;
      if (x + width > fx && x < fx + 8 && y + height > fy && y < fy + 16) {
        return 'level_complete';
      }
    }

    return 'playing';
  }

  // ---------------------------------------------------------------
  // Movement mode handlers
  // ---------------------------------------------------------------

  function updateRopeMovement(Input) {
    vy = 0;

    // Up/down climbs the rope
    if (Input.isDown('up'))
      vy = -ROPE_CLIMB_SPEED;
    if (Input.isDown('down'))
      vy = ROPE_CLIMB_SPEED;

    // Left/right physically moves the player along the rope.
    // Sticky grab keeps them attached even if they walk off the rope tile;
    // walls still stop them via the standard X collision pass.
    if (Input.isDown('left')) {
      vx -= MOVE_SPEED * 0.15;
      facing = -1;
    } else if (Input.isDown('right')) {
      vx += MOVE_SPEED * 0.15;
      facing = 1;
    }
    vx *= FRICTION;
    if (Math.abs(vx) > MOVE_SPEED) vx = MOVE_SPEED * Math.sign(vx);
    if (Math.abs(vx) < 0.05) vx = 0;

    // Jump button leaps off the rope. Holding left/right adds horizontal nudge.
    if (Input.wasPressed('jump')) {
      onRope = false;
      ropeUngrabCooldown = 20; // ~1/3 second of no auto-grab so we clear the rope
      vy = JUMP_FORCE;
      jumpHeld = JUMP_HOLD_FRAMES;
      if (Input.isDown('left')) {
        facing = -1;
        vx = -MOVE_SPEED;
      } else if (Input.isDown('right')) {
        facing = 1;
        vx = MOVE_SPEED;
      }
      Game.Music.sfx('jump');
    }
  }

  function updateSlideMovement() {
    slideTimer--;
    // Decelerate linearly over the slide duration
    vx = facing * SLIDE_SPEED * (slideTimer / SLIDE_DURATION);

    if (slideTimer <= 0) {
      sliding = false;
      vx = 0;
    }

    vy += GRAVITY;
    if (vy > MAX_FALL)
      vy = MAX_FALL;
  }

  function updateNormalMovement(Input) {
    // Horizontal movement (reduced in air)
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
    if (Math.abs(vx) > MOVE_SPEED)
      vx = MOVE_SPEED * Math.sign(vx);
    if (Math.abs(vx) < 0.05)
      vx = 0;

    // Slide attack: down + jump while on ground
    if (Input.wasPressed('jump') && onGround && Input.isDown('down')) {
      sliding = true;
      slideTimer = SLIDE_DURATION;
      vx = facing * SLIDE_SPEED;
      Game.Music.sfx('jump');
    }
    // Normal jump
    else if (Input.wasPressed('jump') && onGround) {
      vy = JUMP_FORCE;
      onGround = false;
      jumpHeld = JUMP_HOLD_FRAMES;
      Game.Music.sfx('jump');
    }

    // Variable-height jump: holding jump adds lift for several frames
    if (Input.isDown('jump') && jumpHeld > 0) {
      vy += JUMP_HOLD_FORCE;
      jumpHeld--;
    }
    if (!Input.isDown('jump'))
      jumpHeld = 0;

    vy += GRAVITY;
    if (vy > MAX_FALL)
      vy = MAX_FALL;
  }

  // ---------------------------------------------------------------
  // Collision resolution
  // ---------------------------------------------------------------

  /** Push player out of solid tiles horizontally. */
  function resolveCollisionX(level) {
    var top = Math.floor(y / TILE);
    var bottom = Math.floor((y + height - 1) / TILE);
    var left = Math.floor(x / TILE);
    var right = Math.floor((x + width - 1) / TILE);

    for (var row = top; row <= bottom; row++) {
      for (var col = left; col <= right; col++) {
        if (Game.Level.isSolid(level, col, row)) {
          if (vx > 0)
            x = col * TILE - width;
          else if (vx < 0)
            x = (col + 1) * TILE;
          vx = 0;
          x = Math.round(x); // prevent sub-pixel jitter against walls
        }
      }
    }
  }

  /** Push player out of solid tiles vertically. Also handles thin platforms. */
  function resolveCollisionY(level) {
    var top = Math.floor(y / TILE);
    var bottom = Math.floor((y + height - 1) / TILE);
    var left = Math.floor(x / TILE);
    var right = Math.floor((x + width - 1) / TILE);

    onGround = false;

    for (var row = top; row <= bottom; row++) {
      for (var col = left; col <= right; col++) {
        // Solid walls
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

        // Thin platforms: only block from above (one-way)
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

  // ---------------------------------------------------------------
  // Death & items
  // ---------------------------------------------------------------

  /** Take one hit. Returns true if the player died (health reached 0). */
  function hit() {
    if (invincible > 0) return false;
    health--;
    if (health <= 0) {
      alive = false;
      Game.Music.sfx('death');
      return true;
    }
    // Damaged but alive — knockback and invincibility
    invincible = INVINCIBLE_FRAMES;
    vy = -2; // small upward knockback
    vx = -facing * 1.5; // push away from facing direction
    Game.Music.sfx('death');
    return false;
  }

  function collectCarrot() {
    carrots++;
  }

  // ---------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------

  function draw() {
    // Flash (skip drawing every other frame) during invincibility
    if (invincible > 0 && Math.floor(invincible / 3) % 2 === 0) return;

    if (sliding) {
      var slideName = facing === 1 ? 'cat_slide' : 'cat_slide_left';
      Game.Renderer.drawSprite(slideName, x, y + 6,
                               0); // offset down to look low
    } else {
      var catName = facing === 1 ? 'cat' : 'cat_left';
      Game.Renderer.drawSprite(catName, x, y, animFrame);
    }
  }

  function drawHUD() {
    // Health hearts
    for (var i = 0; i < MAX_HEALTH; i++) {
      var hx = 4 + i * 12;
      var color = i < health ? '#ff2222' : '#442222';
      // Simple heart shape: two circles and a triangle
      Game.Renderer.drawText('\u2665', hx, 12, color, 10);
    }
    // Carrot count
    Game.Renderer.drawSpriteAbsolute('carrot', 4 + MAX_HEALTH * 12 + 4, 2, 0);
    Game.Renderer.drawText('x ' + carrots, 4 + MAX_HEALTH * 12 + 14, 12, '#ff8800', 8);
  }

  // ---------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------

  function getX() { return x; }
  function setX(val) { x = val; }
  function getY() { return y; }
  function getWidth() { return width; }
  function getHeight() { return height; }
  function isAlive() { return alive; }
  function isSliding() { return sliding; }
  function isInvincible() { return invincible > 0; }
  function getCarrots() { return carrots; }
  function setCarrots(n) { carrots = n; }

  return {
    init : init,
    update : update,
    draw : draw,
    drawHUD : drawHUD,
    respawn : respawn,
    hit : hit,
    collectCarrot : collectCarrot,
    getX : getX,
    setX : setX,
    getY : getY,
    getWidth : getWidth,
    getHeight : getHeight,
    isAlive : isAlive,
    isSliding : isSliding,
    isInvincible : isInvincible,
    getCarrots : getCarrots,
    setCarrots : setCarrots
  };
})();
