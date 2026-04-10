# The Adventure of Round Paws — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 16-bit pixel art platformer where a cat named Round Paws navigates pirate ship levels, throws carrots at crab enemies, and reaches a cozy ending sequence — all in vanilla HTML5 Canvas with zero dependencies.

**Architecture:** Single-page browser app. Game state machine (title → play → ending) drives which screen is active. Each JS file is a focused module exposing functions to the global `window.Game` namespace. Levels are parsed from plain text files at runtime. All audio is synthesized via Web Audio API.

**Tech Stack:** HTML5 Canvas 2D, vanilla JavaScript (no build step), Web Audio API for procedural music.

---

## File Structure

```
roundpaws2/
  index.html              — entry point, loads all JS, creates canvas
  css/
    game.css              — canvas centering, background, crisp pixels
  js/
    input.js              — keyboard state tracking
    sprites.js            — programmatic pixel art drawing functions
    level.js              — text file parser, tile grid, tile collision
    renderer.js           — canvas drawing, camera, tile/sprite rendering
    player.js             — Round Paws movement, physics, inventory
    enemies.js            — crab patrol AI
    projectile.js         — carrot throwing
    title.js              — title screen
    ending.js             — sleeping cat + scrolling story
    music.js              — Web Audio API drum and bass synth
    main.js               — game loop, state machine, orchestration
  levels/
    level1.txt            — The Poop Deck (easy)
    level2.txt            — Below Deck (medium)
    level3.txt            — The Crow's Nest (hard)
    README.md             — level editor guide with tile key
  test.html               — inline tests for level parser + collision
```

---

### Task 1: Project Scaffold — Git, HTML, CSS, Canvas

**Files:**
- Create: `index.html`
- Create: `css/game.css`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/noahtsutsui/Projects/roundpaws2
git init
```

- [ ] **Step 2: Create .gitignore**

Create `.gitignore`:

```
.superpowers/
.DS_Store
```

- [ ] **Step 3: Create `css/game.css`**

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: #000;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    overflow: hidden;
}

canvas {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    border: 2px solid #333;
}
```

- [ ] **Step 4: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>The Adventure of Round Paws</title>
    <link rel="stylesheet" href="css/game.css">
</head>
<body>
    <canvas id="game" width="448" height="224"></canvas>

    <script src="js/input.js"></script>
    <script src="js/sprites.js"></script>
    <script src="js/level.js"></script>
    <script src="js/renderer.js"></script>
    <script src="js/player.js"></script>
    <script src="js/enemies.js"></script>
    <script src="js/projectile.js"></script>
    <script src="js/title.js"></script>
    <script src="js/ending.js"></script>
    <script src="js/music.js"></script>
    <script src="js/main.js"></script>
</body>
</html>
```

Canvas is 448x224 (28 tiles wide x 14 tiles tall at 16px each). CSS `image-rendering: pixelated` keeps the retro look when the browser scales.

- [ ] **Step 5: Create placeholder JS files**

Create empty files so the page loads without errors. Each file creates its namespace on `window.Game`:

Create `js/input.js`:
```js
window.Game = window.Game || {};
Game.Input = {};
```

Create `js/sprites.js`:
```js
window.Game = window.Game || {};
Game.Sprites = {};
```

Create `js/level.js`:
```js
window.Game = window.Game || {};
Game.Level = {};
```

Create `js/renderer.js`:
```js
window.Game = window.Game || {};
Game.Renderer = {};
```

Create `js/player.js`:
```js
window.Game = window.Game || {};
Game.Player = {};
```

Create `js/enemies.js`:
```js
window.Game = window.Game || {};
Game.Enemies = {};
```

Create `js/projectile.js`:
```js
window.Game = window.Game || {};
Game.Projectile = {};
```

Create `js/title.js`:
```js
window.Game = window.Game || {};
Game.Title = {};
```

Create `js/ending.js`:
```js
window.Game = window.Game || {};
Game.Ending = {};
```

Create `js/music.js`:
```js
window.Game = window.Game || {};
Game.Music = {};
```

Create `js/main.js`:
```js
window.Game = window.Game || {};
// Game loop will go here
```

- [ ] **Step 6: Verify page loads**

Open `index.html` in browser. Should see a black page with a dark-bordered canvas. No console errors.

- [ ] **Step 7: Commit**

```bash
git add .gitignore index.html css/game.css js/*.js
git commit -m "scaffold: project structure with canvas and empty modules"
```

---

### Task 2: Input System

**Files:**
- Modify: `js/input.js`

- [ ] **Step 1: Implement input.js**

Replace `js/input.js` with:

```js
window.Game = window.Game || {};

Game.Input = (function () {
    var keys = {};
    var justPressed = {};
    var prevKeys = {};

    function init() {
        window.addEventListener('keydown', function (e) {
            keys[e.code] = true;
            e.preventDefault();
        });
        window.addEventListener('keyup', function (e) {
            keys[e.code] = false;
            e.preventDefault();
        });
    }

    function update() {
        for (var code in keys) {
            justPressed[code] = keys[code] && !prevKeys[code];
        }
        for (var code in prevKeys) {
            if (!keys[code]) justPressed[code] = false;
        }
        for (var code in keys) {
            prevKeys[code] = keys[code];
        }
    }

    function isDown(action) {
        switch (action) {
            case 'left':  return keys['ArrowLeft'] || keys['KeyA'];
            case 'right': return keys['ArrowRight'] || keys['KeyD'];
            case 'up':    return keys['ArrowUp'] || keys['KeyW'] || keys['Space'];
            case 'down':  return keys['ArrowDown'] || keys['KeyS'];
            case 'throw': return keys['KeyX'] || keys['KeyZ'];
            case 'start': return keys['Enter'] || keys['Space'];
            default: return false;
        }
    }

    function wasPressed(action) {
        switch (action) {
            case 'left':  return justPressed['ArrowLeft'] || justPressed['KeyA'];
            case 'right': return justPressed['ArrowRight'] || justPressed['KeyD'];
            case 'up':    return justPressed['ArrowUp'] || justPressed['KeyW'] || justPressed['Space'];
            case 'down':  return justPressed['ArrowDown'] || justPressed['KeyS'];
            case 'throw': return justPressed['KeyX'] || justPressed['KeyZ'];
            case 'start': return justPressed['Enter'] || justPressed['Space'];
            default: return false;
        }
    }

    return { init: init, update: update, isDown: isDown, wasPressed: wasPressed };
})();
```

- [ ] **Step 2: Verify input loads without error**

Open `index.html`, open console. Type `Game.Input.init()` — no error. Press keys, type `Game.Input.isDown('left')` while holding left arrow — should return true.

- [ ] **Step 3: Commit**

```bash
git add js/input.js
git commit -m "feat: keyboard input system with action mapping"
```

---

### Task 3: Sprite System — Programmatic Pixel Art

**Files:**
- Modify: `js/sprites.js`

All sprites are drawn programmatically onto offscreen canvases. Each sprite function draws at 1x scale (16x16 pixels etc.) and caches the result.

- [ ] **Step 1: Implement sprites.js with all game sprites**

Replace `js/sprites.js` with:

```js
window.Game = window.Game || {};

Game.Sprites = (function () {
    var cache = {};

    function createCanvas(w, h) {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }

    function px(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
    }

    function rect(ctx, x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    }

    // Round Paws — 16x16, facing right
    function drawCat(ctx, frame) {
        var f = frame || 0;
        // Body
        rect(ctx, 4, 4, 8, 8, '#222');
        // White triangle mouth area
        rect(ctx, 6, 7, 4, 1, '#fff');
        rect(ctx, 7, 8, 2, 1, '#fff');
        // Nose
        px(ctx, 7, 7, '#f99');
        px(ctx, 8, 7, '#f99');
        // Eyes - green
        rect(ctx, 5, 5, 2, 2, '#4f4');
        rect(ctx, 9, 5, 2, 2, '#4f4');
        // Pupils
        px(ctx, 6, 5, '#0a0');
        px(ctx, 10, 5, '#0a0');
        // Ears
        px(ctx, 4, 3, '#222');
        px(ctx, 5, 2, '#222');
        px(ctx, 5, 3, '#222');
        px(ctx, 11, 3, '#222');
        px(ctx, 10, 2, '#222');
        px(ctx, 10, 3, '#222');
        // Inner ears
        px(ctx, 5, 3, '#a0407a');
        px(ctx, 10, 3, '#a0407a');
        // Legs - animate
        if (f % 2 === 0) {
            rect(ctx, 5, 12, 2, 2, '#222');
            rect(ctx, 9, 12, 2, 2, '#222');
        } else {
            rect(ctx, 4, 12, 2, 2, '#222');
            rect(ctx, 10, 12, 2, 2, '#222');
        }
        // Tail
        px(ctx, 12, 6, '#222');
        px(ctx, 13, 5, '#222');
        px(ctx, 13, 4, '#222');
    }

    // Happy cat for title screen — 32x32
    function drawHappyCat(ctx) {
        // Larger body
        rect(ctx, 8, 8, 16, 14, '#222');
        // White triangle
        rect(ctx, 12, 14, 8, 2, '#fff');
        rect(ctx, 13, 16, 6, 2, '#fff');
        rect(ctx, 14, 18, 4, 1, '#fff');
        // Nose
        rect(ctx, 15, 14, 2, 1, '#f99');
        // Happy eyes (^_^) — arcs as pixels
        px(ctx, 11, 11, '#4f4');
        px(ctx, 12, 10, '#4f4');
        px(ctx, 13, 11, '#4f4');
        px(ctx, 19, 11, '#4f4');
        px(ctx, 20, 10, '#4f4');
        px(ctx, 21, 11, '#4f4');
        // Ears
        rect(ctx, 8, 5, 2, 3, '#222');
        px(ctx, 9, 4, '#222');
        px(ctx, 10, 5, '#222');
        rect(ctx, 22, 5, 2, 3, '#222');
        px(ctx, 23, 4, '#222');
        px(ctx, 22, 5, '#222');
        // Inner ears
        px(ctx, 9, 6, '#a0407a');
        px(ctx, 22, 6, '#a0407a');
        // Paws
        rect(ctx, 10, 22, 4, 3, '#222');
        rect(ctx, 18, 22, 4, 3, '#222');
        // Tail up (happy!)
        px(ctx, 24, 12, '#222');
        px(ctx, 25, 11, '#222');
        px(ctx, 26, 10, '#222');
        px(ctx, 26, 9, '#222');
        px(ctx, 25, 8, '#222');
        // Mouth smile
        px(ctx, 14, 19, '#f99');
        px(ctx, 15, 20, '#f99');
        px(ctx, 16, 20, '#f99');
        px(ctx, 17, 19, '#f99');
    }

    // Sleeping cat for ending — 32x16
    function drawSleepingCat(ctx, frame) {
        var f = frame || 0;
        // Curled body — horizontal oval
        rect(ctx, 6, 4, 20, 10, '#222');
        rect(ctx, 4, 6, 24, 6, '#222');
        // Head tucked in
        rect(ctx, 2, 4, 8, 8, '#222');
        // White triangle on sleeping face
        rect(ctx, 3, 7, 4, 1, '#fff');
        rect(ctx, 4, 8, 2, 1, '#fff');
        // Closed eyes — horizontal lines
        rect(ctx, 3, 5, 3, 1, '#4f4');
        rect(ctx, 7, 5, 3, 1, '#4f4');
        // Ears
        px(ctx, 2, 3, '#222');
        px(ctx, 3, 2, '#222');
        px(ctx, 8, 3, '#222');
        px(ctx, 9, 2, '#222');
        // Tail wrapped around
        px(ctx, 26, 6, '#222');
        px(ctx, 27, 5, '#222');
        px(ctx, 28, 5, '#222');
        px(ctx, 29, 6, '#222');
        // Zzz — animate
        if (f % 3 === 0) {
            // nothing extra
        } else if (f % 3 === 1) {
            rect(ctx, 12, 1, 1, 1, '#88f');
        } else {
            rect(ctx, 12, 1, 1, 1, '#88f');
            rect(ctx, 14, 0, 1, 1, '#66d');
        }
    }

    // Crab — 16x12
    function drawCrab(ctx, frame) {
        var f = frame || 0;
        // Body
        rect(ctx, 3, 4, 10, 6, '#e44');
        rect(ctx, 4, 3, 8, 1, '#e44');
        // Eye stalks
        rect(ctx, 4, 1, 2, 3, '#e44');
        rect(ctx, 10, 1, 2, 3, '#e44');
        // Eyes
        px(ctx, 4, 1, '#111');
        px(ctx, 5, 1, '#111');
        px(ctx, 10, 1, '#111');
        px(ctx, 11, 1, '#111');
        // Claws — animate
        if (f % 2 === 0) {
            rect(ctx, 0, 4, 3, 3, '#e44');
            rect(ctx, 13, 4, 3, 3, '#e44');
        } else {
            rect(ctx, 0, 3, 3, 3, '#e44');
            rect(ctx, 13, 3, 3, 3, '#e44');
        }
        // Legs
        rect(ctx, 4, 10, 2, 2, '#c33');
        rect(ctx, 7, 10, 2, 2, '#c33');
        rect(ctx, 10, 10, 2, 2, '#c33');
    }

    // Carrot pickup — 8x14
    function drawCarrot(ctx, bobOffset) {
        var y = bobOffset || 0;
        // Orange body
        rect(ctx, 3, 4 + y, 2, 8, '#f80');
        rect(ctx, 2, 6 + y, 4, 4, '#f80');
        px(ctx, 4, 11 + y, '#f80');
        px(ctx, 3, 12 + y, '#e70');
        // Green top
        rect(ctx, 2, 2 + y, 4, 3, '#4a4');
        px(ctx, 3, 1 + y, '#4a4');
        px(ctx, 4, 1 + y, '#4a4');
    }

    // Carrot projectile — 8x4 horizontal
    function drawCarrotProjectile(ctx) {
        rect(ctx, 0, 1, 6, 2, '#f80');
        rect(ctx, 6, 1, 2, 2, '#4a4');
        px(ctx, 0, 2, '#e70');
    }

    // Flag — 8x16
    function drawFlag(ctx, frame) {
        var f = frame || 0;
        // Pole
        rect(ctx, 1, 0, 2, 16, '#aa8');
        // Flag cloth — animate wave
        var offset = (f % 2 === 0) ? 0 : 1;
        rect(ctx, 3, 1 + offset, 5, 5, '#f22');
        rect(ctx, 3, 2 + offset, 4, 3, '#f44');
        // Skull on flag
        px(ctx, 5, 3 + offset, '#fff');
        px(ctx, 6, 3 + offset, '#fff');
    }

    // Tiles
    function drawWoodPlank(ctx) {
        rect(ctx, 0, 0, 16, 16, '#8B4513');
        rect(ctx, 0, 0, 16, 2, '#A0522D');
        // Plank line
        rect(ctx, 7, 2, 1, 14, '#6B3410');
        // Nail dots
        px(ctx, 2, 1, '#555');
        px(ctx, 13, 1, '#555');
    }

    function drawHullWall(ctx) {
        rect(ctx, 0, 0, 16, 16, '#5C3310');
        rect(ctx, 0, 0, 16, 1, '#6B3410');
        // Wood grain
        rect(ctx, 3, 4, 10, 1, '#4A2508');
        rect(ctx, 1, 9, 14, 1, '#4A2508');
        rect(ctx, 4, 13, 8, 1, '#4A2508');
    }

    function drawWater(ctx, frame) {
        var f = frame || 0;
        rect(ctx, 0, 0, 16, 16, '#1a3a8c');
        // Animated wave highlight
        var offset = (f % 4) * 4;
        rect(ctx, (0 + offset) % 16, 2, 4, 1, '#2a5aac');
        rect(ctx, (8 + offset) % 16, 6, 4, 1, '#2a5aac');
    }

    function drawRope(ctx) {
        rect(ctx, 7, 0, 2, 16, '#c8a86e');
        // Rope texture
        px(ctx, 7, 2, '#aa8844');
        px(ctx, 8, 5, '#aa8844');
        px(ctx, 7, 8, '#aa8844');
        px(ctx, 8, 11, '#aa8844');
        px(ctx, 7, 14, '#aa8844');
    }

    function drawBarrel(ctx) {
        rect(ctx, 2, 1, 12, 14, '#8B6914');
        rect(ctx, 1, 3, 14, 10, '#8B6914');
        // Metal bands
        rect(ctx, 1, 4, 14, 1, '#777');
        rect(ctx, 1, 11, 14, 1, '#777');
        // Highlight
        rect(ctx, 5, 2, 2, 12, '#9B7924');
    }

    function drawMast(ctx) {
        rect(ctx, 6, 0, 4, 16, '#aa8');
        rect(ctx, 7, 0, 2, 16, '#bb9');
    }

    function drawThinPlatform(ctx) {
        rect(ctx, 0, 0, 16, 3, '#A0522D');
        rect(ctx, 0, 0, 16, 1, '#BF6530');
        // Plank lines
        px(ctx, 5, 1, '#8B4513');
        px(ctx, 11, 1, '#8B4513');
    }

    // Get or create a cached sprite
    function get(name, frame) {
        var key = name + '_' + (frame || 0);
        if (cache[key]) return cache[key];

        var c, ctx;
        switch (name) {
            case 'cat':
                c = createCanvas(16, 16);
                ctx = c.getContext('2d');
                drawCat(ctx, frame);
                break;
            case 'cat_left':
                // Draw then flip
                c = createCanvas(16, 16);
                ctx = c.getContext('2d');
                ctx.save();
                ctx.scale(-1, 1);
                ctx.translate(-16, 0);
                drawCat(ctx, frame);
                ctx.restore();
                break;
            case 'happy_cat':
                c = createCanvas(32, 32);
                ctx = c.getContext('2d');
                drawHappyCat(ctx);
                break;
            case 'sleeping_cat':
                c = createCanvas(32, 16);
                ctx = c.getContext('2d');
                drawSleepingCat(ctx, frame);
                break;
            case 'crab':
                c = createCanvas(16, 12);
                ctx = c.getContext('2d');
                drawCrab(ctx, frame);
                break;
            case 'carrot':
                c = createCanvas(8, 14);
                ctx = c.getContext('2d');
                drawCarrot(ctx, 0);
                break;
            case 'carrot_projectile':
                c = createCanvas(8, 4);
                ctx = c.getContext('2d');
                drawCarrotProjectile(ctx);
                break;
            case 'carrot_projectile_left':
                c = createCanvas(8, 4);
                ctx = c.getContext('2d');
                ctx.save();
                ctx.scale(-1, 1);
                ctx.translate(-8, 0);
                drawCarrotProjectile(ctx);
                ctx.restore();
                break;
            case 'flag':
                c = createCanvas(8, 16);
                ctx = c.getContext('2d');
                drawFlag(ctx, frame);
                break;
            case 'wood_plank':
                c = createCanvas(16, 16);
                ctx = c.getContext('2d');
                drawWoodPlank(ctx);
                break;
            case 'hull_wall':
                c = createCanvas(16, 16);
                ctx = c.getContext('2d');
                drawHullWall(ctx);
                break;
            case 'water':
                c = createCanvas(16, 16);
                ctx = c.getContext('2d');
                drawWater(ctx, frame);
                break;
            case 'rope':
                c = createCanvas(16, 16);
                ctx = c.getContext('2d');
                drawRope(ctx);
                break;
            case 'barrel':
                c = createCanvas(16, 16);
                ctx = c.getContext('2d');
                drawBarrel(ctx);
                break;
            case 'mast':
                c = createCanvas(16, 16);
                ctx = c.getContext('2d');
                drawMast(ctx);
                break;
            case 'thin_platform':
                c = createCanvas(16, 16);
                ctx = c.getContext('2d');
                drawThinPlatform(ctx);
                break;
            default:
                c = createCanvas(16, 16);
                ctx = c.getContext('2d');
                rect(ctx, 0, 0, 16, 16, '#f0f'); // magenta = missing sprite
        }

        cache[key] = c;
        return c;
    }

    function clearCache() {
        cache = {};
    }

    return { get: get, clearCache: clearCache };
})();
```

- [ ] **Step 2: Verify sprites render**

Open browser console and run:

```js
var c = document.getElementById('game');
var ctx = c.getContext('2d');
ctx.drawImage(Game.Sprites.get('cat', 0), 100, 100);
ctx.drawImage(Game.Sprites.get('crab', 0), 130, 104);
ctx.drawImage(Game.Sprites.get('carrot'), 80, 100);
ctx.drawImage(Game.Sprites.get('wood_plank'), 96, 116);
ctx.drawImage(Game.Sprites.get('hull_wall'), 112, 116);
```

Should see a tiny cat, crab, carrot, and tiles on screen. Very small at 1x — they'll be scaled up by the renderer.

- [ ] **Step 3: Commit**

```bash
git add js/sprites.js
git commit -m "feat: programmatic pixel art sprites for all game entities and tiles"
```

---

### Task 4: Level Parser with Tests

**Files:**
- Modify: `js/level.js`
- Create: `test.html`

- [ ] **Step 1: Create test.html with level parser tests**

Create `test.html`:

```html
<!DOCTYPE html>
<html>
<head><title>Round Paws Tests</title></head>
<body>
<pre id="output"></pre>
<script src="js/input.js"></script>
<script src="js/sprites.js"></script>
<script src="js/level.js"></script>
<script>
var passed = 0, failed = 0;

function assert(condition, name) {
    if (condition) {
        passed++;
        log('PASS: ' + name);
    } else {
        failed++;
        log('FAIL: ' + name);
    }
}

function log(msg) {
    document.getElementById('output').textContent += msg + '\n';
}

// Test 1: Parse a simple level
(function testParsesGrid() {
    var txt = '...\n=.=\n~~~';
    var level = Game.Level.parse(txt);
    assert(level.grid.length === 3, 'parse: 3 rows');
    assert(level.grid[0].length === 3, 'parse: 3 cols');
    assert(level.grid[0][0] === '.', 'parse: air at 0,0');
    assert(level.grid[1][0] === '=', 'parse: plank at 1,0');
    assert(level.grid[2][1] === '~', 'parse: water at 2,1');
    assert(level.width === 3, 'parse: width 3');
    assert(level.height === 3, 'parse: height 3');
})();

// Test 2: Extracts player start
(function testPlayerStart() {
    var txt = '...\n.P.\n===';
    var level = Game.Level.parse(txt);
    assert(level.playerStart.x === 1, 'player start x=1');
    assert(level.playerStart.y === 1, 'player start y=1');
    assert(level.grid[1][1] === '.', 'player tile replaced with air');
})();

// Test 3: Extracts enemies
(function testEnemies() {
    var txt = '...\n.C.\n===';
    var level = Game.Level.parse(txt);
    assert(level.enemies.length === 1, 'one enemy');
    assert(level.enemies[0].x === 1, 'enemy at x=1');
    assert(level.enemies[0].y === 1, 'enemy at y=1');
    assert(level.grid[1][1] === '.', 'enemy tile replaced with air');
})();

// Test 4: Extracts carrot pickups
(function testCarrots() {
    var txt = 'K.K\n...\n===';
    var level = Game.Level.parse(txt);
    assert(level.carrots.length === 2, 'two carrots');
    assert(level.grid[0][0] === '.', 'carrot tile replaced with air');
})();

// Test 5: Extracts flag
(function testFlag() {
    var txt = '..F\n...\n===';
    var level = Game.Level.parse(txt);
    assert(level.flag.x === 2, 'flag at x=2');
    assert(level.flag.y === 0, 'flag at y=0');
})();

// Test 6: Strips comment lines
(function testComments() {
    var txt = '# This is a comment\n...\n===';
    var level = Game.Level.parse(txt);
    assert(level.grid.length === 2, 'comments stripped, 2 rows');
})();

// Test 7: isSolid checks
(function testIsSolid() {
    var txt = '.=\n#B';
    var level = Game.Level.parse(txt);
    assert(!Game.Level.isSolid(level, 0, 0), 'air not solid');
    assert(Game.Level.isSolid(level, 1, 0), 'plank is solid');
    assert(Game.Level.isSolid(level, 0, 1), 'hull is solid');
    assert(Game.Level.isSolid(level, 1, 1), 'barrel is solid');
    assert(!Game.Level.isSolid(level, 5, 5), 'out of bounds not solid');
})();

// Test 8: isWater checks
(function testIsWater() {
    var txt = '.~';
    var level = Game.Level.parse(txt);
    assert(!Game.Level.isWater(level, 0, 0), 'air not water');
    assert(Game.Level.isWater(level, 1, 0), 'water is water');
})();

// Test 9: isThinPlatform
(function testThinPlatform() {
    var txt = '.-';
    var level = Game.Level.parse(txt);
    assert(!Game.Level.isThinPlatform(level, 0, 0), 'air not thin platform');
    assert(Game.Level.isThinPlatform(level, 1, 0), 'dash is thin platform');
})();

// Test 10: isRope
(function testRope() {
    var txt = '.R';
    var level = Game.Level.parse(txt);
    assert(Game.Level.isRope(level, 1, 0), 'R is rope');
    assert(!Game.Level.isRope(level, 0, 0), 'air not rope');
})();

log('\n' + passed + ' passed, ' + failed + ' failed');
</script>
</body>
</html>
```

- [ ] **Step 2: Open test.html — all tests should FAIL**

Open `test.html` in browser. Tests will error because `Game.Level.parse` doesn't exist yet. This is expected.

- [ ] **Step 3: Implement level.js**

Replace `js/level.js` with:

```js
window.Game = window.Game || {};

Game.Level = (function () {
    var TILE = 16;
    var SOLID_TILES = { '=': true, '#': true, 'B': true };
    var ENTITY_TILES = { 'P': true, 'C': true, 'K': true, 'F': true };

    function parse(text) {
        var lines = text.split('\n').filter(function (line) {
            return line.length > 0 && line[0] !== '#';
        });

        var grid = [];
        var enemies = [];
        var carrots = [];
        var playerStart = { x: 0, y: 0 };
        var flag = { x: 0, y: 0 };

        for (var row = 0; row < lines.length; row++) {
            var gridRow = [];
            for (var col = 0; col < lines[row].length; col++) {
                var ch = lines[row][col];
                if (ch === 'P') {
                    playerStart = { x: col, y: row };
                    gridRow.push('.');
                } else if (ch === 'C') {
                    enemies.push({ x: col, y: row });
                    gridRow.push('.');
                } else if (ch === 'K') {
                    carrots.push({ x: col, y: row });
                    gridRow.push('.');
                } else if (ch === 'F') {
                    flag = { x: col, y: row };
                    gridRow.push('.');
                } else {
                    gridRow.push(ch);
                }
            }
            grid.push(gridRow);
        }

        var width = grid.length > 0 ? grid[0].length : 0;

        return {
            grid: grid,
            width: width,
            height: grid.length,
            playerStart: playerStart,
            enemies: enemies,
            carrots: carrots,
            flag: flag
        };
    }

    function getTile(level, col, row) {
        if (row < 0 || row >= level.height || col < 0 || col >= level.width) return '.';
        return level.grid[row][col];
    }

    function isSolid(level, col, row) {
        return SOLID_TILES[getTile(level, col, row)] === true;
    }

    function isWater(level, col, row) {
        return getTile(level, col, row) === '~';
    }

    function isThinPlatform(level, col, row) {
        return getTile(level, col, row) === '-';
    }

    function isRope(level, col, row) {
        return getTile(level, col, row) === 'R';
    }

    function load(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.onload = function () {
            if (xhr.status === 200) {
                callback(parse(xhr.responseText));
            }
        };
        xhr.send();
    }

    return {
        TILE: TILE,
        parse: parse,
        getTile: getTile,
        isSolid: isSolid,
        isWater: isWater,
        isThinPlatform: isThinPlatform,
        isRope: isRope,
        load: load
    };
})();
```

- [ ] **Step 4: Run tests — all should PASS**

Refresh `test.html`. Should see all 10 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add js/level.js test.html
git commit -m "feat: level parser with tile queries and passing tests"
```

---

### Task 5: Renderer — Camera, Tiles, Sprites

**Files:**
- Modify: `js/renderer.js`

- [ ] **Step 1: Implement renderer.js**

Replace `js/renderer.js` with:

```js
window.Game = window.Game || {};

Game.Renderer = (function () {
    var canvas, ctx;
    var TILE = 16;
    var SCALE = 2;
    var camera = { x: 0 };
    var canvasW, canvasH;

    function init() {
        canvas = document.getElementById('game');
        // Set canvas to scaled resolution
        canvas.width = 448;
        canvas.height = 224;
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        canvasW = canvas.width;
        canvasH = canvas.height;
    }

    function clear() {
        ctx.fillStyle = '#0a1a3c';
        ctx.fillRect(0, 0, canvasW, canvasH);
    }

    function updateCamera(playerX, levelWidth) {
        var target = playerX - canvasW / 2;
        camera.x += (target - camera.x) * 0.1; // smooth lerp
        // Clamp
        var maxX = levelWidth * TILE - canvasW;
        if (camera.x < 0) camera.x = 0;
        if (camera.x > maxX) camera.x = maxX;
    }

    function resetCamera() {
        camera.x = 0;
    }

    function drawLevel(level, animFrame) {
        var startCol = Math.floor(camera.x / TILE);
        var endCol = startCol + Math.ceil(canvasW / TILE) + 1;
        if (endCol > level.width) endCol = level.width;

        for (var row = 0; row < level.height; row++) {
            for (var col = startCol; col < endCol; col++) {
                var tile = level.grid[row][col];
                var screenX = col * TILE - camera.x;
                var screenY = row * TILE;
                var sprite = null;

                switch (tile) {
                    case '=': sprite = Game.Sprites.get('wood_plank'); break;
                    case '#': sprite = Game.Sprites.get('hull_wall'); break;
                    case '~': sprite = Game.Sprites.get('water', animFrame); break;
                    case 'R': sprite = Game.Sprites.get('rope'); break;
                    case 'B': sprite = Game.Sprites.get('barrel'); break;
                    case 'M': sprite = Game.Sprites.get('mast'); break;
                    case '-': sprite = Game.Sprites.get('thin_platform'); break;
                }

                if (sprite) {
                    ctx.drawImage(sprite, Math.round(screenX), Math.round(screenY));
                }
            }
        }
    }

    function drawSprite(spriteName, x, y, frame) {
        var sprite = Game.Sprites.get(spriteName, frame);
        ctx.drawImage(sprite, Math.round(x - camera.x), Math.round(y));
    }

    function drawSpriteAbsolute(spriteName, x, y, frame) {
        var sprite = Game.Sprites.get(spriteName, frame);
        ctx.drawImage(sprite, Math.round(x), Math.round(y));
    }

    function drawText(text, x, y, color, size) {
        ctx.fillStyle = color || '#fff';
        ctx.font = (size || 8) + 'px monospace';
        ctx.fillText(text, x, y);
    }

    function drawTextCentered(text, y, color, size) {
        ctx.fillStyle = color || '#fff';
        ctx.font = (size || 8) + 'px monospace';
        var w = ctx.measureText(text).width;
        ctx.fillText(text, (canvasW - w) / 2, y);
    }

    function drawRect(x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    }

    function getWidth() { return canvasW; }
    function getHeight() { return canvasH; }
    function getCtx() { return ctx; }
    function getCameraX() { return camera.x; }

    return {
        init: init,
        clear: clear,
        updateCamera: updateCamera,
        resetCamera: resetCamera,
        drawLevel: drawLevel,
        drawSprite: drawSprite,
        drawSpriteAbsolute: drawSpriteAbsolute,
        drawText: drawText,
        drawTextCentered: drawTextCentered,
        drawRect: drawRect,
        getWidth: getWidth,
        getHeight: getHeight,
        getCtx: getCtx,
        getCameraX: getCameraX
    };
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/renderer.js
git commit -m "feat: canvas renderer with camera, tile drawing, and text"
```

---

### Task 6: Player — Movement, Physics, Inventory

**Files:**
- Modify: `js/player.js`

- [ ] **Step 1: Implement player.js**

Replace `js/player.js` with:

```js
window.Game = window.Game || {};

Game.Player = (function () {
    var TILE = 16;
    var GRAVITY = 0.15;
    var MAX_FALL = 2.5;
    var MOVE_SPEED = 1.5;
    var JUMP_FORCE = -3.2;
    var JUMP_HOLD_FORCE = -0.12;
    var JUMP_HOLD_FRAMES = 12;
    var AIR_CONTROL = 0.85;
    var FRICTION = 0.75;
    var ROPE_CLIMB_SPEED = 1.2;
    var MAX_CARROTS = 5;
    var THROW_COOLDOWN = 15;

    var x, y, vx, vy;
    var width = 12, height = 14;
    var facing = 1; // 1 = right, -1 = left
    var onGround = false;
    var onRope = false;
    var jumpHeld = 0;
    var carrots = 0;
    var throwCooldown = 0;
    var alive = true;
    var animFrame = 0;
    var animTimer = 0;
    var startX, startY;

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
    }

    function update(level) {
        if (!alive) return;

        var Input = Game.Input;

        // Animation
        animTimer++;
        if (animTimer > 8) {
            animTimer = 0;
            animFrame = (animFrame + 1) % 4;
        }

        // Throw cooldown
        if (throwCooldown > 0) throwCooldown--;

        // Check rope
        var tileCX = Math.floor((x + width / 2) / TILE);
        var tileCY = Math.floor((y + height / 2) / TILE);
        var wasOnRope = onRope;
        onRope = Game.Level.isRope(level, tileCX, tileCY);

        if (onRope) {
            // Rope movement
            vy = 0;
            vx = 0;
            if (Input.isDown('up')) vy = -ROPE_CLIMB_SPEED;
            if (Input.isDown('down')) vy = ROPE_CLIMB_SPEED;
            if (Input.wasPressed('up') && !Input.isDown('down')) {
                // Jump off rope
                if (Input.isDown('left') || Input.isDown('right')) {
                    onRope = false;
                    vy = JUMP_FORCE;
                    jumpHeld = 0;
                }
            }
        } else {
            // Horizontal movement
            var accel = onGround ? 1 : AIR_CONTROL;
            if (Input.isDown('left')) {
                vx -= MOVE_SPEED * 0.15 * accel;
                facing = -1;
            }
            if (Input.isDown('right')) {
                vx += MOVE_SPEED * 0.15 * accel;
                facing = 1;
            }
            // Friction
            vx *= FRICTION;
            if (Math.abs(vx) > MOVE_SPEED) vx = MOVE_SPEED * Math.sign(vx);
            if (Math.abs(vx) < 0.05) vx = 0;

            // Jump
            if (Input.wasPressed('up') && onGround) {
                vy = JUMP_FORCE;
                onGround = false;
                jumpHeld = JUMP_HOLD_FRAMES;
            }
            // Hold jump for higher
            if (Input.isDown('up') && jumpHeld > 0) {
                vy += JUMP_HOLD_FORCE;
                jumpHeld--;
            }
            if (!Input.isDown('up')) jumpHeld = 0;

            // Gravity
            vy += GRAVITY;
            if (vy > MAX_FALL) vy = MAX_FALL;
        }

        // Throw carrot
        if (Input.wasPressed('throw') && carrots > 0 && throwCooldown === 0) {
            carrots--;
            throwCooldown = THROW_COOLDOWN;
            Game.Projectile.spawn(x + width / 2, y + height / 2 - 2, facing);
        }

        // Move X and collide
        x += vx;
        resolveCollisionX(level);

        // Move Y and collide
        y += vy;
        resolveCollisionY(level);

        // Check water
        var feetRow = Math.floor((y + height) / TILE);
        var leftCol = Math.floor(x / TILE);
        var rightCol = Math.floor((x + width) / TILE);
        if (Game.Level.isWater(level, leftCol, feetRow) || Game.Level.isWater(level, rightCol, feetRow)) {
            die();
        }

        // Check flag
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
                // Thin platform — only collide from above
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
        setTimeout(function () { respawn(); }, 500);
    }

    function collectCarrot() {
        if (carrots < MAX_CARROTS) carrots++;
    }

    function draw() {
        var spriteName = facing === 1 ? 'cat' : 'cat_left';
        Game.Renderer.drawSprite(spriteName, x, y, animFrame);
    }

    function drawHUD() {
        // Carrot count
        Game.Renderer.drawSpriteAbsolute('carrot', 4, 2, 0);
        Game.Renderer.drawText('x ' + carrots, 14, 12, '#ff8800', 8);
    }

    function getX() { return x; }
    function getY() { return y; }
    function getWidth() { return width; }
    function getHeight() { return height; }
    function isAlive() { return alive; }
    function getCarrots() { return carrots; }
    function setCarrots(n) { carrots = n; }

    return {
        init: init,
        update: update,
        draw: draw,
        drawHUD: drawHUD,
        respawn: respawn,
        collectCarrot: collectCarrot,
        getX: getX,
        getY: getY,
        getWidth: getWidth,
        getHeight: getHeight,
        isAlive: isAlive,
        getCarrots: getCarrots,
        setCarrots: setCarrots
    };
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/player.js
git commit -m "feat: player with floaty physics, rope climbing, carrot inventory"
```

---

### Task 7: Enemies — Crab Patrol

**Files:**
- Modify: `js/enemies.js`

- [ ] **Step 1: Implement enemies.js**

Replace `js/enemies.js` with:

```js
window.Game = window.Game || {};

Game.Enemies = (function () {
    var TILE = 16;
    var SPEED = 0.5;
    var crabs = [];
    var animFrame = 0;
    var animTimer = 0;

    function init(level) {
        crabs = [];
        for (var i = 0; i < level.enemies.length; i++) {
            var e = level.enemies[i];
            crabs.push({
                x: e.x * TILE,
                y: e.y * TILE + 4, // crabs are 12px tall, offset to sit on tiles
                width: 16,
                height: 12,
                vx: SPEED,
                alive: true,
                flashTimer: 0
            });
        }
    }

    function update(level) {
        animTimer++;
        if (animTimer > 10) {
            animTimer = 0;
            animFrame = (animFrame + 1) % 2;
        }

        for (var i = 0; i < crabs.length; i++) {
            var c = crabs[i];
            if (!c.alive) {
                if (c.flashTimer > 0) c.flashTimer--;
                continue;
            }

            c.x += c.vx;

            // Check wall collision
            var frontCol = Math.floor((c.vx > 0 ? c.x + c.width : c.x) / TILE);
            var row = Math.floor((c.y + c.height - 2) / TILE);
            if (Game.Level.isSolid(level, frontCol, row)) {
                c.vx = -c.vx;
            }

            // Check edge — reverse if no ground ahead
            var aheadCol = Math.floor((c.vx > 0 ? c.x + c.width + 2 : c.x - 2) / TILE);
            var belowRow = row + 1;
            if (!Game.Level.isSolid(level, aheadCol, belowRow) && !Game.Level.isThinPlatform(level, aheadCol, belowRow)) {
                c.vx = -c.vx;
            }
        }
    }

    function draw() {
        for (var i = 0; i < crabs.length; i++) {
            var c = crabs[i];
            if (!c.alive) {
                if (c.flashTimer > 0 && c.flashTimer % 2 === 0) {
                    Game.Renderer.drawSprite('crab', c.x, c.y, animFrame);
                }
                continue;
            }
            Game.Renderer.drawSprite('crab', c.x, c.y, animFrame);
        }
    }

    function checkPlayerCollision(px, py, pw, ph) {
        for (var i = 0; i < crabs.length; i++) {
            var c = crabs[i];
            if (!c.alive) continue;
            if (px + pw > c.x + 2 && px < c.x + c.width - 2 &&
                py + ph > c.y + 2 && py < c.y + c.height - 2) {
                return true;
            }
        }
        return false;
    }

    function hitTest(px, py, pw, ph) {
        for (var i = 0; i < crabs.length; i++) {
            var c = crabs[i];
            if (!c.alive) continue;
            if (px + pw > c.x && px < c.x + c.width &&
                py + ph > c.y && py < c.y + c.height) {
                c.alive = false;
                c.flashTimer = 10;
                return true;
            }
        }
        return false;
    }

    return {
        init: init,
        update: update,
        draw: draw,
        checkPlayerCollision: checkPlayerCollision,
        hitTest: hitTest
    };
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/enemies.js
git commit -m "feat: crab enemies with patrol AI and collision"
```

---

### Task 8: Projectile — Carrot Throwing

**Files:**
- Modify: `js/projectile.js`

- [ ] **Step 1: Implement projectile.js**

Replace `js/projectile.js` with:

```js
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

            // Off screen
            var camX = Game.Renderer.getCameraX();
            if (p.x < camX - 20 || p.x > camX + 460) {
                projectiles.splice(i, 1);
                continue;
            }

            // Hit wall
            var col = Math.floor((p.x + p.width / 2) / 16);
            var row = Math.floor((p.y + p.height / 2) / 16);
            if (Game.Level.isSolid(level, col, row)) {
                projectiles.splice(i, 1);
                continue;
            }

            // Hit enemy
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
```

- [ ] **Step 2: Commit**

```bash
git add js/projectile.js
git commit -m "feat: carrot projectile with enemy hit detection"
```

---

### Task 9: Title Screen

**Files:**
- Modify: `js/title.js`

- [ ] **Step 1: Implement title.js**

Replace `js/title.js` with:

```js
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
        // Night sky
        R.drawRect(0, 0, 448, 224, '#0a0a2e');

        // Stars
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            if ((timer + s.twinkle) % 60 < 50) {
                R.drawRect(s.x, s.y, s.size, s.size, '#ffff88');
            }
        }

        // Moon
        R.drawRect(370, 20, 20, 20, '#ffffaa');
        R.drawRect(372, 18, 16, 2, '#ffffaa');
        R.drawRect(368, 22, 2, 16, '#ffffaa');

        // Title text
        R.drawTextCentered('THE ADVENTURE OF', 60, '#ffaa00', 10);
        // Shadow
        R.drawTextCentered('ROUND PAWS', 83, '#aa0000', 24);
        R.drawTextCentered('ROUND PAWS', 82, '#ff6600', 24);
        R.drawTextCentered('ROUND PAWS', 80, '#ffffff', 24);

        // Happy cat
        R.drawSpriteAbsolute('happy_cat', 208, 96, 0);

        // Ship deck
        R.drawRect(0, 190, 448, 4, '#BF6530');
        R.drawRect(0, 194, 448, 30, '#8B4513');

        // Press start — blink
        if (timer % 40 < 28) {
            R.drawTextCentered('PRESS START', 180, '#ffffff', 12);
        }
    }

    return { init: init, update: update, draw: draw };
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/title.js
git commit -m "feat: title screen with starfield, happy cat, and blinking press start"
```

---

### Task 10: Ending Screen

**Files:**
- Modify: `js/ending.js`

- [ ] **Step 1: Implement ending.js**

Replace `js/ending.js` with:

```js
window.Game = window.Game || {};

Game.Ending = (function () {
    var timer = 0;
    var scrollY = 0;
    var catFrame = 0;
    var catTimer = 0;

    var storyLines = [
        '',
        'After defeating Captain Clawsworth',
        'and his crab crew, Round Paws',
        'claimed the ship as his own.',
        '',
        'He renamed it "The Fuzzy Drifter"',
        'and sailed to the legendary',
        'Tuna Isles.',
        '',
        'There, he discovered a hidden cove',
        'filled with the finest catnip',
        'the seven seas had ever known.',
        '',
        'Word spread quickly, and cats',
        'from every port came to trade',
        'stories and nap in the warm sand.',
        '',
        'Round Paws became known not as a',
        'fearsome pirate, but as the',
        'friendliest captain to ever sail.',
        '',
        'He appointed a seagull named Gerald',
        'as first mate, though Gerald',
        'mostly just screamed at clouds.',
        '',
        'Every evening, Round Paws would sit',
        'on the bow, watching the sunset',
        'paint the waves orange and gold.',
        '',
        'And when the stars came out,',
        'he\'d curl up on his favorite barrel,',
        'purring softly as the ship rocked',
        'gently on the tide.',
        '',
        'Some say if you listen carefully',
        'on a quiet night at sea, you can',
        'still hear that purr, carried on',
        'the wind across the endless ocean.',
        '',
        '',
        'THE END',
        '',
        'Thanks for playing!',
        '',
        'THE ADVENTURE OF ROUND PAWS',
        '',
        '',
        ''
    ];

    var totalTextHeight;

    function init() {
        timer = 0;
        scrollY = 0;
        catFrame = 0;
        catTimer = 0;
        totalTextHeight = storyLines.length * 14 + 120;
    }

    function update() {
        timer++;
        scrollY += 0.3;

        // Loop the scroll
        if (scrollY > totalTextHeight) {
            scrollY = -80;
        }

        // Animate sleeping cat
        catTimer++;
        if (catTimer > 40) {
            catTimer = 0;
            catFrame = (catFrame + 1) % 3;
        }

        return 'ending';
    }

    function draw() {
        var R = Game.Renderer;

        // Dark background
        R.drawRect(0, 0, 448, 224, '#0a0a1a');

        // Subtle stars
        for (var i = 0; i < 15; i++) {
            var sx = ((i * 37 + 13) % 448);
            var sy = ((i * 23 + 7) % 80);
            if ((timer + i * 11) % 80 < 60) {
                R.drawRect(sx, sy, 1, 1, '#334');
            }
        }

        // Sleeping cat — centered upper area
        R.drawSpriteAbsolute('sleeping_cat', 208, 40, catFrame);

        // Zzz animated
        var zOffset = Math.sin(timer * 0.05) * 3;
        R.drawText('Z', 250, 38 + zOffset, '#4444aa', 10);
        R.drawText('z', 258, 30 + zOffset, '#333388', 8);
        R.drawText('z', 264, 24 + zOffset, '#222266', 6);

        // Cozy deck under cat
        R.drawRect(0, 64, 448, 3, '#BF6530');
        R.drawRect(0, 67, 448, 8, '#8B4513');

        // Scrolling story text — clip to lower area
        var textStartY = 85;
        var textAreaHeight = 139;

        // Save context for clipping
        var ctx = R.getCtx();
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, textStartY, 448, textAreaHeight);
        ctx.clip();

        for (var j = 0; j < storyLines.length; j++) {
            var lineY = textStartY + j * 14 - scrollY + 100;
            if (lineY > textStartY - 14 && lineY < textStartY + textAreaHeight + 14) {
                var color = storyLines[j] === 'THE END' || storyLines[j] === 'THE ADVENTURE OF ROUND PAWS'
                    ? '#ffaa00' : '#8888aa';
                R.drawTextCentered(storyLines[j], lineY, color, 8);
            }
        }

        ctx.restore();
    }

    return { init: init, update: update, draw: draw };
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/ending.js
git commit -m "feat: ending screen with sleeping cat animation and scrolling story"
```

---

### Task 11: Music — Procedural Drum and Bass

**Files:**
- Modify: `js/music.js`

- [ ] **Step 1: Implement music.js**

Replace `js/music.js` with:

```js
window.Game = window.Game || {};

Game.Music = (function () {
    var audioCtx = null;
    var masterGain = null;
    var currentPattern = null;
    var intervalId = null;
    var step = 0;
    var BPM = 170;
    var stepTime; // seconds per 16th note

    function init() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.4;
        masterGain.connect(audioCtx.destination);
        stepTime = 60 / BPM / 4; // 16th note duration
    }

    function ensureContext() {
        if (!audioCtx) init();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    // --- Drum Sounds ---

    function kick(time) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.12);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.2);
    }

    function snare(time) {
        // Noise part
        var bufferSize = audioCtx.sampleRate * 0.1;
        var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        var noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        var noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.5, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        var filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start(time);
        noise.stop(time + 0.1);

        // Tone part
        var osc = audioCtx.createOscillator();
        var oscGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);
        oscGain.gain.setValueAtTime(0.4, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.08);
    }

    function hihat(time, open) {
        var duration = open ? 0.12 : 0.04;
        var bufferSize = audioCtx.sampleRate * duration;
        var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        var noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        var gain = audioCtx.createGain();
        gain.gain.setValueAtTime(open ? 0.2 : 0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        var filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(time);
        noise.stop(time + duration);
    }

    // --- Bass ---

    function bass(time, freq, duration) {
        var osc1 = audioCtx.createOscillator();
        var osc2 = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var filter = audioCtx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * 1.005, time); // slight detune

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, time);
        filter.frequency.exponentialRampToValueAtTime(150, time + duration);

        gain.gain.setValueAtTime(0.25, time);
        gain.gain.setValueAtTime(0.25, time + duration - 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc1.start(time);
        osc1.stop(time + duration);
        osc2.start(time);
        osc2.stop(time + duration);
    }

    // --- Pad (for title/ending) ---

    function pad(time, freq, duration) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var filter = audioCtx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.3);
        gain.gain.setValueAtTime(0.08, time + duration - 0.5);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + duration);
    }

    // --- Patterns ---
    // Each pattern is 16 steps (one bar). Functions schedule sounds for one step.

    var bassNotes = [55, 55, 65.4, 65.4, 49, 49, 55, 55]; // A1, A1, C2, C2, G1, G1, A1, A1

    var patterns = {
        gameplay: function (s, time) {
            // DnB breakbeat: kick on 1, 7, 10 — snare on 5, 13
            if (s === 0 || s === 6 || s === 9) kick(time);
            if (s === 4 || s === 12) snare(time);
            // Hi-hats on every other step
            if (s % 2 === 0) hihat(time, s === 8);
            // Rolling bass every 2 steps
            if (s % 2 === 0) {
                var noteIdx = Math.floor(s / 2) % bassNotes.length;
                bass(time, bassNotes[noteIdx], stepTime * 2 * 0.9);
            }
        },
        title: function (s, time) {
            // Half-time feel
            if (s === 0) kick(time);
            if (s === 8) snare(time);
            if (s % 4 === 0) hihat(time, false);
            // Gentle sub bass
            if (s === 0 || s === 8) {
                bass(time, 55, stepTime * 8 * 0.9);
            }
            // Pad chord every bar
            if (s === 0) {
                var barDuration = stepTime * 16;
                pad(time, 220, barDuration);
                pad(time, 277.2, barDuration);
                pad(time, 330, barDuration);
            }
        },
        ending: function (s, time) {
            // Very sparse, ambient
            if (s === 0) kick(time);
            if (s === 12) {
                hihat(time, true);
            }
            // Slow sub
            if (s === 0) {
                bass(time, 44, stepTime * 16 * 0.9);
            }
            // Reverby pad
            if (s === 0) {
                var barDuration = stepTime * 16;
                pad(time, 165, barDuration * 1.2);
                pad(time, 220, barDuration * 1.2);
                pad(time, 262, barDuration * 1.2);
            }
        }
    };

    function play(patternName) {
        ensureContext();
        if (currentPattern === patternName) return;
        stop();
        currentPattern = patternName;
        step = 0;

        var pattern = patterns[patternName];
        if (!pattern) return;

        var nextStepTime = audioCtx.currentTime + 0.05;

        intervalId = setInterval(function () {
            // Schedule a few steps ahead for smooth playback
            var now = audioCtx.currentTime;
            while (nextStepTime < now + 0.1) {
                pattern(step % 16, nextStepTime);
                step++;
                nextStepTime += stepTime;
            }
        }, 25);
    }

    function stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        currentPattern = null;
        step = 0;
    }

    function setVolume(v) {
        if (masterGain) masterGain.gain.value = v;
    }

    return { init: init, play: play, stop: stop, setVolume: setVolume };
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/music.js
git commit -m "feat: procedural drum and bass music with Web Audio API"
```

---

### Task 12: Main Game Loop and State Machine

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Implement main.js**

Replace `js/main.js` with:

```js
window.Game = window.Game || {};

(function () {
    var TILE = 16;
    var state = 'title'; // title, loading, playing, ending
    var currentLevelIndex = 0;
    var currentLevel = null;
    var animFrame = 0;
    var animTimer = 0;
    var levelNames = ['The Poop Deck', 'Below Deck', "The Crow's Nest"];
    var levelFiles = ['levels/level1.txt', 'levels/level2.txt', 'levels/level3.txt'];
    var carrotPickups = []; // active carrot pickups in current level
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

                // Check carrot pickups
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

                // Check enemy collision
                if (Game.Enemies.checkPlayerCollision(px, py, pw, ph)) {
                    Game.Player.respawn();
                    Game.Projectile.clear();
                    initCarrotPickups(currentLevel);
                    Game.Enemies.init(currentLevel);
                }

                // Camera
                Game.Renderer.updateCamera(px + pw / 2, currentLevel.width);

                // Level complete
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
                // Draw level tiles
                Game.Renderer.drawLevel(currentLevel, animFrame);

                // Draw flag
                if (currentLevel.flag) {
                    Game.Renderer.drawSprite('flag', currentLevel.flag.x * TILE, currentLevel.flag.y * TILE, flagAnimFrame);
                }

                // Draw carrot pickups
                for (var i = 0; i < carrotPickups.length; i++) {
                    var cp = carrotPickups[i];
                    if (cp.collected) continue;
                    var bob = Math.sin((animTimer + i * 20) * 0.15) * 2;
                    Game.Renderer.drawSprite('carrot', cp.x, cp.y + bob, 0);
                }

                // Draw enemies
                Game.Enemies.draw();

                // Draw projectiles
                Game.Projectile.draw();

                // Draw player
                Game.Player.draw();

                // Draw HUD
                Game.Player.drawHUD();
                // Level name
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

    // Start
    window.addEventListener('load', function () {
        Game.Renderer.init();
        Game.Input.init();
        Game.Title.init();
        Game.Music.init();
        Game.Music.play('title');
        gameLoop();
    });
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/main.js
git commit -m "feat: game loop with state machine - title, playing, ending"
```

---

### Task 13: Level Files and Editor Guide

**Files:**
- Create: `levels/level1.txt`
- Create: `levels/level2.txt`
- Create: `levels/level3.txt`
- Create: `levels/README.md`

- [ ] **Step 1: Create levels/level1.txt — The Poop Deck (Easy)**

```
# Level 1 — The Poop Deck (Easy)
# Simple platforms, few crabs, lots of carrots
# Teaches movement, jumping, and throwing
..............................................................
..............................................................
..............................................................
..............................................................
..............................................................
.....K.........................................K..............
...=====..........K.......----.........K......=====......F....
..............=========...............................========
..........C.................C.........====.....C..............
.P.......=====....................................=====.......
===.........................................................=
=====#====#=========#=====#====#=========#=========#====#====
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

- [ ] **Step 2: Create levels/level2.txt — Below Deck (Medium)**

```
# Level 2 — Below Deck (Medium)
# Rope climbing, thin platforms, barrels, more crabs
..............................................................
.................M............................................
.................#......K.......M.............................
.................#....----......#.....K..........F.............
...K.............#..........C..#...----......=========.........
..----- .........#..R......=====#..........C..................
.............C...#..R..........#....====......................
..........=====..#..R......K...#.........R.....C..............
.................#..R....----...#.........R...=====............
.P...K...........#..R..........#...B.....R...................=
===..........====##====..C...==###=====..R..........====..===
#####=###==#######=====####=################=====#=###=######
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

- [ ] **Step 3: Create levels/level3.txt — The Crow's Nest (Hard)**

```
# Level 3 — The Crow's Nest (Hard)
# Tricky jumps, water gaps, scarce carrots, many crabs
..............................................K.......F........
.............................................----..=====......
...........................................C...................
...........M...........M........K.....=====...................
...........#...........#......----...............C.............
.....K.....#.....C.....#.R........................====........
...----....#...====....#.R.......C....----....................
...........#...........#.R...=====..........R..C..............
...........#.....K.....#.R.................R...=====..........
.P.....C...#...----....#.R......C.....K....R..............===
===..====..##.......====.R...====...----...R....C...===......
########===#####===#######===#####==#########=====###########
~~~~~~~~~~~~~....~~~~~~~~~....~~~~~~~~~~~~~~~....~~~~~~~~~~~~~
~~~~~~~~~~~~~~....~~~~~~~~~....~~~~~~~~~~~~~~~....~~~~~~~~~~~~~
```

- [ ] **Step 4: Create levels/README.md**

```markdown
# Level Editor Guide — The Adventure of Round Paws

## How to Edit Levels

1. Open any `level*.txt` file in a text editor
2. Each character represents a 16x16 pixel tile
3. Edit the characters using the key below
4. Save the file and refresh the browser

## Tile Key

| Char | Name           | Description                              |
|------|----------------|------------------------------------------|
| `.`  | Air            | Empty space                              |
| `=`  | Wood Plank     | Solid platform — walkable surface        |
| `#`  | Hull Wall      | Solid wall — blocks movement             |
| `~`  | Water          | Kills the player on contact              |
| `P`  | Player Start   | Where Round Paws spawns (one per level)  |
| `C`  | Crab           | Enemy — patrols left/right on platform   |
| `K`  | Carrot         | Weapon pickup — Round Paws can throw it  |
| `F`  | Flag           | Level exit — touching it completes level |
| `R`  | Rope           | Climbable — press up/down to climb       |
| `B`  | Barrel         | Solid decoration — acts like a wall      |
| `M`  | Mast           | Background decoration — no collision     |
| `-`  | Thin Platform  | Can jump through from below              |

## Rules

- Each level must have exactly one `P` (player start)
- Each level must have exactly one `F` (flag/finish)
- Height should be 14 rows (the game viewport is 14 tiles tall)
- Width can be any length — the camera scrolls horizontally
- Lines starting with `#` at column 0 followed by a space are comments and are ignored
- Place `C` crabs on surfaces — they patrol left/right and reverse at edges
- Place `~` water at the bottom for a danger zone

## Tips

- Start easy: wide platforms, few gaps, plenty of carrots
- Use `R` ropes for vertical sections
- Use `-` thin platforms for interesting vertical movement
- Crabs are more dangerous in tight spaces
- Place carrots before crab encounters so the player is prepared
- Leave some breathing room between challenges
- Test by playing! Save and refresh the browser.

## Creating New Levels

1. Copy an existing level file as a template
2. Name it `levelN.txt` (e.g., `level4.txt`)
3. Edit `js/main.js` to add the new file to `levelFiles` and `levelNames` arrays
4. Refresh the browser to play
```

- [ ] **Step 5: Commit**

```bash
git add levels/
git commit -m "feat: 3 game levels and level editor README"
```

---

### Task 14: Integration Testing and Polish

**Files:**
- Possibly modify: any file that has bugs

- [ ] **Step 1: Open index.html in browser and test title screen**

Open `index.html` via a local server (required for XHR level loading):

```bash
cd /Users/noahtsutsui/Projects/roundpaws2
python3 -m http.server 8000
```

Open `http://localhost:8000` in browser. Verify:
- Night sky with stars and moon
- Title text with drop shadow
- Happy Round Paws sprite visible
- Ship deck at bottom
- "PRESS START" blinking
- DnB music playing (may need to click page first for autoplay policy)

- [ ] **Step 2: Test gameplay — Level 1**

Press Enter/Space to start. Verify:
- Level loads, platforms visible
- Round Paws appears at start position
- Arrow keys move left/right
- Space jumps — floaty, forgiving feel
- Can collect carrots (walk over K tiles)
- HUD shows carrot count
- Crabs patrol back and forth
- X/Z throws carrot — kills crab on hit
- Touching crab respawns player
- Touching water respawns player
- Music switches to gameplay beat
- Reaching flag advances to Level 2

- [ ] **Step 3: Test gameplay — Levels 2 and 3**

Play through levels 2 and 3. Verify:
- Ropes work (up/down to climb)
- Thin platforms can be jumped through from below
- Barrels block movement
- Masts are background-only
- Level 3 has water gaps
- Reaching flag on Level 3 triggers ending

- [ ] **Step 4: Test ending screen**

After completing Level 3, verify:
- Sleeping Round Paws with Zzz animation
- Story text scrolls upward
- Text loops back after reaching the end
- Music switches to ambient
- Cozy feeling

- [ ] **Step 5: Test level editor workflow**

Edit `levels/level1.txt` — add an extra crab somewhere. Save, refresh browser. Verify the crab appears. Revert the change.

- [ ] **Step 6: Run test.html**

Open `test.html` in browser. All tests should still pass.

- [ ] **Step 7: Fix any bugs found during testing**

Address any issues discovered in steps 1-6. Common things to watch for:
- Collision off-by-one errors
- Camera jitter at level boundaries
- Crabs walking off edges
- Carrot pickup hitbox too small/large
- Music not starting (autoplay policy — may need user click)

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "polish: integration testing and bug fixes"
```

---

## Summary

| Task | Component | Key Files |
|------|-----------|-----------|
| 1 | Project scaffold | index.html, game.css |
| 2 | Input system | input.js |
| 3 | Sprite system | sprites.js |
| 4 | Level parser + tests | level.js, test.html |
| 5 | Renderer + camera | renderer.js |
| 6 | Player movement | player.js |
| 7 | Crab enemies | enemies.js |
| 8 | Carrot projectile | projectile.js |
| 9 | Title screen | title.js |
| 10 | Ending screen | ending.js |
| 11 | Music engine | music.js |
| 12 | Game loop | main.js |
| 13 | Level files + editor | levels/*.txt, README.md |
| 14 | Integration testing | all files |
