# Level Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based level editor for Round Paws with mouse+keyboard optimized UX, bidirectional scrolling for long and tall levels, localStorage drafts, and disk save via the dev server.

**Architecture:** Single HTML page (`level-editor.html`) + single JS module (`js/level-editor.js`) following the existing tile editor pattern. Reuses `Game.Sprites` for rendering tiles. Adds three API endpoints to `server.js` for level file I/O. Adds vertical camera support to `renderer.js` so taller levels play correctly in-game.

**Tech Stack:** Vanilla JavaScript (ES5 style, IIFE modules), HTML5 Canvas, no build step. Node.js HTTPS dev server (`server.js`). No test framework — verification is manual in the browser (this matches the rest of the project).

**Testing note:** This codebase has no automated test framework. Each task has explicit manual verification steps performed in the browser. "Run it" means "open the page and observe the described behavior." Where API endpoints are involved, `curl` provides a quick sanity check.

---

## File Structure

**Create:**
- `level-editor.html` — editor page, styles inline matching `editor.html`
- `js/level-editor.js` — all editor logic, IIFE pattern

**Modify:**
- `server.js` — add `/api/save-level`, `/api/list-levels`, `/api/load-level` endpoints
- `js/renderer.js` — add `camera.y` tracking, update `drawLevel` for vertical culling, update `drawSprite` to offset by `camera.y`, update `updateCamera` to accept `playerY` + `levelHeight`, update `resetCamera`
- `js/main.js` — pass `playerY` and `level.height` into `updateCamera` call
- `index.html` — (optional) add a small link to the level editor for convenience

---

## Task 1: Server API — save-level endpoint

**Files:**
- Modify: `server.js` (add new endpoint in `handleRequest` before the static file section)

- [ ] **Step 1: Add the save-level endpoint**

In `server.js`, add the following block inside `handleRequest` directly after the existing `/api/save-tile` block (around line 104, before `/api/tile-version`):

```javascript
    // API: save a level text file
    if (req.method === 'POST' && req.url === '/api/save-level') {
        var body = [];
        req.on('data', function (chunk) { body.push(chunk); });
        req.on('end', function () {
            try {
                var json = JSON.parse(Buffer.concat(body).toString());
                var filename = path.basename(json.filename); // sanitize
                if (!/^level[a-zA-Z0-9_-]+\.txt$/.test(filename)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Filename must match levelN.txt' }));
                    return;
                }
                if (typeof json.data !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing data field' }));
                    return;
                }
                var filePath = path.join(ROOT, 'levels', filename);
                fs.writeFileSync(filePath, json.data);
                console.log('Saved levels/' + filename);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }
```

- [ ] **Step 2: Restart the dev server and verify the endpoint**

Run: `node server.js` (restart if already running)

Then in another terminal:
```bash
curl -k -X POST https://localhost:3000/api/save-level \
  -H "Content-Type: application/json" \
  -d '{"filename":"level_test.txt","data":"# test\n..........\n"}'
```

Expected output: `{"ok":true}`

Verify the file exists: `ls levels/level_test.txt` → file should exist with the given content.

- [ ] **Step 3: Verify filename validation rejects bad names**

```bash
curl -k -X POST https://localhost:3000/api/save-level \
  -H "Content-Type: application/json" \
  -d '{"filename":"../etc/passwd.txt","data":"x"}'
```

Expected output: `{"error":"Filename must match levelN.txt"}`

- [ ] **Step 4: Clean up the test file**

```bash
rm levels/level_test.txt
```

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: add /api/save-level endpoint"
```

---

## Task 2: Server API — list-levels endpoint

**Files:**
- Modify: `server.js` (add new endpoint)

- [ ] **Step 1: Add the list-levels endpoint**

In `server.js`, add after the save-level endpoint:

```javascript
    // API: list level files
    if (req.method === 'GET' && req.url === '/api/list-levels') {
        try {
            var levelsDir = path.join(ROOT, 'levels');
            var files = fs.readdirSync(levelsDir).filter(function (f) {
                return /^level[a-zA-Z0-9_-]+\.txt$/.test(f);
            }).sort();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(files));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }
```

- [ ] **Step 2: Restart server and verify**

Restart `node server.js`, then:

```bash
curl -k https://localhost:3000/api/list-levels
```

Expected output: `["level1.txt","level2.txt","level3.txt"]`

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: add /api/list-levels endpoint"
```

---

## Task 3: Server API — load-level endpoint

**Files:**
- Modify: `server.js` (add new endpoint)

- [ ] **Step 1: Add the load-level endpoint**

In `server.js`, add after the list-levels endpoint:

```javascript
    // API: load a level file
    if (req.method === 'GET' && req.url.indexOf('/api/load-level') === 0) {
        try {
            var q = req.url.split('?')[1] || '';
            var params = {};
            q.split('&').forEach(function (kv) {
                var p = kv.split('=');
                params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
            });
            var filename = path.basename(params.file || '');
            if (!/^level[a-zA-Z0-9_-]+\.txt$/.test(filename)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid filename' }));
                return;
            }
            var filePath = path.join(ROOT, 'levels', filename);
            var data = fs.readFileSync(filePath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-cache' });
            res.end(data);
        } catch (e) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }
```

- [ ] **Step 2: Restart server and verify**

Restart `node server.js`, then:

```bash
curl -k "https://localhost:3000/api/load-level?file=level1.txt"
```

Expected output: The full text contents of `levels/level1.txt`.

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat: add /api/load-level endpoint"
```

---

## Task 4: Vertical camera support in renderer.js

**Files:**
- Modify: `js/renderer.js`
- Modify: `js/main.js` (update updateCamera call site)

- [ ] **Step 1: Update the camera object and updateCamera signature**

In `js/renderer.js`, replace lines 13-15:

```javascript
    var canvas, ctx;
    var TILE = 16;
    var camera = { x: 0 };
    var canvasW, canvasH;
```

With:

```javascript
    var canvas, ctx;
    var TILE = 16;
    var camera = { x: 0, y: 0 };
    var canvasW, canvasH;
```

- [ ] **Step 2: Replace updateCamera with a two-axis version**

In `js/renderer.js`, replace the `updateCamera` function (lines ~41-49):

```javascript
    /** Smoothly scroll toward the player. Clamped to level bounds. */
    function updateCamera(playerX, levelWidth, playerY, levelHeight) {
        var targetX = playerX - canvasW / 2;
        camera.x += (targetX - camera.x) * 0.1;
        var maxX = levelWidth * TILE - canvasW;
        if (camera.x < 0) camera.x = 0;
        if (camera.x > maxX) camera.x = maxX;

        // Vertical tracking only kicks in if the level is taller than the viewport
        if (typeof playerY === 'number' && typeof levelHeight === 'number' &&
            levelHeight * TILE > canvasH) {
            var targetY = playerY - canvasH / 2;
            camera.y += (targetY - camera.y) * 0.1;
            var maxY = levelHeight * TILE - canvasH;
            if (camera.y < 0) camera.y = 0;
            if (camera.y > maxY) camera.y = maxY;
        } else {
            camera.y = 0;
        }
    }
```

- [ ] **Step 3: Update resetCamera**

Replace the `resetCamera` function (lines ~51-53):

```javascript
    function resetCamera() {
        camera.x = 0;
        camera.y = 0;
    }
```

- [ ] **Step 4: Update drawLevel to cull by camera.y**

Replace the `drawLevel` function (lines ~59-86):

```javascript
    /** Draw only the tiles visible on screen (culled by camera). */
    function drawLevel(level, animFrame) {
        var startCol = Math.floor(camera.x / TILE);
        var endCol = startCol + Math.ceil(canvasW / TILE) + 1;
        if (endCol > level.width) endCol = level.width;

        var startRow = Math.floor(camera.y / TILE);
        var endRow = startRow + Math.ceil(canvasH / TILE) + 1;
        if (endRow > level.height) endRow = level.height;
        if (startRow < 0) startRow = 0;

        for (var row = startRow; row < endRow; row++) {
            for (var col = startCol; col < endCol; col++) {
                var tile = level.grid[row][col];
                var screenX = col * TILE - camera.x;
                var screenY = row * TILE - camera.y;
                var sprite = null;

                switch (tile) {
                    case '=': sprite = Game.Sprites.get('wood_plank'); break;
                    case '#': sprite = Game.Sprites.get('hull_wall'); break;
                    case '~': sprite = Game.Sprites.get('water', animFrame); break;
                    case 'R': sprite = Game.Sprites.get('rope'); break;
                    case 'M': sprite = Game.Sprites.get('mast'); break;
                    case '-': sprite = Game.Sprites.get('thin_platform'); break;
                }

                if (sprite) {
                    ctx.drawImage(sprite, Math.round(screenX), Math.round(screenY));
                }
            }
        }
    }
```

- [ ] **Step 5: Update drawSprite to offset by camera.y**

Replace the `drawSprite` function (lines ~92-96):

```javascript
    /** Draw a sprite in world space (offset by camera). */
    function drawSprite(spriteName, x, y, frame) {
        var sprite = Game.Sprites.get(spriteName, frame);
        ctx.drawImage(sprite, Math.round(x - camera.x), Math.round(y - camera.y));
    }
```

- [ ] **Step 6: Add getCameraY accessor**

In the accessors section and the returned object at the bottom of the IIFE, add:

```javascript
    function getCameraY() { return camera.y; }
```

And add `getCameraY: getCameraY,` to the returned object next to `getCameraX`.

- [ ] **Step 7: Update main.js updateCamera call**

In `js/main.js`, find the line calling `Game.Renderer.updateCamera` (around line 242) and change:

```javascript
                Game.Renderer.updateCamera(px + pw / 2, currentLevel.width);
```

To:

```javascript
                Game.Renderer.updateCamera(
                    px + pw / 2, currentLevel.width,
                    py + ph / 2, currentLevel.height
                );
```

- [ ] **Step 8: Verify existing levels still work**

Start the dev server with `node server.js` and open `https://localhost:3000/` in a browser.

- Play through level 1, 2, and 3
- Existing levels are 14 tiles tall, which equals the viewport (224px / 16px = 14), so the condition `levelHeight * TILE > canvasH` is false → camera.y stays at 0
- Expected: gameplay looks and feels identical to before — horizontal scrolling only, no visual changes

- [ ] **Step 9: Quick vertical-scroll sanity test**

Temporarily add extra rows to `levels/level1.txt` (copy the top row 5 times at the top of the file) and reload the game. The player should now be in a taller level and the camera should scroll vertically as the player jumps.

After confirming it works, revert `levels/level1.txt`:

```bash
git checkout levels/level1.txt
```

- [ ] **Step 10: Commit**

```bash
git add js/renderer.js js/main.js
git commit -m "feat: vertical camera scrolling for tall levels"
```

---

## Task 5: Level editor HTML scaffolding

**Files:**
- Create: `level-editor.html`

- [ ] **Step 1: Create the HTML file**

Create `level-editor.html` with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Round Paws - Level Editor</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; overflow: hidden; background: #1a1a2e; color: #eee; font-family: monospace; }

.app { display: flex; flex-direction: column; height: 100%; }
.workspace { display: flex; flex: 1; min-height: 0; }

/* Left sidebar */
.sidebar {
  width: 200px; min-width: 200px;
  background: #16213e; border-right: 2px solid #0f3460;
  overflow-y: auto;
  padding: 8px;
  display: flex; flex-direction: column; gap: 8px;
}
.sidebar h2 { font-size: 12px; color: #e94560; margin: 4px 0; }
.tile-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.tile-btn {
  aspect-ratio: 1;
  background: #1a1a3e; border: 2px solid #333; border-radius: 4px;
  color: #ddd; font-family: monospace; font-size: 10px;
  cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 2px;
  position: relative;
}
.tile-btn:hover { border-color: #666; }
.tile-btn.active { border-color: #e94560; background: #2a1a3e; }
.tile-btn canvas { image-rendering: pixelated; }
.tile-btn .ch { position: absolute; top: 1px; right: 2px; font-size: 8px; color: #888; }
.tile-btn .lbl { font-size: 8px; color: #aaa; margin-top: 2px; text-align: center; }

.tool-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
.tool-btn {
  background: #1a1a3e; border: 2px solid #333; border-radius: 4px;
  color: #ddd; font-family: monospace; font-size: 11px;
  padding: 8px 4px; cursor: pointer; text-align: center;
}
.tool-btn:hover { border-color: #666; }
.tool-btn.active { border-color: #e94560; background: #2a1a3e; color: #fff; }
.tool-btn .key { display: block; font-size: 9px; color: #888; margin-top: 2px; }

.level-controls button, .level-controls select {
  width: 100%; padding: 6px; margin-top: 4px;
  background: #1a1a3e; border: 1px solid #444; border-radius: 4px;
  color: #fff; font-family: monospace; font-size: 11px;
  cursor: pointer;
}
.level-controls button.primary { background: #e94560; border-color: #e94560; font-weight: bold; }
.level-controls button.primary:hover { background: #c73650; }
.level-controls button:hover { border-color: #666; }
.level-controls label { font-size: 10px; color: #888; display: block; margin-top: 4px; }

/* Main canvas area */
.main {
  flex: 1; position: relative;
  background: #0a0a1a;
  overflow: hidden;
}
#editor-canvas {
  image-rendering: pixelated;
  cursor: crosshair;
  display: block;
  position: absolute; top: 0; left: 0;
}

/* Bottom status bar */
.statusbar {
  height: 28px;
  background: #16213e; border-top: 2px solid #0f3460;
  display: flex; align-items: center; padding: 0 12px; gap: 16px;
  font-size: 11px; color: #aaa;
}
.statusbar .spacer { flex: 1; }
.statusbar .status-item { color: #ddd; }
.statusbar .status-label { color: #888; }
</style>
</head>
<body>
<div class="app">
  <div class="workspace">
    <div class="sidebar">
      <div>
        <h2>TILES</h2>
        <div class="tile-grid" id="tile-palette"></div>
      </div>
      <div>
        <h2>ENTITIES</h2>
        <div class="tile-grid" id="entity-palette"></div>
      </div>
      <div>
        <h2>TOOLS</h2>
        <div class="tool-row" id="tool-palette"></div>
      </div>
      <div class="level-controls">
        <h2>LEVEL</h2>
        <label>File</label>
        <select id="level-file"></select>
        <button id="btn-load">Load</button>
        <button id="btn-new">New Level</button>
        <button id="btn-save" class="primary">Save to Game (Ctrl+S)</button>
      </div>
    </div>
    <div class="main" id="main-area">
      <canvas id="editor-canvas"></canvas>
    </div>
  </div>
  <div class="statusbar">
    <span class="status-item"><span class="status-label">Pos:</span> <span id="status-pos">-,-</span></span>
    <span class="status-item"><span class="status-label">Size:</span> <span id="status-size">-x-</span></span>
    <span class="status-item"><span class="status-label">Tool:</span> <span id="status-tool">draw</span></span>
    <span class="status-item"><span class="status-label">Tile:</span> <span id="status-tile">.</span></span>
    <span class="spacer"></span>
    <span class="status-item" id="status-msg"></span>
    <span class="status-item"><span class="status-label">Zoom:</span> <span id="status-zoom">24px</span></span>
  </div>
</div>
<script src="js/sprites.js"></script>
<script src="js/level-editor.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the page loads**

Open `https://localhost:3000/level-editor.html` in a browser.

Expected:
- Empty page with dark background
- Left sidebar visible with TILES, ENTITIES, TOOLS, LEVEL headings but no content inside yet (js/level-editor.js doesn't exist)
- Browser console error: `level-editor.js` not found (fine for now)

- [ ] **Step 3: Commit**

```bash
git add level-editor.html
git commit -m "feat: level editor HTML scaffolding"
```

---

## Task 6: Editor module init and palette rendering

**Files:**
- Create: `js/level-editor.js`

- [ ] **Step 1: Create the editor module with palette definitions and init**

Create `js/level-editor.js`:

```javascript
/**
 * Level Editor for Round Paws
 *
 * Web-based level editor. Mouse+keyboard optimized. Supports variable
 * width and height levels with horizontal and vertical scrolling.
 * LocalStorage auto-save + Save to Game writes .txt files to levels/
 * via the dev server.
 */
(function () {
    // ---------------------------------------------------------------
    // Tile & entity definitions
    // ---------------------------------------------------------------

    // Each entry: { ch, name, label, sprite, key }
    // ch = character stored in the .txt file
    // sprite = Game.Sprites name (or null for air)
    // key = keyboard shortcut to select this tile (single char)
    var TILE_DEFS = [
        { ch: '.', name: 'air',          label: 'Air',     sprite: null,            key: '.' },
        { ch: '=', name: 'wood_plank',   label: 'Plank',   sprite: 'wood_plank',    key: '=' },
        { ch: '#', name: 'hull_wall',    label: 'Wall',    sprite: 'hull_wall',     key: '#' },
        { ch: '~', name: 'water',        label: 'Water',   sprite: 'water',         key: '~' },
        { ch: '-', name: 'thin_platform',label: 'Thin',    sprite: 'thin_platform', key: '-' },
        { ch: 'R', name: 'rope',         label: 'Rope',    sprite: 'rope',          key: 'r' },
        { ch: 'M', name: 'mast',         label: 'Mast',    sprite: 'mast',          key: 'm' }
    ];

    // Entity keys: 'p' would conflict with pan, so entities use uppercase-only shortcuts
    // (you hold Shift to select entities). Fill tool owns plain 'f'; Shift+F selects Flag.
    var ENTITY_DEFS = [
        { ch: 'P', name: 'player_start', label: 'Start',   sprite: 'cat',   key: 'P' },
        { ch: 'C', name: 'crab',         label: 'Crab',    sprite: 'crab',  key: 'C' },
        { ch: 'K', name: 'carrot',       label: 'Carrot',  sprite: 'carrot',key: 'K' },
        { ch: 'F', name: 'flag',         label: 'Flag',    sprite: 'flag',  key: 'F' },
        { ch: 'B', name: 'barrel',       label: 'Barrel',  sprite: 'barrel',key: 'B' }
    ];

    var TOOL_DEFS = [
        { name: 'draw',   label: 'Draw',   key: 'd' },
        { name: 'erase',  label: 'Erase',  key: 'e' },
        { name: 'fill',   label: 'Fill',   key: 'f' },
        { name: 'select', label: 'Select', key: 's' }
    ];

    // ---------------------------------------------------------------
    // Editor state
    // ---------------------------------------------------------------

    var state = {
        currentTile: TILE_DEFS[1], // wood plank as default
        currentTool: 'draw',
        filename: 'level1.txt',
        grid: [],            // 2D array [row][col] of characters
        width: 0,
        height: 0,
        zoom: 24,            // pixels per tile on screen
        scrollX: 0,          // canvas scroll offset in pixels
        scrollY: 0,
        cursorCol: -1,
        cursorRow: -1,
        isDrawing: false,
        isPanning: false,
        panStart: null,
        panScroll: null
    };

    // DOM
    var canvas, ctx, mainArea;
    var statusPos, statusSize, statusTool, statusTile, statusMsg, statusZoom;

    // ---------------------------------------------------------------
    // Init
    // ---------------------------------------------------------------

    function init() {
        canvas = document.getElementById('editor-canvas');
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        mainArea = document.getElementById('main-area');

        statusPos = document.getElementById('status-pos');
        statusSize = document.getElementById('status-size');
        statusTool = document.getElementById('status-tool');
        statusTile = document.getElementById('status-tile');
        statusMsg = document.getElementById('status-msg');
        statusZoom = document.getElementById('status-zoom');

        buildTilePalette();
        buildEntityPalette();
        buildToolPalette();

        // Start with an empty 60x14 level
        newBlankLevel(60, 14, 'untitled.txt');

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        redraw();
        updateStatusBar();
    }

    // ---------------------------------------------------------------
    // Palette building
    // ---------------------------------------------------------------

    function buildTilePalette() {
        var container = document.getElementById('tile-palette');
        container.innerHTML = '';
        TILE_DEFS.forEach(function (def) {
            container.appendChild(makeTileButton(def, function () {
                state.currentTile = def;
                refreshActivePalette();
                updateStatusBar();
            }));
        });
    }

    function buildEntityPalette() {
        var container = document.getElementById('entity-palette');
        container.innerHTML = '';
        ENTITY_DEFS.forEach(function (def) {
            container.appendChild(makeTileButton(def, function () {
                state.currentTile = def;
                refreshActivePalette();
                updateStatusBar();
            }));
        });
    }

    function makeTileButton(def, onClick) {
        var btn = document.createElement('button');
        btn.className = 'tile-btn';
        btn.dataset.ch = def.ch;
        btn.title = def.label + ' (' + def.key + ')';

        var ch = document.createElement('span');
        ch.className = 'ch';
        ch.textContent = def.ch;
        btn.appendChild(ch);

        if (def.sprite) {
            var spr = Game.Sprites.get(def.sprite, 0);
            var thumb = document.createElement('canvas');
            thumb.width = 24;
            thumb.height = 24;
            var tctx = thumb.getContext('2d');
            tctx.imageSmoothingEnabled = false;
            // Scale sprite to fit 24x24
            var sw = spr.width, sh = spr.height;
            var scale = Math.min(24 / sw, 24 / sh);
            var dw = sw * scale, dh = sh * scale;
            tctx.drawImage(spr, (24 - dw) / 2, (24 - dh) / 2, dw, dh);
            btn.appendChild(thumb);
        } else {
            // Air tile — show a checker pattern
            var empty = document.createElement('canvas');
            empty.width = 24;
            empty.height = 24;
            var ectx = empty.getContext('2d');
            ectx.fillStyle = '#0a0a1a';
            ectx.fillRect(0, 0, 24, 24);
            ectx.fillStyle = '#1a1a2e';
            for (var y = 0; y < 24; y += 4) {
                for (var x = 0; x < 24; x += 4) {
                    if (((x + y) / 4) % 2 === 0) ectx.fillRect(x, y, 4, 4);
                }
            }
            btn.appendChild(empty);
        }

        var lbl = document.createElement('span');
        lbl.className = 'lbl';
        lbl.textContent = def.label;
        btn.appendChild(lbl);

        btn.addEventListener('click', onClick);
        return btn;
    }

    function buildToolPalette() {
        var container = document.getElementById('tool-palette');
        container.innerHTML = '';
        TOOL_DEFS.forEach(function (def) {
            var btn = document.createElement('button');
            btn.className = 'tool-btn';
            btn.dataset.tool = def.name;
            btn.innerHTML = def.label + '<span class="key">(' + def.key.toUpperCase() + ')</span>';
            btn.addEventListener('click', function () {
                state.currentTool = def.name;
                refreshActivePalette();
                updateStatusBar();
            });
            container.appendChild(btn);
        });
        refreshActivePalette();
    }

    function refreshActivePalette() {
        var all = document.querySelectorAll('.tile-btn');
        all.forEach(function (b) {
            b.classList.toggle('active', b.dataset.ch === state.currentTile.ch);
        });
        var tools = document.querySelectorAll('.tool-btn');
        tools.forEach(function (b) {
            b.classList.toggle('active', b.dataset.tool === state.currentTool);
        });
    }

    // ---------------------------------------------------------------
    // Grid management
    // ---------------------------------------------------------------

    function newBlankLevel(width, height, filename) {
        state.width = width;
        state.height = height;
        state.filename = filename;
        state.grid = [];
        for (var r = 0; r < height; r++) {
            var row = [];
            for (var c = 0; c < width; c++) row.push('.');
            state.grid.push(row);
        }
        state.scrollX = 0;
        state.scrollY = 0;
    }

    // ---------------------------------------------------------------
    // Canvas sizing & rendering (stub — filled in next task)
    // ---------------------------------------------------------------

    function resizeCanvas() {
        canvas.width = mainArea.clientWidth;
        canvas.height = mainArea.clientHeight;
        redraw();
    }

    function redraw() {
        if (!ctx) return;
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Grid rendering is added in the next task.
    }

    // ---------------------------------------------------------------
    // Status bar
    // ---------------------------------------------------------------

    function updateStatusBar() {
        statusPos.textContent = state.cursorCol >= 0
            ? state.cursorCol + ',' + state.cursorRow
            : '-,-';
        statusSize.textContent = state.width + 'x' + state.height;
        statusTool.textContent = state.currentTool;
        statusTile.textContent = state.currentTile.ch + ' (' + state.currentTile.label + ')';
        statusZoom.textContent = state.zoom + 'px';
    }

    function showMessage(text) {
        statusMsg.textContent = text;
        setTimeout(function () {
            if (statusMsg.textContent === text) statusMsg.textContent = '';
        }, 3000);
    }

    // Kick off after sprites are loaded
    Game.Sprites.loadImages(function () {
        init();
    });
})();
```

- [ ] **Step 2: Verify the editor loads with palette populated**

Reload `https://localhost:3000/level-editor.html`.

Expected:
- Left sidebar populated with tile buttons (Air, Plank, Wall, Water, Thin, Rope, Mast), entity buttons (Start, Crab, Carrot, Flag, Barrel), and tool buttons (Draw, Erase, Fill, Select)
- Each tile button shows the corresponding sprite as a thumbnail
- Plank is highlighted (active) since it's the default
- Draw tool is highlighted (active)
- Status bar at bottom shows: `Pos: -,-`, `Size: 60x14`, `Tool: draw`, `Tile: = (Plank)`, `Zoom: 24px`
- Main area is sky-blue with no tiles yet (render stub)

- [ ] **Step 3: Verify palette click selection works**

- Click "Wall" → Wall becomes active (red border), status bar shows `Tile: # (Wall)`
- Click "Erase" → Erase tool becomes active, status bar shows `Tool: erase`
- Click "Crab" → status bar shows `Tile: C (Crab)`

- [ ] **Step 4: Commit**

```bash
git add js/level-editor.js
git commit -m "feat: level editor init and palette"
```

---

## Task 7: Grid rendering on canvas

**Files:**
- Modify: `js/level-editor.js`

- [ ] **Step 1: Replace the redraw stub with full grid rendering**

In `js/level-editor.js`, replace the `redraw` function with:

```javascript
    function redraw() {
        if (!ctx) return;

        var w = canvas.width;
        var h = canvas.height;

        // Sky background
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, w, h);

        var z = state.zoom;
        var startCol = Math.max(0, Math.floor(state.scrollX / z));
        var endCol = Math.min(state.width, Math.ceil((state.scrollX + w) / z));
        var startRow = Math.max(0, Math.floor(state.scrollY / z));
        var endRow = Math.min(state.height, Math.ceil((state.scrollY + h) / z));

        // Draw tiles
        for (var r = startRow; r < endRow; r++) {
            for (var c = startCol; c < endCol; c++) {
                var ch = state.grid[r][c];
                var screenX = c * z - state.scrollX;
                var screenY = r * z - state.scrollY;

                var def = findDef(ch);
                if (def && def.sprite) {
                    var spr = Game.Sprites.get(def.sprite, 0);
                    ctx.drawImage(spr, screenX, screenY, z, z);
                }
            }
        }

        // Grid overlay
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var c2 = startCol; c2 <= endCol; c2++) {
            var x = c2 * z - state.scrollX + 0.5;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }
        for (var r2 = startRow; r2 <= endRow; r2++) {
            var y = r2 * z - state.scrollY + 0.5;
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();

        // Level bounds (red rectangle around the level area)
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            -state.scrollX - 1,
            -state.scrollY - 1,
            state.width * z + 2,
            state.height * z + 2
        );

        // Cursor highlight
        if (state.cursorCol >= 0 && state.cursorCol < state.width &&
            state.cursorRow >= 0 && state.cursorRow < state.height) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                state.cursorCol * z - state.scrollX,
                state.cursorRow * z - state.scrollY,
                z, z
            );
        }
    }

    function findDef(ch) {
        for (var i = 0; i < TILE_DEFS.length; i++) {
            if (TILE_DEFS[i].ch === ch) return TILE_DEFS[i];
        }
        for (var j = 0; j < ENTITY_DEFS.length; j++) {
            if (ENTITY_DEFS[j].ch === ch) return ENTITY_DEFS[j];
        }
        return null;
    }
```

- [ ] **Step 2: Pre-populate with a test level in newBlankLevel**

Temporarily modify `newBlankLevel` to include a few test tiles so we can see rendering. Replace the function body so that after creating the blank grid, it also writes a few test tiles:

```javascript
    function newBlankLevel(width, height, filename) {
        state.width = width;
        state.height = height;
        state.filename = filename;
        state.grid = [];
        for (var r = 0; r < height; r++) {
            var row = [];
            for (var c = 0; c < width; c++) row.push('.');
            state.grid.push(row);
        }
        // DEBUG: test tiles so we can see rendering before draw tool is wired up
        for (var c2 = 0; c2 < width; c2++) state.grid[height - 1][c2] = '=';
        state.grid[5][10] = 'P';
        state.grid[3][20] = 'K';
        state.scrollX = 0;
        state.scrollY = 0;
    }
```

- [ ] **Step 3: Verify rendering**

Reload `https://localhost:3000/level-editor.html`.

Expected:
- Sky-blue background in the main area
- A row of wood planks visible along the bottom of the level area
- A red outline showing the full level bounds
- Grid overlay visible
- The P and K entities visible at their positions

- [ ] **Step 4: Remove the debug tiles**

Revert `newBlankLevel` back to a pure blank level:

```javascript
    function newBlankLevel(width, height, filename) {
        state.width = width;
        state.height = height;
        state.filename = filename;
        state.grid = [];
        for (var r = 0; r < height; r++) {
            var row = [];
            for (var c = 0; c < width; c++) row.push('.');
            state.grid.push(row);
        }
        state.scrollX = 0;
        state.scrollY = 0;
    }
```

Reload and confirm the main area shows an empty sky-blue level bounded by the red outline.

- [ ] **Step 5: Commit**

```bash
git add js/level-editor.js
git commit -m "feat: level editor grid rendering"
```

---

## Task 8: Mouse drawing — draw and erase

**Files:**
- Modify: `js/level-editor.js`

- [ ] **Step 1: Add mouse event handlers**

In `js/level-editor.js`, add the following functions (place them before the `Game.Sprites.loadImages(...)` call at the end):

```javascript
    // ---------------------------------------------------------------
    // Mouse interaction
    // ---------------------------------------------------------------

    function screenToGrid(ev) {
        var rect = canvas.getBoundingClientRect();
        var x = ev.clientX - rect.left + state.scrollX;
        var y = ev.clientY - rect.top + state.scrollY;
        return {
            col: Math.floor(x / state.zoom),
            row: Math.floor(y / state.zoom)
        };
    }

    function paintAt(col, row, ch) {
        if (col < 0 || col >= state.width || row < 0 || row >= state.height) return false;
        if (state.grid[row][col] === ch) return false;

        // Unique entities (P, F) — remove any existing instance first
        if (ch === 'P' || ch === 'F') {
            for (var r = 0; r < state.height; r++) {
                for (var c = 0; c < state.width; c++) {
                    if (state.grid[r][c] === ch) state.grid[r][c] = '.';
                }
            }
        }

        state.grid[row][col] = ch;
        return true;
    }

    function handleMouseDown(ev) {
        if (ev.button === 1) {
            // Middle click — pan
            ev.preventDefault();
            state.isPanning = true;
            state.panStart = { x: ev.clientX, y: ev.clientY };
            state.panScroll = { x: state.scrollX, y: state.scrollY };
            return;
        }
        var pos = screenToGrid(ev);
        state.cursorCol = pos.col;
        state.cursorRow = pos.row;

        if (ev.button === 2) {
            // Right click — erase
            state.isDrawing = 'erase';
            if (paintAt(pos.col, pos.row, '.')) redraw();
            ev.preventDefault();
            return;
        }

        if (ev.button === 0) {
            if (state.currentTool === 'draw') {
                state.isDrawing = 'draw';
                if (paintAt(pos.col, pos.row, state.currentTile.ch)) redraw();
            } else if (state.currentTool === 'erase') {
                state.isDrawing = 'erase';
                if (paintAt(pos.col, pos.row, '.')) redraw();
            }
        }
    }

    function handleMouseMove(ev) {
        if (state.isPanning) {
            var dx = ev.clientX - state.panStart.x;
            var dy = ev.clientY - state.panStart.y;
            state.scrollX = state.panScroll.x - dx;
            state.scrollY = state.panScroll.y - dy;
            clampScroll();
            redraw();
            return;
        }

        var pos = screenToGrid(ev);
        if (pos.col !== state.cursorCol || pos.row !== state.cursorRow) {
            state.cursorCol = pos.col;
            state.cursorRow = pos.row;
            updateStatusBar();
            if (state.isDrawing === 'draw') {
                if (paintAt(pos.col, pos.row, state.currentTile.ch)) redraw();
                else redraw(); // still redraw for cursor update
            } else if (state.isDrawing === 'erase') {
                if (paintAt(pos.col, pos.row, '.')) redraw();
                else redraw();
            } else {
                redraw();
            }
        }
    }

    function handleMouseUp(ev) {
        state.isDrawing = false;
        state.isPanning = false;
    }

    function handleMouseLeave() {
        state.cursorCol = -1;
        state.cursorRow = -1;
        updateStatusBar();
        redraw();
    }

    function clampScroll() {
        var contentW = state.width * state.zoom;
        var contentH = state.height * state.zoom;
        var pad = 80;
        var minX = -pad;
        var minY = -pad;
        var maxX = Math.max(minX, contentW - canvas.width + pad);
        var maxY = Math.max(minY, contentH - canvas.height + pad);
        if (state.scrollX < minX) state.scrollX = minX;
        if (state.scrollX > maxX) state.scrollX = maxX;
        if (state.scrollY < minY) state.scrollY = minY;
        if (state.scrollY > maxY) state.scrollY = maxY;
    }
```

- [ ] **Step 2: Wire up the event listeners in init**

At the end of the `init()` function, before `redraw()` and `updateStatusBar()`, add:

```javascript
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
```

- [ ] **Step 3: Verify drawing works**

Reload `https://localhost:3000/level-editor.html`.

- Select "Plank" from the palette
- Click and drag in the main area → wood planks appear where you click
- Right-click and drag → planks get erased
- Select "Crab" and click somewhere → a crab sprite appears
- Select "Start" (P) and click → player start appears
- Click somewhere else while P is still selected → the player start moves to the new location (only one P exists at a time)
- Move mouse around → white cursor highlight follows, status bar shows current Col,Row

- [ ] **Step 4: Commit**

```bash
git add js/level-editor.js
git commit -m "feat: draw and erase mouse tools"
```

---

## Task 9: Navigation — wheel scroll, keyboard pan, zoom

**Files:**
- Modify: `js/level-editor.js`

- [ ] **Step 1: Add wheel and keyboard handlers**

Add these functions to `js/level-editor.js` (placed alongside the other handlers):

```javascript
    function handleWheel(ev) {
        ev.preventDefault();
        if (ev.ctrlKey || ev.metaKey) {
            // Zoom toward cursor
            var rect = canvas.getBoundingClientRect();
            var mx = ev.clientX - rect.left;
            var my = ev.clientY - rect.top;
            var oldZoom = state.zoom;
            var worldX = (mx + state.scrollX) / oldZoom;
            var worldY = (my + state.scrollY) / oldZoom;

            var dz = ev.deltaY > 0 ? -4 : 4;
            state.zoom = Math.max(8, Math.min(48, state.zoom + dz));
            if (state.zoom === oldZoom) return;

            state.scrollX = worldX * state.zoom - mx;
            state.scrollY = worldY * state.zoom - my;
            clampScroll();
            updateStatusBar();
            redraw();
            return;
        }

        if (ev.shiftKey) {
            state.scrollX += ev.deltaY;
        } else {
            state.scrollY += ev.deltaY;
            state.scrollX += ev.deltaX;
        }
        clampScroll();
        redraw();
    }

    var panKeys = {};
    function handleKeyDown(ev) {
        // Don't steal keys when typing in an input
        if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT') return;

        var key = ev.key.toLowerCase();

        // Pan keys
        if (key === 'w' || key === 'arrowup')    { panKeys.up = true;    ev.preventDefault(); }
        if (key === 's' || key === 'arrowdown')  { panKeys.down = true;  ev.preventDefault(); }
        if (key === 'a' || key === 'arrowleft')  { panKeys.left = true;  ev.preventDefault(); }
        if (key === 'd' || key === 'arrowright') { panKeys.right = true; ev.preventDefault(); }

        // Tool shortcuts
        if (key === 'd' && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !panKeys.right) {
            // 'd' conflicts with pan. Tool selection is via sidebar click in this build.
        }
    }

    function handleKeyUp(ev) {
        var key = ev.key.toLowerCase();
        if (key === 'w' || key === 'arrowup')    panKeys.up = false;
        if (key === 's' || key === 'arrowdown')  panKeys.down = false;
        if (key === 'a' || key === 'arrowleft')  panKeys.left = false;
        if (key === 'd' || key === 'arrowright') panKeys.right = false;
    }

    function panStep() {
        var step = 12;
        var changed = false;
        if (panKeys.up)    { state.scrollY -= step; changed = true; }
        if (panKeys.down)  { state.scrollY += step; changed = true; }
        if (panKeys.left)  { state.scrollX -= step; changed = true; }
        if (panKeys.right) { state.scrollX += step; changed = true; }
        if (changed) {
            clampScroll();
            redraw();
        }
        requestAnimationFrame(panStep);
    }
```

Note: the `handleKeyDown` stub for tool shortcuts is intentionally left as a placeholder — the next task replaces it with a proper keyboard shortcut dispatcher that doesn't conflict with pan keys.

- [ ] **Step 2: Wire up wheel and keyboard listeners in init**

Add to the end of `init()`, after the mouse listeners:

```javascript
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        requestAnimationFrame(panStep);
```

- [ ] **Step 3: Verify navigation**

Reload the editor.

- Mouse wheel scrolls the canvas vertically
- Shift + wheel scrolls horizontally
- Ctrl + wheel zooms in/out (zoom centered on cursor)
- Arrow keys pan the viewport
- Middle-click drag pans freely
- Status bar zoom value updates when zooming

Draw a few tiles, zoom in (Ctrl+wheel up), and confirm the tiles render crisply at the new zoom level.

- [ ] **Step 4: Commit**

```bash
git add js/level-editor.js
git commit -m "feat: scroll pan zoom navigation"
```

---

## Task 10: Level parse and serialize

**Files:**
- Modify: `js/level-editor.js`

- [ ] **Step 1: Add parse and serialize functions**

Add to `js/level-editor.js` (before the mouse handlers section):

```javascript
    // ---------------------------------------------------------------
    // Level text format parse/serialize
    // ---------------------------------------------------------------

    /**
     * Parse a level .txt file into a grid. Preserves comment lines so
     * they can round-trip through save. Returns { grid, width, height, comments }.
     */
    function parseLevelText(text) {
        var rawLines = text.split('\n');
        var comments = [];
        var gridLines = [];

        for (var i = 0; i < rawLines.length; i++) {
            var line = rawLines[i];
            if (line.length === 0) continue;
            if (line[0] === '#' && line[1] === ' ') {
                comments.push(line);
            } else {
                gridLines.push(line);
            }
        }

        var height = gridLines.length;
        var width = 0;
        for (var j = 0; j < gridLines.length; j++) {
            if (gridLines[j].length > width) width = gridLines[j].length;
        }

        var grid = [];
        for (var r = 0; r < height; r++) {
            var row = [];
            var src = gridLines[r];
            for (var c = 0; c < width; c++) {
                row.push(c < src.length ? src[c] : '.');
            }
            grid.push(row);
        }

        return { grid: grid, width: width, height: height, comments: comments };
    }

    function serializeLevel() {
        var lines = [];
        if (state.comments && state.comments.length > 0) {
            for (var i = 0; i < state.comments.length; i++) lines.push(state.comments[i]);
        }
        for (var r = 0; r < state.height; r++) {
            lines.push(state.grid[r].join(''));
        }
        return lines.join('\n') + '\n';
    }
```

- [ ] **Step 2: Update state to include comments**

In the state declaration block at the top, add `comments: []` to the state object:

```javascript
    var state = {
        currentTile: TILE_DEFS[1],
        currentTool: 'draw',
        filename: 'level1.txt',
        grid: [],
        width: 0,
        height: 0,
        comments: [],
        zoom: 24,
        scrollX: 0,
        scrollY: 0,
        cursorCol: -1,
        cursorRow: -1,
        isDrawing: false,
        isPanning: false,
        panStart: null,
        panScroll: null
    };
```

- [ ] **Step 3: Add loadLevelText helper**

Add this function near the parse/serialize section:

```javascript
    function loadLevelText(text, filename) {
        var parsed = parseLevelText(text);
        state.grid = parsed.grid;
        state.width = parsed.width;
        state.height = parsed.height;
        state.comments = parsed.comments;
        state.filename = filename;
        state.scrollX = 0;
        state.scrollY = 0;
        updateStatusBar();
        redraw();
    }
```

- [ ] **Step 4: Expose parse/serialize on window for manual testing**

At the very end of the IIFE (just before `})();`), add:

```javascript
    // Exposed for manual testing
    window.__levelEditor = {
        parse: parseLevelText,
        serialize: serializeLevel,
        loadText: loadLevelText,
        state: state
    };
```

- [ ] **Step 5: Verify round-trip in browser console**

Reload the editor, open the browser devtools console, and run:

```javascript
fetch('/levels/level1.txt').then(r => r.text()).then(t => {
    window.__levelEditor.loadText(t, 'level1.txt');
});
```

Expected: Level 1 appears in the editor — wood planks, crabs, carrots, player start, flag, water, all visible.

Then:

```javascript
console.log(window.__levelEditor.serialize());
```

Expected: The output matches the original file structure (comments at top, grid rows below).

- [ ] **Step 6: Commit**

```bash
git add js/level-editor.js
git commit -m "feat: level text parse and serialize"
```

---

## Task 11: File operations — load, save, new

**Files:**
- Modify: `js/level-editor.js`

- [ ] **Step 1: Add file operation functions**

Add to `js/level-editor.js`:

```javascript
    // ---------------------------------------------------------------
    // File operations (API calls)
    // ---------------------------------------------------------------

    function fetchLevelList() {
        return fetch('/api/list-levels')
            .then(function (r) { return r.json(); });
    }

    function fetchLevel(filename) {
        return fetch('/api/load-level?file=' + encodeURIComponent(filename))
            .then(function (r) {
                if (!r.ok) throw new Error('Failed to load ' + filename);
                return r.text();
            });
    }

    function saveLevelToServer(filename, data) {
        return fetch('/api/save-level', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: filename, data: data })
        }).then(function (r) { return r.json(); });
    }

    function refreshLevelDropdown() {
        var select = document.getElementById('level-file');
        return fetchLevelList().then(function (files) {
            select.innerHTML = '';
            files.forEach(function (f) {
                var opt = document.createElement('option');
                opt.value = f;
                opt.textContent = f;
                if (f === state.filename) opt.selected = true;
                select.appendChild(opt);
            });
        });
    }

    function handleLoad() {
        var select = document.getElementById('level-file');
        var filename = select.value;
        if (!filename) return;

        // Check for localStorage draft
        var draftKey = 'level-editor:' + filename;
        var draft = localStorage.getItem(draftKey);
        if (draft) {
            if (confirm('There is an unsaved draft for ' + filename + '. Restore it?')) {
                loadLevelText(draft, filename);
                showMessage('Draft restored');
                return;
            }
        }

        fetchLevel(filename).then(function (text) {
            loadLevelText(text, filename);
            showMessage('Loaded ' + filename);
        }).catch(function (e) {
            showMessage('Load failed: ' + e.message);
        });
    }

    function handleSave() {
        var filename = state.filename;
        if (!filename || filename === 'untitled.txt') {
            filename = prompt('Save as (e.g., level4.txt):', 'level4.txt');
            if (!filename) return;
            if (!/^level[a-zA-Z0-9_-]+\.txt$/.test(filename)) {
                showMessage('Invalid filename — must match levelN.txt');
                return;
            }
            state.filename = filename;
        }

        var data = serializeLevel();
        saveLevelToServer(filename, data).then(function (result) {
            if (result.ok) {
                showMessage('Saved ' + filename);
                // Clear the localStorage draft since disk is now authoritative
                localStorage.removeItem('level-editor:' + filename);
                refreshLevelDropdown();
            } else {
                showMessage('Save failed: ' + (result.error || 'unknown'));
            }
        }).catch(function (e) {
            showMessage('Save failed: ' + e.message);
        });
    }

    function handleNew() {
        var w = parseInt(prompt('Level width (in tiles):', '60'), 10);
        if (!w || w < 4) return;
        var h = parseInt(prompt('Level height (in tiles):', '14'), 10);
        if (!h || h < 4) return;
        var fn = prompt('Filename (e.g., level4.txt):', 'level4.txt');
        if (!fn) return;
        if (!/^level[a-zA-Z0-9_-]+\.txt$/.test(fn)) {
            showMessage('Invalid filename — must match levelN.txt');
            return;
        }
        newBlankLevel(w, h, fn);
        state.comments = ['# ' + fn.replace('.txt', '')];
        updateStatusBar();
        redraw();
        showMessage('New level created');
    }

    // ---------------------------------------------------------------
    // Auto-save to localStorage
    // ---------------------------------------------------------------

    var autoSaveTimer = null;
    function scheduleAutoSave() {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(function () {
            if (state.filename && state.filename !== 'untitled.txt') {
                try {
                    localStorage.setItem('level-editor:' + state.filename, serializeLevel());
                } catch (e) { /* quota exceeded — ignore */ }
            }
        }, 500);
    }
```

- [ ] **Step 2: Wire up auto-save on paint**

In `paintAt`, after setting the tile, call scheduleAutoSave. Replace `paintAt`:

```javascript
    function paintAt(col, row, ch) {
        if (col < 0 || col >= state.width || row < 0 || row >= state.height) return false;
        if (state.grid[row][col] === ch) return false;

        if (ch === 'P' || ch === 'F') {
            for (var r = 0; r < state.height; r++) {
                for (var c = 0; c < state.width; c++) {
                    if (state.grid[r][c] === ch) state.grid[r][c] = '.';
                }
            }
        }

        state.grid[row][col] = ch;
        scheduleAutoSave();
        return true;
    }
```

- [ ] **Step 3: Wire up button handlers and Ctrl+S in init**

At the end of `init()`, add:

```javascript
        document.getElementById('btn-load').addEventListener('click', handleLoad);
        document.getElementById('btn-save').addEventListener('click', handleSave);
        document.getElementById('btn-new').addEventListener('click', handleNew);

        // Ctrl+S to save
        window.addEventListener('keydown', function (ev) {
            if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
                ev.preventDefault();
                handleSave();
            }
        });

        refreshLevelDropdown();
```

- [ ] **Step 4: Verify load → edit → save round trip**

Reload `https://localhost:3000/level-editor.html`.

1. The level dropdown should populate with `level1.txt`, `level2.txt`, `level3.txt`
2. Select `level1.txt` and click **Load** → level 1 appears in the editor
3. Make a small edit (paint a wood plank somewhere)
4. Click **Save to Game** → status bar shows "Saved level1.txt"
5. Verify the file was written:
   ```bash
   git diff levels/level1.txt
   ```
   Should show your edit.
6. Revert: `git checkout levels/level1.txt`

- [ ] **Step 5: Verify New Level dialog**

- Click **New Level**
- Enter width 40, height 20, filename `level_test.txt`
- Expected: a new blank 40x20 level appears, status bar shows `Size: 40x20`
- Click Save to Game → file saves
- Verify: `ls levels/level_test.txt` exists
- Clean up: `rm levels/level_test.txt`

- [ ] **Step 6: Verify localStorage draft restore**

1. Load level1.txt
2. Paint a few tiles (don't save)
3. Reload the page
4. Select level1.txt in the dropdown and click Load
5. Expected: confirm dialog "There is an unsaved draft for level1.txt. Restore it?"
6. Click OK → your unsaved edits are restored

- [ ] **Step 7: Commit**

```bash
git add js/level-editor.js
git commit -m "feat: load save and new level operations"
```

---

## Task 12: Fill tool and keyboard shortcuts

**Files:**
- Modify: `js/level-editor.js`

- [ ] **Step 1: Implement flood fill**

Add the `floodFill` function to `js/level-editor.js` near the paint functions:

```javascript
    function floodFill(col, row, newCh) {
        if (col < 0 || col >= state.width || row < 0 || row >= state.height) return;
        var targetCh = state.grid[row][col];
        if (targetCh === newCh) return;

        // BFS stack-based flood fill
        var stack = [[col, row]];
        while (stack.length > 0) {
            var pos = stack.pop();
            var c = pos[0], r = pos[1];
            if (c < 0 || c >= state.width || r < 0 || r >= state.height) continue;
            if (state.grid[r][c] !== targetCh) continue;
            state.grid[r][c] = newCh;
            stack.push([c + 1, r]);
            stack.push([c - 1, r]);
            stack.push([c, r + 1]);
            stack.push([c, r - 1]);
        }
        scheduleAutoSave();
    }
```

- [ ] **Step 2: Invoke fill from mouse down**

In `handleMouseDown`, add a fill branch. Replace the `if (state.currentTool === 'draw')` block:

```javascript
        if (ev.button === 0) {
            if (state.currentTool === 'draw') {
                state.isDrawing = 'draw';
                if (paintAt(pos.col, pos.row, state.currentTile.ch)) redraw();
            } else if (state.currentTool === 'erase') {
                state.isDrawing = 'erase';
                if (paintAt(pos.col, pos.row, '.')) redraw();
            } else if (state.currentTool === 'fill') {
                floodFill(pos.col, pos.row, state.currentTile.ch);
                redraw();
            }
        }
```

- [ ] **Step 3: Replace handleKeyDown with a proper dispatcher**

Replace the existing `handleKeyDown` function with a version that handles tool shortcuts AND pan keys without conflict. The key is: `d` and `s` are used as pan keys, so tool selection for Draw/Select uses the sidebar button (already works via click) or `Ctrl`-less direct keys that don't conflict. We'll use number keys 1-4 as an alternate for tool switching.

```javascript
    function handleKeyDown(ev) {
        if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT') return;

        var key = ev.key;

        // Tool hotkeys — number keys to avoid conflicts with WASD pan
        if (key === '1') { state.currentTool = 'draw';   refreshActivePalette(); updateStatusBar(); ev.preventDefault(); return; }
        if (key === '2') { state.currentTool = 'erase';  refreshActivePalette(); updateStatusBar(); ev.preventDefault(); return; }
        if (key === '3') { state.currentTool = 'fill';   refreshActivePalette(); updateStatusBar(); ev.preventDefault(); return; }
        if (key === '4') { state.currentTool = 'select'; refreshActivePalette(); updateStatusBar(); ev.preventDefault(); return; }

        // Tile hotkeys (match TILE_DEFS.key / ENTITY_DEFS.key)
        var allDefs = TILE_DEFS.concat(ENTITY_DEFS);
        for (var i = 0; i < allDefs.length; i++) {
            var def = allDefs[i];
            // Entity shortcuts require Shift (they are uppercase letters)
            var matches = (def.key === key);
            if (matches) {
                state.currentTile = def;
                refreshActivePalette();
                updateStatusBar();
                ev.preventDefault();
                return;
            }
        }

        // Pan keys
        var lower = key.toLowerCase();
        if (lower === 'w' || key === 'ArrowUp')    { panKeys.up = true;    ev.preventDefault(); }
        if (lower === 's' || key === 'ArrowDown')  { panKeys.down = true;  ev.preventDefault(); }
        if (lower === 'a' || key === 'ArrowLeft')  { panKeys.left = true;  ev.preventDefault(); }
        if (lower === 'd' || key === 'ArrowRight') { panKeys.right = true; ev.preventDefault(); }

        // Grid toggle
        if (lower === 'g') { state.showGrid = !state.showGrid; redraw(); ev.preventDefault(); }
    }
```

Also update `handleKeyUp` to handle both cases (already fine but re-declare for clarity):

```javascript
    function handleKeyUp(ev) {
        var key = ev.key;
        var lower = key.toLowerCase();
        if (lower === 'w' || key === 'ArrowUp')    panKeys.up = false;
        if (lower === 's' || key === 'ArrowDown')  panKeys.down = false;
        if (lower === 'a' || key === 'ArrowLeft')  panKeys.left = false;
        if (lower === 'd' || key === 'ArrowRight') panKeys.right = false;
    }
```

- [ ] **Step 4: Add showGrid state and respect it in redraw**

Add `showGrid: true` to the `state` object. In the `redraw` function, wrap the grid-drawing block with:

```javascript
        // Grid overlay
        if (state.showGrid) {
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (var c2 = startCol; c2 <= endCol; c2++) {
                var x = c2 * z - state.scrollX + 0.5;
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
            }
            for (var r2 = startRow; r2 <= endRow; r2++) {
                var y = r2 * z - state.scrollY + 0.5;
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
            }
            ctx.stroke();
        }
```

- [ ] **Step 5: Verify Fill and keyboard shortcuts**

Reload.

- Load level1.txt
- Press `3` → Fill tool becomes active
- Click on a large empty sky area → the region floods with the current tile
- Press `1` → back to Draw
- Press `=` → plank selected
- Press `#` → wall selected
- Press `g` → grid toggles off and back on
- Press `Ctrl+Z` does nothing yet (no undo implemented — handled in next task)

- [ ] **Step 6: Commit**

```bash
git add js/level-editor.js
git commit -m "feat: fill tool and keyboard shortcuts"
```

---

## Task 13: Undo and redo

**Files:**
- Modify: `js/level-editor.js`

- [ ] **Step 1: Add undo/redo stacks and snapshot helper**

Add to `js/level-editor.js`:

```javascript
    // ---------------------------------------------------------------
    // Undo / redo
    // ---------------------------------------------------------------

    var undoStack = [];
    var redoStack = [];
    var MAX_UNDO = 50;

    function snapshotGrid() {
        var copy = [];
        for (var r = 0; r < state.grid.length; r++) {
            copy.push(state.grid[r].slice());
        }
        return copy;
    }

    function pushUndo() {
        undoStack.push({
            grid: snapshotGrid(),
            width: state.width,
            height: state.height
        });
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack = [];
    }

    function undo() {
        if (undoStack.length === 0) { showMessage('Nothing to undo'); return; }
        redoStack.push({
            grid: snapshotGrid(),
            width: state.width,
            height: state.height
        });
        var prev = undoStack.pop();
        state.grid = prev.grid;
        state.width = prev.width;
        state.height = prev.height;
        updateStatusBar();
        redraw();
        showMessage('Undo');
    }

    function redo() {
        if (redoStack.length === 0) { showMessage('Nothing to redo'); return; }
        undoStack.push({
            grid: snapshotGrid(),
            width: state.width,
            height: state.height
        });
        var next = redoStack.pop();
        state.grid = next.grid;
        state.width = next.width;
        state.height = next.height;
        updateStatusBar();
        redraw();
        showMessage('Redo');
    }
```

- [ ] **Step 2: Take snapshots on action boundaries**

Drawing is a drag operation — we only want one undo entry per drag, not one per tile. Snapshot on mouse down, not on every tile paint.

Update `handleMouseDown` to call `pushUndo()` at the start of a draw/erase/fill action. Replace the `if (ev.button === 0)` block:

```javascript
        if (ev.button === 0) {
            if (state.currentTool === 'draw') {
                pushUndo();
                state.isDrawing = 'draw';
                if (paintAt(pos.col, pos.row, state.currentTile.ch)) redraw();
            } else if (state.currentTool === 'erase') {
                pushUndo();
                state.isDrawing = 'erase';
                if (paintAt(pos.col, pos.row, '.')) redraw();
            } else if (state.currentTool === 'fill') {
                pushUndo();
                floodFill(pos.col, pos.row, state.currentTile.ch);
                redraw();
            }
        }
```

Also snapshot on right-click erase. In the same function, update the `if (ev.button === 2)` block:

```javascript
        if (ev.button === 2) {
            pushUndo();
            state.isDrawing = 'erase';
            if (paintAt(pos.col, pos.row, '.')) redraw();
            ev.preventDefault();
            return;
        }
```

- [ ] **Step 3: Wire up Ctrl+Z and Ctrl+Y**

Add to the existing Ctrl+S keydown handler in `init()`. Replace that listener with:

```javascript
        window.addEventListener('keydown', function (ev) {
            if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT') return;
            var ctrl = ev.ctrlKey || ev.metaKey;
            if (ctrl && ev.key.toLowerCase() === 's') {
                ev.preventDefault();
                handleSave();
            } else if (ctrl && ev.key.toLowerCase() === 'z' && !ev.shiftKey) {
                ev.preventDefault();
                undo();
            } else if (ctrl && (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey))) {
                ev.preventDefault();
                redo();
            }
        });
```

- [ ] **Step 4: Verify undo/redo**

Reload.

- Load level1.txt
- Draw several tiles as separate click-drag actions
- Press Ctrl+Z → most recent action is undone
- Press Ctrl+Z again → previous action is undone
- Press Ctrl+Y → redoes
- Press Ctrl+Shift+Z → also redoes
- Status bar shows "Undo" / "Redo" messages

- [ ] **Step 5: Commit**

```bash
git add js/level-editor.js
git commit -m "feat: undo and redo"
```

---

## Task 14: Game viewport overlay indicator

**Files:**
- Modify: `js/level-editor.js`

- [ ] **Step 1: Draw the viewport overlay**

The game renders a 448x224 viewport, which is 28 tiles wide by 14 tiles tall. Show a dashed rectangle of that size anchored at the Player Start (P) position (or top-left if no P yet) so level designers can visualize what the player sees on screen at a time.

Add to the end of `redraw()`, after the cursor highlight:

```javascript
        // Game viewport overlay (28x14 tiles anchored to player start)
        var playerPos = findPlayerStart();
        if (playerPos) {
            var vpW = 28 * z;
            var vpH = 14 * z;
            // Anchor the viewport so the player is roughly centered
            var vpX = (playerPos.col * z) - vpW / 2 + z / 2 - state.scrollX;
            var vpY = (playerPos.row * z) - vpH / 2 + z / 2 - state.scrollY;
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,0,0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(vpX, vpY, vpW, vpH);
            ctx.restore();
        }
    }

    function findPlayerStart() {
        for (var r = 0; r < state.height; r++) {
            for (var c = 0; c < state.width; c++) {
                if (state.grid[r][c] === 'P') return { col: c, row: r };
            }
        }
        return null;
    }
```

- [ ] **Step 2: Verify viewport overlay**

Reload, load level1.txt. A dashed yellow rectangle should be visible, 28 tiles wide by 14 tiles tall, centered on the player start (P). Move the P (select Start and click a new location) — the rectangle follows.

- [ ] **Step 3: Commit**

```bash
git add js/level-editor.js
git commit -m "feat: game viewport overlay indicator"
```

---

## Task 15: Resize level (grow/shrink rows and columns)

**Files:**
- Modify: `js/level-editor.js`

- [ ] **Step 1: Add resize controls to the sidebar**

Modify `level-editor.html`: inside the `.level-controls` div, add resize buttons after the Save button:

```html
        <label>Resize</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          <button id="btn-grow-right">+Col →</button>
          <button id="btn-shrink-right">−Col →</button>
          <button id="btn-grow-bottom">+Row ↓</button>
          <button id="btn-shrink-bottom">−Row ↓</button>
          <button id="btn-grow-top">+Row ↑</button>
          <button id="btn-shrink-top">−Row ↑</button>
          <button id="btn-grow-left">+Col ←</button>
          <button id="btn-shrink-left">−Col ←</button>
        </div>
```

- [ ] **Step 2: Add resize functions to level-editor.js**

Add in `js/level-editor.js`:

```javascript
    // ---------------------------------------------------------------
    // Resize level
    // ---------------------------------------------------------------

    function growRight() {
        pushUndo();
        for (var r = 0; r < state.height; r++) state.grid[r].push('.');
        state.width++;
        updateStatusBar();
        redraw();
        scheduleAutoSave();
    }

    function shrinkRight() {
        if (state.width <= 4) { showMessage('Too small'); return; }
        pushUndo();
        for (var r = 0; r < state.height; r++) state.grid[r].pop();
        state.width--;
        updateStatusBar();
        redraw();
        scheduleAutoSave();
    }

    function growLeft() {
        pushUndo();
        for (var r = 0; r < state.height; r++) state.grid[r].unshift('.');
        state.width++;
        updateStatusBar();
        redraw();
        scheduleAutoSave();
    }

    function shrinkLeft() {
        if (state.width <= 4) { showMessage('Too small'); return; }
        pushUndo();
        for (var r = 0; r < state.height; r++) state.grid[r].shift();
        state.width--;
        updateStatusBar();
        redraw();
        scheduleAutoSave();
    }

    function growBottom() {
        pushUndo();
        var row = [];
        for (var c = 0; c < state.width; c++) row.push('.');
        state.grid.push(row);
        state.height++;
        updateStatusBar();
        redraw();
        scheduleAutoSave();
    }

    function shrinkBottom() {
        if (state.height <= 4) { showMessage('Too small'); return; }
        pushUndo();
        state.grid.pop();
        state.height--;
        updateStatusBar();
        redraw();
        scheduleAutoSave();
    }

    function growTop() {
        pushUndo();
        var row = [];
        for (var c = 0; c < state.width; c++) row.push('.');
        state.grid.unshift(row);
        state.height++;
        updateStatusBar();
        redraw();
        scheduleAutoSave();
    }

    function shrinkTop() {
        if (state.height <= 4) { showMessage('Too small'); return; }
        pushUndo();
        state.grid.shift();
        state.height--;
        updateStatusBar();
        redraw();
        scheduleAutoSave();
    }
```

- [ ] **Step 3: Wire up resize buttons in init**

At the end of `init()`, add:

```javascript
        document.getElementById('btn-grow-right').addEventListener('click', growRight);
        document.getElementById('btn-shrink-right').addEventListener('click', shrinkRight);
        document.getElementById('btn-grow-left').addEventListener('click', growLeft);
        document.getElementById('btn-shrink-left').addEventListener('click', shrinkLeft);
        document.getElementById('btn-grow-bottom').addEventListener('click', growBottom);
        document.getElementById('btn-shrink-bottom').addEventListener('click', shrinkBottom);
        document.getElementById('btn-grow-top').addEventListener('click', growTop);
        document.getElementById('btn-shrink-top').addEventListener('click', shrinkTop);
```

- [ ] **Step 4: Verify resize**

Reload. Load level1.txt.

- Click +Col → → level width increases by 1, status bar updates
- Click +Row ↓ → level gets taller at the bottom
- Click +Row ↑ → level gets taller at the top (existing content shifts down)
- Click −Row ↑ → top row removed
- Verify undo (Ctrl+Z) reverses a resize

- [ ] **Step 5: Commit**

```bash
git add level-editor.html js/level-editor.js
git commit -m "feat: level resize controls"
```

---

## Task 16: Select tool — rectangular selection, copy/cut/paste

**Files:**
- Modify: `js/level-editor.js`

- [ ] **Step 1: Add selection state**

Add these fields to the `state` object at the top of the IIFE:

```javascript
        selection: null,      // { col1, row1, col2, row2 } in grid coords, null when inactive
        clipboard: null,      // { width, height, cells: string[][] }
        selectAnchor: null    // starting corner during a drag
```

- [ ] **Step 2: Handle select tool in mouse events**

Update `handleMouseDown` to add a select branch inside the `if (ev.button === 0)` block:

```javascript
            } else if (state.currentTool === 'select') {
                state.selectAnchor = { col: pos.col, row: pos.row };
                state.selection = { col1: pos.col, row1: pos.row, col2: pos.col, row2: pos.row };
                state.isDrawing = 'select';
                redraw();
            }
```

Update `handleMouseMove` to extend the selection when `state.isDrawing === 'select'`. Inside the existing `if (pos.col !== state.cursorCol || pos.row !== state.cursorRow)` block, add a new branch before the draw/erase branches:

```javascript
            if (state.isDrawing === 'select') {
                state.selection.col2 = pos.col;
                state.selection.row2 = pos.row;
                redraw();
            } else if (state.isDrawing === 'draw') {
```

(The `else if` chains onto the existing draw branch — you're inserting one branch above it, not replacing the chain.)

- [ ] **Step 3: Render the selection rectangle**

In `redraw()`, after the cursor highlight block and before the viewport overlay, add:

```javascript
        // Selection rectangle
        if (state.selection) {
            var sel = normalizeSelection(state.selection);
            var sx = sel.col1 * z - state.scrollX;
            var sy = sel.row1 * z - state.scrollY;
            var sw = (sel.col2 - sel.col1 + 1) * z;
            var sh = (sel.row2 - sel.row1 + 1) * z;
            ctx.save();
            ctx.strokeStyle = '#4af';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(sx, sy, sw, sh);
            ctx.fillStyle = 'rgba(68, 170, 255, 0.1)';
            ctx.fillRect(sx, sy, sw, sh);
            ctx.restore();
        }
```

Add the helper function near the other helpers:

```javascript
    function normalizeSelection(sel) {
        return {
            col1: Math.min(sel.col1, sel.col2),
            row1: Math.min(sel.row1, sel.row2),
            col2: Math.max(sel.col1, sel.col2),
            row2: Math.max(sel.row1, sel.row2)
        };
    }
```

- [ ] **Step 4: Add copy/cut/paste/delete functions**

Add to `js/level-editor.js`:

```javascript
    // ---------------------------------------------------------------
    // Clipboard operations
    // ---------------------------------------------------------------

    function copySelection() {
        if (!state.selection) return;
        var sel = normalizeSelection(state.selection);
        var cells = [];
        for (var r = sel.row1; r <= sel.row2; r++) {
            var row = [];
            for (var c = sel.col1; c <= sel.col2; c++) {
                if (r >= 0 && r < state.height && c >= 0 && c < state.width) {
                    row.push(state.grid[r][c]);
                } else {
                    row.push('.');
                }
            }
            cells.push(row);
        }
        state.clipboard = {
            width: sel.col2 - sel.col1 + 1,
            height: sel.row2 - sel.row1 + 1,
            cells: cells
        };
        showMessage('Copied ' + state.clipboard.width + 'x' + state.clipboard.height);
    }

    function cutSelection() {
        if (!state.selection) return;
        copySelection();
        pushUndo();
        var sel = normalizeSelection(state.selection);
        for (var r = sel.row1; r <= sel.row2; r++) {
            for (var c = sel.col1; c <= sel.col2; c++) {
                if (r >= 0 && r < state.height && c >= 0 && c < state.width) {
                    state.grid[r][c] = '.';
                }
            }
        }
        scheduleAutoSave();
        redraw();
        showMessage('Cut');
    }

    function deleteSelection() {
        if (!state.selection) return;
        pushUndo();
        var sel = normalizeSelection(state.selection);
        for (var r = sel.row1; r <= sel.row2; r++) {
            for (var c = sel.col1; c <= sel.col2; c++) {
                if (r >= 0 && r < state.height && c >= 0 && c < state.width) {
                    state.grid[r][c] = '.';
                }
            }
        }
        scheduleAutoSave();
        redraw();
        showMessage('Deleted');
    }

    function pasteClipboard() {
        if (!state.clipboard) { showMessage('Clipboard empty'); return; }
        if (state.cursorCol < 0) { showMessage('Hover over the canvas first'); return; }
        pushUndo();
        var cb = state.clipboard;
        for (var r = 0; r < cb.height; r++) {
            for (var c = 0; c < cb.width; c++) {
                var tr = state.cursorRow + r;
                var tc = state.cursorCol + c;
                if (tr >= 0 && tr < state.height && tc >= 0 && tc < state.width) {
                    state.grid[tr][tc] = cb.cells[r][c];
                }
            }
        }
        scheduleAutoSave();
        redraw();
        showMessage('Pasted at ' + state.cursorCol + ',' + state.cursorRow);
    }
```

- [ ] **Step 5: Wire up Ctrl+C / Ctrl+X / Ctrl+V / Delete**

Update the Ctrl+S keydown listener in `init()` to also handle clipboard shortcuts. Replace the listener with:

```javascript
        window.addEventListener('keydown', function (ev) {
            if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT') return;
            var ctrl = ev.ctrlKey || ev.metaKey;
            var k = ev.key.toLowerCase();
            if (ctrl && k === 's') { ev.preventDefault(); handleSave(); }
            else if (ctrl && k === 'z' && !ev.shiftKey) { ev.preventDefault(); undo(); }
            else if (ctrl && (k === 'y' || (k === 'z' && ev.shiftKey))) { ev.preventDefault(); redo(); }
            else if (ctrl && k === 'c') { ev.preventDefault(); copySelection(); }
            else if (ctrl && k === 'x') { ev.preventDefault(); cutSelection(); }
            else if (ctrl && k === 'v') { ev.preventDefault(); pasteClipboard(); }
            else if ((ev.key === 'Delete' || ev.key === 'Backspace') && state.selection) {
                ev.preventDefault();
                deleteSelection();
            }
            else if (ev.key === 'Escape') { state.selection = null; redraw(); }
        });
```

- [ ] **Step 6: Verify Select tool**

Reload.

- Load level1.txt
- Press `4` to select the Select tool (or click Select in sidebar)
- Click-drag to select a rectangular area of tiles — dashed blue outline should appear
- Press Ctrl+C → status bar shows "Copied NxM"
- Move mouse to a different area
- Press Ctrl+V → the selection is pasted at the cursor
- Select another area, press Delete → that area becomes air
- Press Ctrl+Z → restores the deleted area
- Select an area, press Ctrl+X → area is removed and copied to clipboard
- Press Escape → selection is cleared

- [ ] **Step 7: Commit**

```bash
git add js/level-editor.js
git commit -m "feat: select tool with copy cut paste"
```

---

## Task 17: Scrollbar indicators

**Files:**
- Modify: `js/level-editor.js`

- [ ] **Step 1: Add scrollbar drawing to redraw()**

In `redraw()`, as the very last block (after the viewport overlay), add:

```javascript
        // Scrollbar indicators (bottom and right edges)
        var contentW = state.width * z;
        var contentH = state.height * z;
        var barThickness = 6;
        var barMargin = 2;

        // Horizontal scrollbar
        if (contentW > w) {
            var hTrackX = 0;
            var hTrackY = h - barThickness - barMargin;
            var hTrackW = w;
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(hTrackX, hTrackY, hTrackW, barThickness);

            var hRatio = w / contentW;
            var hThumbW = Math.max(20, hTrackW * hRatio);
            var hScrollable = contentW - w;
            var hProgress = hScrollable > 0 ? state.scrollX / hScrollable : 0;
            if (hProgress < 0) hProgress = 0;
            if (hProgress > 1) hProgress = 1;
            var hThumbX = hProgress * (hTrackW - hThumbW);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(hThumbX, hTrackY, hThumbW, barThickness);
        }

        // Vertical scrollbar
        if (contentH > h) {
            var vTrackX = w - barThickness - barMargin;
            var vTrackY = 0;
            var vTrackH = h;
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(vTrackX, vTrackY, barThickness, vTrackH);

            var vRatio = h / contentH;
            var vThumbH = Math.max(20, vTrackH * vRatio);
            var vScrollable = contentH - h;
            var vProgress = vScrollable > 0 ? state.scrollY / vScrollable : 0;
            if (vProgress < 0) vProgress = 0;
            if (vProgress > 1) vProgress = 1;
            var vThumbY = vProgress * (vTrackH - vThumbH);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(vTrackX, vThumbY, barThickness, vThumbH);
        }
```

- [ ] **Step 2: Verify scrollbars**

Reload. Load level1.txt. The level is wider than the canvas, so a horizontal scrollbar should appear at the bottom. Scroll left/right with Shift+wheel — the thumb should move in sync.

Create a new 20x30 level (taller than the viewport). A vertical scrollbar should appear on the right. Scroll up/down with the wheel — the vertical thumb should move.

- [ ] **Step 3: Commit**

```bash
git add js/level-editor.js
git commit -m "feat: scrollbar indicators"
```

---

## Task 18: Polish — link from index, cleanup debug, final verification

**Files:**
- Modify: `index.html`
- Modify: `js/level-editor.js` (remove debug exposure)

- [ ] **Step 1: Add a link to the level editor from index.html**

Read `index.html` and add a small link to the level editor. Read the file first to see its structure, then add a link. Add this near the existing editor link (or in a sensible place based on the current layout):

Open `index.html` and add a link:
```html
<a href="level-editor.html" style="color:#e94560">Level Editor</a>
```

Place it adjacent to the existing pixel editor link so both tools are easy to find.

- [ ] **Step 2: Remove the __levelEditor debug exposure**

In `js/level-editor.js`, delete the debug exposure block added in Task 10:

```javascript
    // Exposed for manual testing
    window.__levelEditor = {
        parse: parseLevelText,
        serialize: serializeLevel,
        loadText: loadLevelText,
        state: state
    };
```

- [ ] **Step 3: Full workflow verification**

Start the server and walk through the full workflow:

1. Open `https://localhost:3000/level-editor.html`
2. Create a new level: click **New Level**, 50 wide, 18 tall, name `level_test.txt`
3. Draw a ground layer: select Plank, draw along the bottom row
4. Add vertical elements: stack planks upward in a few spots
5. Place a player start: select Start (click Start in sidebar), click near left side
6. Place a flag: select Flag, click near right side
7. Scroll horizontally (Shift+wheel or arrow keys) and vertically (wheel)
8. Zoom in with Ctrl+wheel — verify tiles remain crisp
9. Click **Save to Game**
10. Open `https://localhost:3000/` in another tab
11. Manually edit `js/main.js` to add the new level to `levelFiles` and `levelNames` temporarily, or just overwrite `levels/level1.txt` with your test
12. Play the level in the game — confirm it loads and plays correctly
13. If the level is taller than 14 rows, confirm the camera scrolls vertically as the player jumps

Clean up:
```bash
rm levels/level_test.txt
git checkout levels/level1.txt js/main.js
```

- [ ] **Step 4: Commit**

```bash
git add index.html js/level-editor.js
git commit -m "feat: link level editor from index and remove debug"
```

---

## Summary

After all 18 tasks:
- Server has three new API endpoints for level I/O
- Renderer supports vertical camera scrolling for tall levels
- A full level editor lives at `/level-editor.html` with:
  - Left palette (tiles, entities, tools, level controls, resize)
  - Big scrollable canvas with grid overlay, scrollbar indicators, and game viewport overlay
  - Mouse drawing (draw, erase, fill, right-click erase)
  - Select tool with copy/cut/paste/delete
  - Pan/zoom navigation (wheel, shift-wheel, middle-drag, WASD, arrows, Ctrl-wheel)
  - Undo/redo
  - Resize in 4 directions
  - LocalStorage auto-save drafts
  - Save to disk via server
  - Load existing levels
  - New level creation
- Existing levels continue to play identically
