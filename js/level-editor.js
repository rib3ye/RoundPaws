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
        showGrid: true,
        zoom: 24,            // pixels per tile on screen
        scrollX: 0,          // canvas scroll offset in pixels
        scrollY: 0,
        cursorCol: -1,
        cursorRow: -1,
        isDrawing: false,
        isPanning: false,
        panStart: null,
        panScroll: null,
        selection: null,      // { col1, row1, col2, row2 } in grid coords, null when inactive
        clipboard: null,      // { width, height, cells: string[][] }
        selectAnchor: null    // starting corner during a drag
    };

    // DOM
    var canvas, ctx, mainArea;
    var statusPos, statusSize, statusTool, statusTile, statusMsg, statusZoom;
    var levelNameInput, levelDescInput;

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
        levelNameInput = document.getElementById('level-name');
        levelDescInput = document.getElementById('level-description');

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

        document.getElementById('btn-load').addEventListener('click', handleLoad);
        document.getElementById('btn-reset').addEventListener('click', handleReset);
        document.getElementById('btn-save').addEventListener('click', handleSave);
        document.getElementById('btn-new').addEventListener('click', handleNew);

        levelNameInput.addEventListener('input', handleMetaInput);
        levelDescInput.addEventListener('input', handleMetaInput);

        document.getElementById('btn-grow-right').addEventListener('click', growRight);
        document.getElementById('btn-shrink-right').addEventListener('click', shrinkRight);
        document.getElementById('btn-grow-left').addEventListener('click', growLeft);
        document.getElementById('btn-shrink-left').addEventListener('click', shrinkLeft);
        document.getElementById('btn-grow-bottom').addEventListener('click', growBottom);
        document.getElementById('btn-shrink-bottom').addEventListener('click', shrinkBottom);
        document.getElementById('btn-grow-top').addEventListener('click', growTop);
        document.getElementById('btn-shrink-top').addEventListener('click', shrinkTop);

        window.addEventListener('keydown', function (ev) {
            if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT' || ev.target.tagName === 'TEXTAREA') return;
            var ctrl = ev.ctrlKey || ev.metaKey;
            var k = ev.key.toLowerCase();
            if (ctrl && k === 's') { ev.preventDefault(); handleSave(); }
            else if (ctrl && k === 'n') { ev.preventDefault(); handleNew(); }
            else if (ctrl && k === 'z' && !ev.shiftKey) { ev.preventDefault(); undo(); }
            else if (ctrl && (k === 'y' || (k === 'z' && ev.shiftKey))) { ev.preventDefault(); redo(); }
            else if (ctrl && k === 'c') { ev.preventDefault(); copySelection(); }
            else if (ctrl && k === 'x') { ev.preventDefault(); cutSelection(); }
            else if (ctrl && k === 'v') { ev.preventDefault(); pasteClipboard(); }
            else if ((ev.key === 'Delete' || ev.key === 'Backspace') && state.selection) {
                ev.preventDefault();
                deleteSelection();
            }
            else if (ev.key === 'Escape') {
                state.selection = null;
                state.selectAnchor = null;
                state.isDrawing = false;
                redraw();
            }
        });

        // Auto-load level1.txt on startup so the editor opens on a real
        // level instead of a blank canvas. Prefers a saved draft if one
        // exists (so reopening the editor picks up where you left off),
        // falling back to disk, then to the blank placeholder.
        refreshLevelDropdown().then(function () {
            autoLoadInitialLevel('level1.txt');
        });

        syncMetaInputsFromState();
        redraw();
        updateStatusBar();
    }

    function autoLoadInitialLevel(filename) {
        var draftKey = 'level-editor:' + filename;
        var draft = null;
        try { draft = localStorage.getItem(draftKey); } catch (e) { /* ignore */ }

        function afterLoad(from) {
            var select = document.getElementById('level-file');
            if (select) {
                for (var i = 0; i < select.options.length; i++) {
                    if (select.options[i].value === filename) {
                        select.selectedIndex = i;
                        break;
                    }
                }
            }
            showMessage('Loaded ' + filename + ' (' + from + ')');
        }

        if (draft) {
            loadLevelText(draft, filename);
            afterLoad('draft');
            return;
        }

        fetchLevel(filename).then(function (text) {
            loadLevelText(text, filename);
            afterLoad('disk');
        }).catch(function () {
            // Level1 not available — stay on the blank placeholder
        });
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

    function findPlayerStart() {
        for (var r = 0; r < state.height; r++) {
            for (var c = 0; c < state.width; c++) {
                if (state.grid[r][c] === 'P') return { col: c, row: r };
            }
        }
        return null;
    }

    function normalizeSelection(sel) {
        return {
            col1: Math.min(sel.col1, sel.col2),
            row1: Math.min(sel.row1, sel.row2),
            col2: Math.max(sel.col1, sel.col2),
            row2: Math.max(sel.row1, sel.row2)
        };
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
        syncMetaInputsFromState();
        updateStatusBar();
        redraw();
    }

    // ---------------------------------------------------------------
    // Level metadata (name + description) — stored as `# ` comment
    // lines at the top of the file. The first comment line is the
    // "name"; any remaining comment lines are the "description", one
    // line per row.
    // ---------------------------------------------------------------

    function stripCommentPrefix(line) {
        // `# foo` -> `foo`, `#` alone -> ``, tolerant of missing space
        if (line.length >= 2 && line[0] === '#' && line[1] === ' ') return line.substring(2);
        if (line.length >= 1 && line[0] === '#') return line.substring(1);
        return line;
    }

    function commentsToMeta(comments) {
        if (!comments || comments.length === 0) return { name: '', description: '' };
        var name = stripCommentPrefix(comments[0]);
        var descLines = [];
        for (var i = 1; i < comments.length; i++) {
            descLines.push(stripCommentPrefix(comments[i]));
        }
        return { name: name, description: descLines.join('\n') };
    }

    function metaToComments(name, description) {
        var out = [];
        var trimmedName = (name || '').replace(/\s+$/, '');
        if (trimmedName.length > 0) {
            out.push('# ' + trimmedName);
        }
        var descLines = (description || '').split('\n');
        // Drop trailing blank lines so they don't round-trip into stray comments
        while (descLines.length > 0 && descLines[descLines.length - 1].replace(/\s+$/, '') === '') {
            descLines.pop();
        }
        for (var i = 0; i < descLines.length; i++) {
            var line = descLines[i].replace(/\s+$/, '');
            out.push(line.length > 0 ? '# ' + line : '#');
        }
        return out;
    }

    function syncMetaInputsFromState() {
        if (!levelNameInput || !levelDescInput) return;
        var meta = commentsToMeta(state.comments);
        levelNameInput.value = meta.name;
        levelDescInput.value = meta.description;
    }

    function handleMetaInput() {
        state.comments = metaToComments(levelNameInput.value, levelDescInput.value);
        scheduleAutoSave();
    }

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

    function handleReset() {
        var select = document.getElementById('level-file');
        var filename = select.value;
        if (!filename) { showMessage('No file selected'); return; }

        if (!confirm('Discard current edits and reload ' + filename + ' from disk?')) return;

        // Drop any localStorage draft so the next Load won't offer to restore it
        localStorage.removeItem('level-editor:' + filename);

        fetchLevel(filename).then(function (text) {
            loadLevelText(text, filename);
            showMessage('Reset to disk: ' + filename);
        }).catch(function (e) {
            showMessage('Reset failed: ' + e.message);
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
        syncMetaInputsFromState();
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
        scheduleAutoSave();
        return true;
    }

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
        // Shift scroll so the existing content stays visually anchored
        state.scrollX += state.zoom;
        clampScroll();
        updateStatusBar();
        redraw();
        scheduleAutoSave();
    }

    function shrinkLeft() {
        if (state.width <= 4) { showMessage('Too small'); return; }
        pushUndo();
        for (var r = 0; r < state.height; r++) state.grid[r].shift();
        state.width--;
        state.scrollX -= state.zoom;
        clampScroll();
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
        // Shift scroll so the existing content stays visually anchored
        state.scrollY += state.zoom;
        clampScroll();
        updateStatusBar();
        redraw();
        scheduleAutoSave();
    }

    function shrinkTop() {
        if (state.height <= 4) { showMessage('Too small'); return; }
        pushUndo();
        state.grid.shift();
        state.height--;
        state.scrollY -= state.zoom;
        clampScroll();
        updateStatusBar();
        redraw();
        scheduleAutoSave();
    }

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
            pushUndo();
            state.isDrawing = 'erase';
            if (paintAt(pos.col, pos.row, '.')) redraw();
            ev.preventDefault();
            return;
        }

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
            } else if (state.currentTool === 'select') {
                state.selectAnchor = { col: pos.col, row: pos.row };
                state.selection = { col1: pos.col, row1: pos.row, col2: pos.col, row2: pos.row };
                state.isDrawing = 'select';
                redraw();
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
            if (state.isDrawing === 'select') {
                state.selection.col2 = pos.col;
                state.selection.row2 = pos.row;
                redraw();
            } else if (state.isDrawing === 'draw') {
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
        if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT' || ev.target.tagName === 'TEXTAREA') return;

        var key = ev.key;

        // Tool hotkeys — number keys and letter keys both work.
        // Letter keys D/S take precedence over WASD pan; use arrow keys to
        // pan down/right instead.
        if (key === '1' || key === 'd') { state.currentTool = 'draw';   refreshActivePalette(); updateStatusBar(); ev.preventDefault(); return; }
        if (key === '2' || key === 'e') { state.currentTool = 'erase';  refreshActivePalette(); updateStatusBar(); ev.preventDefault(); return; }
        if (key === '3' || key === 'f') { state.currentTool = 'fill';   refreshActivePalette(); updateStatusBar(); ev.preventDefault(); return; }
        if (key === '4' || key === 's') { state.currentTool = 'select'; refreshActivePalette(); updateStatusBar(); ev.preventDefault(); return; }

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

        // Pan keys — W/A for up/left, arrow keys for all four directions.
        // D/S are owned by tool shortcuts above.
        var lower = key.toLowerCase();
        if (lower === 'w' || key === 'ArrowUp')    { panKeys.up = true;    ev.preventDefault(); }
        if (key === 'ArrowDown')                   { panKeys.down = true;  ev.preventDefault(); }
        if (lower === 'a' || key === 'ArrowLeft')  { panKeys.left = true;  ev.preventDefault(); }
        if (key === 'ArrowRight')                  { panKeys.right = true; ev.preventDefault(); }

        // Grid toggle
        if (lower === 'g') { state.showGrid = !state.showGrid; redraw(); ev.preventDefault(); }
    }

    function handleKeyUp(ev) {
        var key = ev.key;
        var lower = key.toLowerCase();
        if (lower === 'w' || key === 'ArrowUp')    panKeys.up = false;
        if (key === 'ArrowDown')                   panKeys.down = false;
        if (lower === 'a' || key === 'ArrowLeft')  panKeys.left = false;
        if (key === 'ArrowRight')                  panKeys.right = false;
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
})();
