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
        comments: [],
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

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        requestAnimationFrame(panStep);

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

    // Kick off after sprites are loaded
    Game.Sprites.loadImages(function () {
        init();
    });

    // Exposed for manual testing
    window.__levelEditor = {
        parse: parseLevelText,
        serialize: serializeLevel,
        loadText: loadLevelText,
        state: state
    };
})();
