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
