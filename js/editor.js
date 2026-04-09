/**
 * Pixel Art Editor for Round Paws
 *
 * Kid-friendly, iPad-optimized pixel art editor for creating custom
 * sprite overrides. Draws on a zoomed grid, exports correctly-named
 * PNGs ready to drop into the tiles/ directory.
 */
(function () {
    // ---------------------------------------------------------------
    // Sprite definitions (mirrors spriteInfo in sprites.js)
    // ---------------------------------------------------------------

    var SPRITES = [
        { name: 'cat', w: 16, h: 16, frames: 4, category: 'Player', label: 'Cat (right)' },
        { name: 'cat_left', w: 16, h: 16, frames: 4, category: 'Player', label: 'Cat (left)' },
        { name: 'cat_slide', w: 16, h: 10, frames: 1, category: 'Player', label: 'Slide (right)' },
        { name: 'cat_slide_left', w: 16, h: 10, frames: 1, category: 'Player', label: 'Slide (left)' },
        { name: 'happy_cat', w: 32, h: 32, frames: 1, category: 'Screens', label: 'Happy Cat' },
        { name: 'sleeping_cat', w: 32, h: 16, frames: 3, category: 'Screens', label: 'Sleeping Cat' },
        { name: 'crab', w: 16, h: 12, frames: 4, category: 'Enemy', label: 'Crab' },
        { name: 'carrot', w: 8, h: 14, frames: 1, category: 'Items', label: 'Carrot' },
        { name: 'carrot_projectile', w: 8, h: 4, frames: 1, category: 'Items', label: 'Carrot Shot' },
        { name: 'carrot_projectile_left', w: 8, h: 4, frames: 1, category: 'Items', label: 'Carrot Shot (L)' },
        { name: 'flag', w: 8, h: 16, frames: 2, category: 'Items', label: 'Flag' },
        { name: 'wood_plank', w: 16, h: 16, frames: 1, category: 'Tiles', label: 'Wood Plank' },
        { name: 'hull_wall', w: 16, h: 16, frames: 1, category: 'Tiles', label: 'Hull Wall' },
        { name: 'water', w: 16, h: 16, frames: 4, category: 'Tiles', label: 'Water' },
        { name: 'rope', w: 16, h: 16, frames: 1, category: 'Tiles', label: 'Rope' },
        { name: 'barrel', w: 16, h: 16, frames: 1, category: 'Tiles', label: 'Barrel' },
        { name: 'mast', w: 16, h: 16, frames: 1, category: 'Tiles', label: 'Mast' },
        { name: 'thin_platform', w: 16, h: 16, frames: 1, category: 'Tiles', label: 'Platform' }
    ];

    // NES-inspired color palette
    var PALETTE = [
        null,      // transparent
        '#000000', '#ffffff', '#222222', '#555555',
        '#888888', '#bbbbbb',
        '#ff0000', '#ff8800', '#ffcc00', '#ffff00',
        '#00cc00', '#0088ff', '#0000cc', '#8800cc',
        '#ff44aa', '#884400', '#ff6644', '#44ffaa',
        '#88ccff', '#222266'
    ];

    // ---------------------------------------------------------------
    // Editor state
    // ---------------------------------------------------------------

    var currentSprite = SPRITES[0];
    var currentFrame = 0;
    var currentTool = 'pencil';
    var currentColor = '#222222';
    var showGrid = true;
    var pixelSize = 24; // size of each pixel on screen

    // Pixel data: 2D array [row][col] of color strings or null (transparent)
    var pixels = [];
    // Per-frame storage: frameData[spriteName][frameIndex] = pixels[][]
    var frameData = {};

    // Undo/redo stacks
    var undoStack = [];
    var redoStack = [];
    var MAX_UNDO = 30;

    // Drawing state
    var isDrawing = false;

    // Animation preview
    var animTimer = null;
    var animFrame = 0;

    // DOM elements
    var canvas, ctx;
    var preview1x, preview1xCtx;
    var preview4x, preview4xCtx;
    var animPreview, animPreviewCtx;

    // ---------------------------------------------------------------
    // Initialization
    // ---------------------------------------------------------------

    function init() {
        canvas = document.getElementById('editor-canvas');
        ctx = canvas.getContext('2d');
        preview1x = document.getElementById('preview-1x');
        preview1xCtx = preview1x.getContext('2d');
        preview4x = document.getElementById('preview-4x');
        preview4xCtx = preview4x.getContext('2d');
        animPreview = document.getElementById('anim-preview');
        animPreviewCtx = animPreview.getContext('2d');

        buildSidebar();
        buildToolbar();
        buildPalette();
        bindEvents();
        initTokenUI();
        selectSprite(SPRITES[0], 0);
    }

    // ---------------------------------------------------------------
    // Sidebar: sprite picker
    // ---------------------------------------------------------------

    function buildSidebar() {
        var sidebar = document.getElementById('sidebar');
        var categories = ['Player', 'Enemy', 'Items', 'Tiles', 'Screens'];
        var html = '';

        for (var ci = 0; ci < categories.length; ci++) {
            var cat = categories[ci];
            html += '<h2>' + cat + '</h2>';
            for (var si = 0; si < SPRITES.length; si++) {
                var sp = SPRITES[si];
                if (sp.category !== cat) continue;
                html += '<button class="sprite-btn" data-index="' + si + '">';
                html += '<canvas id="thumb-' + sp.name + '" width="' + (sp.w * 2) + '" height="' + (sp.h * 2) + '"></canvas>';
                html += '<div class="info"><div class="name">' + sp.label + '</div>';
                html += '<div class="dims">' + sp.w + 'x' + sp.h;
                if (sp.frames > 1) html += ' (' + sp.frames + ' frames)';
                html += '</div></div></button>';
            }
        }
        sidebar.innerHTML = html;

        // Render reference thumbnails from programmatic sprites
        for (var i = 0; i < SPRITES.length; i++) {
            var sp = SPRITES[i];
            var thumb = document.getElementById('thumb-' + sp.name);
            if (thumb) {
                var tctx = thumb.getContext('2d');
                tctx.imageSmoothingEnabled = false;
                var src = Game.Sprites.get(sp.name, 0);
                tctx.drawImage(src, 0, 0, sp.w * 2, sp.h * 2);
            }
        }

        // Click handlers
        var btns = sidebar.querySelectorAll('.sprite-btn');
        for (var b = 0; b < btns.length; b++) {
            btns[b].addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-index'));
                selectSprite(SPRITES[idx], 0);
            });
        }
    }

    function updateSidebarActive() {
        var btns = document.querySelectorAll('.sprite-btn');
        for (var i = 0; i < btns.length; i++) {
            var idx = parseInt(btns[i].getAttribute('data-index'));
            btns[i].classList.toggle('active', SPRITES[idx] === currentSprite);
        }
    }

    // ---------------------------------------------------------------
    // Frame tabs (for multi-frame sprites)
    // ---------------------------------------------------------------

    function buildFrameTabs() {
        var wrap = document.getElementById('frame-tabs');
        if (currentSprite.frames <= 1) {
            wrap.style.display = 'none';
            document.getElementById('btn-download-all').style.display = 'none';
            document.getElementById('btn-save-all').style.display = 'none';
            return;
        }
        wrap.style.display = 'flex';
        document.getElementById('btn-download-all').style.display = 'block';
        document.getElementById('btn-save-all').style.display = 'block';

        var html = '';
        for (var f = 0; f < currentSprite.frames; f++) {
            html += '<button class="frame-tab' + (f === currentFrame ? ' active' : '') + '" data-frame="' + f + '">Frame ' + f + '</button>';
        }
        wrap.innerHTML = html;

        var tabs = wrap.querySelectorAll('.frame-tab');
        for (var t = 0; t < tabs.length; t++) {
            tabs[t].addEventListener('click', function () {
                saveCurrentFrame();
                currentFrame = parseInt(this.getAttribute('data-frame'));
                loadCurrentFrame();
                buildFrameTabs();
                redrawCanvas();
                updatePreviews();
            });
        }
    }

    // ---------------------------------------------------------------
    // Sprite selection & pixel data management
    // ---------------------------------------------------------------

    function selectSprite(sprite, frame) {
        saveCurrentFrame();
        currentSprite = sprite;
        currentFrame = frame || 0;
        loadCurrentFrame();
        resizeCanvas();
        buildFrameTabs();
        updateSidebarActive();
        updateFilenameDisplay();
        redrawCanvas();
        updatePreviews();
        startAnimPreview();
        undoStack = [];
        redoStack = [];
    }

    function makeEmptyPixels(w, h) {
        var p = [];
        for (var r = 0; r < h; r++) {
            p[r] = [];
            for (var c = 0; c < w; c++) {
                p[r][c] = null;
            }
        }
        return p;
    }

    function clonePixels(px) {
        var p = [];
        for (var r = 0; r < px.length; r++) {
            p[r] = px[r].slice();
        }
        return p;
    }

    function saveCurrentFrame() {
        if (!currentSprite) return;
        var key = currentSprite.name;
        if (!frameData[key]) frameData[key] = {};
        frameData[key][currentFrame] = clonePixels(pixels);
    }

    function loadCurrentFrame() {
        var key = currentSprite.name;
        if (frameData[key] && frameData[key][currentFrame]) {
            pixels = clonePixels(frameData[key][currentFrame]);
        } else {
            // Load from programmatic sprite as starting point
            pixels = loadFromProgrammatic(currentSprite.name, currentFrame);
        }
    }

    function loadFromProgrammatic(name, frame) {
        var src = Game.Sprites.get(name, frame);
        var w = currentSprite.w;
        var h = currentSprite.h;
        var tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = w;
        tmpCanvas.height = h;
        var tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.drawImage(src, 0, 0);
        var imgData = tmpCtx.getImageData(0, 0, w, h);
        var px = [];
        for (var r = 0; r < h; r++) {
            px[r] = [];
            for (var c = 0; c < w; c++) {
                var i = (r * w + c) * 4;
                var a = imgData.data[i + 3];
                if (a < 128) {
                    px[r][c] = null;
                } else {
                    var red = imgData.data[i];
                    var green = imgData.data[i + 1];
                    var blue = imgData.data[i + 2];
                    px[r][c] = '#' + hex(red) + hex(green) + hex(blue);
                }
            }
        }
        return px;
    }

    function hex(n) {
        var s = n.toString(16);
        return s.length < 2 ? '0' + s : s;
    }

    // ---------------------------------------------------------------
    // Canvas sizing & rendering
    // ---------------------------------------------------------------

    function resizeCanvas() {
        var mainEl = document.querySelector('.main');
        var availW = mainEl.clientWidth - 32;
        var availH = mainEl.clientHeight - 160;
        var maxPixW = Math.floor(availW / currentSprite.w);
        var maxPixH = Math.floor(availH / currentSprite.h);
        pixelSize = Math.min(maxPixW, maxPixH, 32);
        pixelSize = Math.max(pixelSize, 12);

        canvas.width = currentSprite.w * pixelSize;
        canvas.height = currentSprite.h * pixelSize;
    }

    function redrawCanvas() {
        var w = currentSprite.w;
        var h = currentSprite.h;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw checkerboard background for transparency
        for (var r = 0; r < h; r++) {
            for (var c = 0; c < w; c++) {
                var x = c * pixelSize;
                var y = r * pixelSize;
                // Checkerboard
                ctx.fillStyle = (r + c) % 2 === 0 ? '#444' : '#555';
                ctx.fillRect(x, y, pixelSize, pixelSize);
                // Pixel color
                if (pixels[r] && pixels[r][c]) {
                    ctx.fillStyle = pixels[r][c];
                    ctx.fillRect(x, y, pixelSize, pixelSize);
                }
            }
        }

        // Grid lines
        if (showGrid && pixelSize > 4) {
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            for (var gx = 0; gx <= w; gx++) {
                ctx.beginPath();
                ctx.moveTo(gx * pixelSize + 0.5, 0);
                ctx.lineTo(gx * pixelSize + 0.5, h * pixelSize);
                ctx.stroke();
            }
            for (var gy = 0; gy <= h; gy++) {
                ctx.beginPath();
                ctx.moveTo(0, gy * pixelSize + 0.5);
                ctx.lineTo(w * pixelSize, gy * pixelSize + 0.5);
                ctx.stroke();
            }
        }
    }

    // ---------------------------------------------------------------
    // Preview rendering
    // ---------------------------------------------------------------

    function updatePreviews() {
        var w = currentSprite.w;
        var h = currentSprite.h;

        // 1x preview
        preview1x.width = w;
        preview1x.height = h;
        preview1xCtx.clearRect(0, 0, w, h);
        drawPixelsToCtx(preview1xCtx, pixels, w, h, 1);

        // 4x preview
        preview4x.width = w * 4;
        preview4x.height = h * 4;
        preview4xCtx.imageSmoothingEnabled = false;
        preview4xCtx.clearRect(0, 0, w * 4, h * 4);
        drawPixelsToCtx(preview4xCtx, pixels, w, h, 4);
    }

    function drawPixelsToCtx(tctx, px, w, h, scale) {
        for (var r = 0; r < h; r++) {
            for (var c = 0; c < w; c++) {
                if (px[r] && px[r][c]) {
                    tctx.fillStyle = px[r][c];
                    tctx.fillRect(c * scale, r * scale, scale, scale);
                }
            }
        }
    }

    function startAnimPreview() {
        if (animTimer) clearInterval(animTimer);
        var wrap = document.getElementById('anim-preview-wrap');
        if (currentSprite.frames <= 1) {
            wrap.style.display = 'none';
            return;
        }
        wrap.style.display = 'block';
        animFrame = 0;
        var w = currentSprite.w;
        var h = currentSprite.h;
        animPreview.width = w * 4;
        animPreview.height = h * 4;
        animPreviewCtx.imageSmoothingEnabled = false;

        animTimer = setInterval(function () {
            animFrame = (animFrame + 1) % currentSprite.frames;
            animPreviewCtx.clearRect(0, 0, w * 4, h * 4);
            var key = currentSprite.name;
            var px;
            if (animFrame === currentFrame) {
                px = pixels;
            } else if (frameData[key] && frameData[key][animFrame]) {
                px = frameData[key][animFrame];
            } else {
                px = loadFromProgrammatic(currentSprite.name, animFrame);
            }
            drawPixelsToCtx(animPreviewCtx, px, w, h, 4);
        }, 200);
    }

    // ---------------------------------------------------------------
    // Toolbar
    // ---------------------------------------------------------------

    function buildToolbar() {
        var tools = [
            { id: 'pencil', icon: '&#9998;', label: 'Draw' },
            { id: 'eraser', icon: '&#9744;', label: 'Erase' },
            { id: 'fill',   icon: '&#9727;', label: 'Fill' },
            { id: 'picker', icon: '&#128065;', label: 'Pick' },
            { id: 'undo',   icon: '&#8617;', label: 'Undo' },
            { id: 'redo',   icon: '&#8618;', label: 'Redo' },
            { id: 'mirror', icon: '&#8646;', label: 'Mirror' },
            { id: 'clear',  icon: '&#10060;', label: 'Clear' }
        ];

        var toolbar = document.getElementById('toolbar');
        var html = '';
        for (var i = 0; i < tools.length; i++) {
            var t = tools[i];
            var cls = (t.id === currentTool) ? ' active' : '';
            html += '<button class="tool-btn' + cls + '" data-tool="' + t.id + '">';
            html += '<span class="icon">' + t.icon + '</span>';
            html += '<span>' + t.label + '</span></button>';
        }
        toolbar.innerHTML = html;

        var btns = toolbar.querySelectorAll('.tool-btn');
        for (var b = 0; b < btns.length; b++) {
            btns[b].addEventListener('click', function () {
                var tool = this.getAttribute('data-tool');
                handleToolClick(tool);
            });
        }
    }

    function handleToolClick(tool) {
        if (tool === 'undo') { undo(); return; }
        if (tool === 'redo') { redo(); return; }
        if (tool === 'clear') { clearCanvas(); return; }
        if (tool === 'mirror') { mirrorCanvas(); return; }
        currentTool = tool;
        updateToolbarActive();
    }

    function updateToolbarActive() {
        var btns = document.querySelectorAll('.tool-btn');
        for (var i = 0; i < btns.length; i++) {
            var t = btns[i].getAttribute('data-tool');
            btns[i].classList.toggle('active', t === currentTool);
        }
    }

    // ---------------------------------------------------------------
    // Color palette
    // ---------------------------------------------------------------

    function buildPalette() {
        var paletteEl = document.getElementById('palette');
        var html = '';
        for (var i = 0; i < PALETTE.length; i++) {
            var color = PALETTE[i];
            var cls = 'color-swatch';
            if (color === null) cls += ' transparent';
            if (color === currentColor || (color === null && currentColor === null)) cls += ' active';
            var style = color ? 'background:' + color : '';
            html += '<div class="' + cls + '" data-color="' + (color || '') + '" style="' + style + '"></div>';
        }
        paletteEl.innerHTML = html;

        var swatches = paletteEl.querySelectorAll('.color-swatch');
        for (var s = 0; s < swatches.length; s++) {
            swatches[s].addEventListener('click', function () {
                var c = this.getAttribute('data-color');
                currentColor = c === '' ? null : c;
                updatePaletteActive();
                updateCurrentColorDisplay();
            });
        }

        updateCurrentColorDisplay();

        // Hex input
        var hexInput = document.getElementById('color-hex');
        hexInput.addEventListener('change', function () {
            var val = this.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                currentColor = val;
                updatePaletteActive();
                updateCurrentColorDisplay();
            }
        });
    }

    function updatePaletteActive() {
        var swatches = document.querySelectorAll('.color-swatch');
        for (var i = 0; i < swatches.length; i++) {
            var c = swatches[i].getAttribute('data-color');
            var match = (c === '' && currentColor === null) || c === currentColor;
            swatches[i].classList.toggle('active', match);
        }
    }

    function updateCurrentColorDisplay() {
        var swatch = document.getElementById('current-color-swatch');
        var hexInput = document.getElementById('color-hex');
        if (currentColor) {
            swatch.style.background = currentColor;
            hexInput.value = currentColor;
        } else {
            swatch.style.background = 'repeating-conic-gradient(#666 0% 25%, #999 0% 50%) 50%/8px 8px';
            hexInput.value = '';
        }
    }

    // ---------------------------------------------------------------
    // Drawing (touch + mouse)
    // ---------------------------------------------------------------

    function getPixelCoords(e) {
        var rect = canvas.getBoundingClientRect();
        var clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        var col = Math.floor((clientX - rect.left) / pixelSize);
        var row = Math.floor((clientY - rect.top) / pixelSize);
        return { col: col, row: row };
    }

    function isInBounds(col, row) {
        return col >= 0 && col < currentSprite.w && row >= 0 && row < currentSprite.h;
    }

    function applyTool(col, row) {
        if (!isInBounds(col, row)) return;

        if (currentTool === 'pencil') {
            pixels[row][col] = currentColor;
        } else if (currentTool === 'eraser') {
            pixels[row][col] = null;
        } else if (currentTool === 'fill') {
            floodFill(col, row, currentColor);
        } else if (currentTool === 'picker') {
            currentColor = pixels[row][col];
            updatePaletteActive();
            updateCurrentColorDisplay();
            currentTool = 'pencil';
            updateToolbarActive();
        }

        redrawCanvas();
        updatePreviews();
    }

    function floodFill(startCol, startRow, fillColor) {
        var target = pixels[startRow][startCol];
        if (target === fillColor) return;

        var stack = [[startCol, startRow]];
        var w = currentSprite.w;
        var h = currentSprite.h;

        while (stack.length > 0) {
            var pos = stack.pop();
            var c = pos[0], r = pos[1];
            if (c < 0 || c >= w || r < 0 || r >= h) continue;
            if (pixels[r][c] !== target) continue;
            pixels[r][c] = fillColor;
            stack.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
        }
    }

    function startDraw(e) {
        e.preventDefault();
        pushUndo();
        isDrawing = true;
        var p = getPixelCoords(e);
        applyTool(p.col, p.row);
    }

    function moveDraw(e) {
        e.preventDefault();
        if (!isDrawing) return;
        if (currentTool === 'fill' || currentTool === 'picker') return;
        var p = getPixelCoords(e);
        applyTool(p.col, p.row);
    }

    function endDraw(e) {
        e.preventDefault();
        isDrawing = false;
    }

    // ---------------------------------------------------------------
    // Undo / Redo
    // ---------------------------------------------------------------

    function pushUndo() {
        undoStack.push(clonePixels(pixels));
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack = [];
    }

    function undo() {
        if (undoStack.length === 0) return;
        redoStack.push(clonePixels(pixels));
        pixels = undoStack.pop();
        redrawCanvas();
        updatePreviews();
    }

    function redo() {
        if (redoStack.length === 0) return;
        undoStack.push(clonePixels(pixels));
        pixels = redoStack.pop();
        redrawCanvas();
        updatePreviews();
    }

    // ---------------------------------------------------------------
    // Clear & Mirror
    // ---------------------------------------------------------------

    function clearCanvas() {
        if (!confirm('Clear the canvas?')) return;
        pushUndo();
        pixels = makeEmptyPixels(currentSprite.w, currentSprite.h);
        redrawCanvas();
        updatePreviews();
    }

    function mirrorCanvas() {
        pushUndo();
        var w = currentSprite.w;
        var h = currentSprite.h;
        var mirrored = makeEmptyPixels(w, h);
        for (var r = 0; r < h; r++) {
            for (var c = 0; c < w; c++) {
                mirrored[r][w - 1 - c] = pixels[r][c];
            }
        }
        pixels = mirrored;
        redrawCanvas();
        updatePreviews();
    }

    // ---------------------------------------------------------------
    // Export / Import
    // ---------------------------------------------------------------

    function getFilename(spriteName, frame, numFrames) {
        if (numFrames > 1) {
            return spriteName + '_' + frame + '.png';
        }
        return spriteName + '.png';
    }

    function updateFilenameDisplay() {
        var el = document.getElementById('filename-display');
        el.textContent = getFilename(currentSprite.name, currentFrame, currentSprite.frames);
    }

    function pixelsToCanvas(px, w, h) {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        var tctx = c.getContext('2d');
        for (var r = 0; r < h; r++) {
            for (var col = 0; col < w; col++) {
                if (px[r] && px[r][col]) {
                    tctx.fillStyle = px[r][col];
                    tctx.fillRect(col, r, 1, 1);
                }
            }
        }
        return c;
    }

    function downloadPNG() {
        saveCurrentFrame();
        var c = pixelsToCanvas(pixels, currentSprite.w, currentSprite.h);
        var filename = getFilename(currentSprite.name, currentFrame, currentSprite.frames);
        triggerDownload(c, filename);
    }

    function downloadAllFrames() {
        saveCurrentFrame();
        var key = currentSprite.name;
        for (var f = 0; f < currentSprite.frames; f++) {
            var px;
            if (frameData[key] && frameData[key][f]) {
                px = frameData[key][f];
            } else {
                px = loadFromProgrammatic(currentSprite.name, f);
            }
            var c = pixelsToCanvas(px, currentSprite.w, currentSprite.h);
            var filename = getFilename(currentSprite.name, f, currentSprite.frames);
            // Stagger downloads to avoid browser blocking
            (function (canvas, fname, delay) {
                setTimeout(function () { triggerDownload(canvas, fname); }, delay);
            })(c, filename, f * 200);
        }
    }

    function triggerDownload(canvasEl, filename) {
        var link = document.createElement('a');
        link.download = filename;
        link.href = canvasEl.toDataURL('image/png');
        link.click();
    }

    // ---------------------------------------------------------------
    // ZIP builder — minimal implementation for PNG files
    // ---------------------------------------------------------------

    /** CRC32 lookup table, built once. */
    var crcTable = (function () {
        var table = new Uint32Array(256);
        for (var n = 0; n < 256; n++) {
            var c = n;
            for (var k = 0; k < 8; k++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[n] = c;
        }
        return table;
    })();

    function crc32(buf) {
        var crc = 0xFFFFFFFF;
        for (var i = 0; i < buf.length; i++) {
            crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function writeU16(arr, offset, val) {
        arr[offset] = val & 0xFF;
        arr[offset + 1] = (val >> 8) & 0xFF;
    }

    function writeU32(arr, offset, val) {
        arr[offset] = val & 0xFF;
        arr[offset + 1] = (val >> 8) & 0xFF;
        arr[offset + 2] = (val >> 16) & 0xFF;
        arr[offset + 3] = (val >> 24) & 0xFF;
    }

    /**
     * Build a ZIP file from an array of {path: string, data: Uint8Array} entries.
     * Uses STORE (no compression) — fine for small PNGs.
     */
    function buildZip(files) {
        // Calculate total size
        var localSize = 0;
        var centralSize = 0;
        for (var i = 0; i < files.length; i++) {
            var nameBytes = new TextEncoder().encode(files[i].path);
            localSize += 30 + nameBytes.length + files[i].data.length;
            centralSize += 46 + nameBytes.length;
        }
        var totalSize = localSize + centralSize + 22;
        var zip = new Uint8Array(totalSize);
        var offset = 0;
        var centralEntries = [];

        // Write local file headers + data
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            var nameBytes = new TextEncoder().encode(f.path);
            var crc = crc32(f.data);
            var headerOffset = offset;

            // Local file header (signature 0x04034b50)
            writeU32(zip, offset, 0x04034b50); offset += 4;
            writeU16(zip, offset, 20); offset += 2;   // version needed
            writeU16(zip, offset, 0); offset += 2;    // flags
            writeU16(zip, offset, 0); offset += 2;    // compression: STORE
            writeU16(zip, offset, 0); offset += 2;    // mod time
            writeU16(zip, offset, 0); offset += 2;    // mod date
            writeU32(zip, offset, crc); offset += 4;
            writeU32(zip, offset, f.data.length); offset += 4; // compressed size
            writeU32(zip, offset, f.data.length); offset += 4; // uncompressed size
            writeU16(zip, offset, nameBytes.length); offset += 2;
            writeU16(zip, offset, 0); offset += 2;    // extra field length

            zip.set(nameBytes, offset); offset += nameBytes.length;
            zip.set(f.data, offset); offset += f.data.length;

            centralEntries.push({ nameBytes: nameBytes, crc: crc, size: f.data.length, headerOffset: headerOffset });
        }

        // Write central directory
        var centralStart = offset;
        for (var i = 0; i < centralEntries.length; i++) {
            var e = centralEntries[i];
            writeU32(zip, offset, 0x02014b50); offset += 4; // central dir signature
            writeU16(zip, offset, 20); offset += 2;  // version made by
            writeU16(zip, offset, 20); offset += 2;  // version needed
            writeU16(zip, offset, 0); offset += 2;   // flags
            writeU16(zip, offset, 0); offset += 2;   // compression
            writeU16(zip, offset, 0); offset += 2;   // mod time
            writeU16(zip, offset, 0); offset += 2;   // mod date
            writeU32(zip, offset, e.crc); offset += 4;
            writeU32(zip, offset, e.size); offset += 4;
            writeU32(zip, offset, e.size); offset += 4;
            writeU16(zip, offset, e.nameBytes.length); offset += 2;
            writeU16(zip, offset, 0); offset += 2;   // extra length
            writeU16(zip, offset, 0); offset += 2;   // comment length
            writeU16(zip, offset, 0); offset += 2;   // disk number
            writeU16(zip, offset, 0); offset += 2;   // internal attrs
            writeU32(zip, offset, 0); offset += 4;   // external attrs
            writeU32(zip, offset, e.headerOffset); offset += 4;
            zip.set(e.nameBytes, offset); offset += e.nameBytes.length;
        }

        // End of central directory
        var centralEnd = offset;
        writeU32(zip, offset, 0x06054b50); offset += 4;
        writeU16(zip, offset, 0); offset += 2;   // disk number
        writeU16(zip, offset, 0); offset += 2;   // central dir disk
        writeU16(zip, offset, files.length); offset += 2;
        writeU16(zip, offset, files.length); offset += 2;
        writeU32(zip, offset, centralEnd - centralStart); offset += 4;
        writeU32(zip, offset, centralStart); offset += 4;
        writeU16(zip, offset, 0); offset += 2;   // comment length

        return zip.slice(0, offset);
    }

    /** Convert a canvas to a Uint8Array of PNG bytes. */
    function canvasToPNGBytes(canvasEl) {
        var dataUrl = canvasEl.toDataURL('image/png');
        var base64 = dataUrl.split(',')[1];
        var binaryStr = atob(base64);
        var bytes = new Uint8Array(binaryStr.length);
        for (var i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes;
    }

    /** Download a ZIP of all sprites with tiles/ directory structure. */
    function downloadAllTilesZip() {
        saveCurrentFrame();
        var files = [];

        for (var si = 0; si < SPRITES.length; si++) {
            var sp = SPRITES[si];
            for (var f = 0; f < sp.frames; f++) {
                var px;
                var key = sp.name;
                if (frameData[key] && frameData[key][f]) {
                    px = frameData[key][f];
                } else {
                    px = loadFromProgrammatic(sp.name, f);
                }
                var c = pixelsToCanvas(px, sp.w, sp.h);
                var filename = getFilename(sp.name, f, sp.frames);
                files.push({
                    path: 'tiles/' + filename,
                    data: canvasToPNGBytes(c)
                });
            }
        }

        var zipData = buildZip(files);
        var blob = new Blob([zipData], { type: 'application/zip' });
        var link = document.createElement('a');
        link.download = 'roundpaws-tiles.zip';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    }

    function importPNG() {
        document.getElementById('file-input').click();
    }

    function handleFileImport(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
            var img = new Image();
            img.onload = function () {
                pushUndo();
                var w = currentSprite.w;
                var h = currentSprite.h;
                var tmpCanvas = document.createElement('canvas');
                tmpCanvas.width = w;
                tmpCanvas.height = h;
                var tmpCtx = tmpCanvas.getContext('2d');
                tmpCtx.drawImage(img, 0, 0, w, h);
                var imgData = tmpCtx.getImageData(0, 0, w, h);
                for (var r = 0; r < h; r++) {
                    for (var c = 0; c < w; c++) {
                        var i = (r * w + c) * 4;
                        if (imgData.data[i + 3] < 128) {
                            pixels[r][c] = null;
                        } else {
                            pixels[r][c] = '#' + hex(imgData.data[i]) + hex(imgData.data[i + 1]) + hex(imgData.data[i + 2]);
                        }
                    }
                }
                redrawCanvas();
                updatePreviews();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    // ---------------------------------------------------------------
    // Save to tiles/ — local server or GitHub API
    // ---------------------------------------------------------------

    function isLocalhost() {
        var h = location.hostname;
        return h === 'localhost' || h === '127.0.0.1';
    }

    /** Save a single PNG to tiles/ via the local dev server. */
    function saveLocal(filename, base64, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/save-tile');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function () {
            if (xhr.status === 200) {
                callback(null);
            } else {
                var msg = 'HTTP ' + xhr.status;
                try { msg = JSON.parse(xhr.responseText).error; } catch (e) {}
                callback(msg);
            }
        };
        xhr.onerror = function () { callback('Network error — is server.js running?'); };
        xhr.send(JSON.stringify({ filename: filename, data: base64 }));
    }

    var GH_OWNER = 'rib3ye';
    var GH_REPO = 'RoundPaws';
    var GH_BRANCH = 'main';

    function getToken() {
        return localStorage.getItem('roundpaws_gh_token') || '';
    }

    function saveToken() {
        var input = document.getElementById('gh-token');
        var token = input.value.trim();
        if (!token) {
            showTokenStatus('No token entered', '#ff4444');
            return;
        }
        localStorage.setItem('roundpaws_gh_token', token);
        input.value = '';
        showTokenStatus('Token saved!', '#44ff44');
    }

    function showTokenStatus(msg, color) {
        var el = document.getElementById('token-status');
        el.textContent = msg;
        el.style.color = color;
    }

    function showSaveStatus(msg, color) {
        var el = document.getElementById('save-status');
        el.textContent = msg;
        el.style.color = color;
    }

    function initTokenUI() {
        var ghSetup = document.getElementById('gh-setup');
        if (isLocalhost()) {
            // No token needed on localhost — hide GitHub setup, show local mode indicator
            ghSetup.style.display = 'none';
            showSaveStatus('Local mode — saves to tiles/ directly', '#88ccff');
            return;
        }
        var token = getToken();
        if (token) {
            showTokenStatus('Token configured', '#888');
        }
        document.getElementById('btn-save-token').addEventListener('click', saveToken);
    }

    /** Convert canvas to base64 PNG data (without the data:image/png;base64, prefix). */
    function canvasToBase64(canvasEl) {
        var dataUrl = canvasEl.toDataURL('image/png');
        return dataUrl.split(',')[1];
    }

    /** Get the current SHA of a file in the repo (needed for updates). Returns null if file doesn't exist. */
    function getFileSha(path, token, callback) {
        var url = 'https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + path + '?ref=' + GH_BRANCH;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
        xhr.onload = function () {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                callback(null, data.sha);
            } else if (xhr.status === 404) {
                callback(null, null); // file doesn't exist yet
            } else {
                callback('HTTP ' + xhr.status);
            }
        };
        xhr.onerror = function () { callback('Network error'); };
        xhr.send();
    }

    /** Commit a single PNG file to tiles/ in the repo. */
    function commitFile(path, base64Content, message, token, callback) {
        getFileSha(path, token, function (err, sha) {
            if (err) { callback(err); return; }

            var url = 'https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/contents/' + path;
            var body = {
                message: message,
                content: base64Content,
                branch: GH_BRANCH
            };
            if (sha) body.sha = sha; // update existing file

            var xhr = new XMLHttpRequest();
            xhr.open('PUT', url);
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onload = function () {
                if (xhr.status === 200 || xhr.status === 201) {
                    callback(null);
                } else {
                    var msg = 'HTTP ' + xhr.status;
                    try { msg = JSON.parse(xhr.responseText).message; } catch (e) {}
                    callback(msg);
                }
            };
            xhr.onerror = function () { callback('Network error'); };
            xhr.send(JSON.stringify(body));
        });
    }

    /** Save current frame's PNG to tiles/. Uses local server on localhost, GitHub API otherwise. */
    function saveToGame() {
        saveCurrentFrame();
        var c = pixelsToCanvas(pixels, currentSprite.w, currentSprite.h);
        var filename = getFilename(currentSprite.name, currentFrame, currentSprite.frames);
        var base64 = canvasToBase64(c);

        showSaveStatus('Saving...', '#ffcc00');

        if (isLocalhost()) {
            saveLocal(filename, base64, function (err) {
                if (err) {
                    showSaveStatus('Error: ' + err, '#ff4444');
                } else {
                    showSaveStatus('Saved to tiles/' + filename + '!', '#44ff44');
                }
            });
        } else {
            var token = getToken();
            if (!token) {
                showSaveStatus('Set up GitHub token first', '#ff4444');
                return;
            }
            var path = 'tiles/' + filename;
            commitFile(path, base64, 'Update ' + filename + ' from pixel editor', token, function (err) {
                if (err) {
                    showSaveStatus('Error: ' + err, '#ff4444');
                } else {
                    showSaveStatus('Saved! Refresh game to see changes.', '#44ff44');
                }
            });
        }
    }

    /** Save all frames to tiles/. Uses local server on localhost, GitHub API otherwise. */
    function saveAllFrames() {
        saveCurrentFrame();
        var key = currentSprite.name;
        var total = currentSprite.frames;
        var done = 0;
        var errors = [];

        showSaveStatus('Saving ' + total + ' frames...', '#ffcc00');

        if (isLocalhost()) {
            for (var f = 0; f < total; f++) {
                (function (frameIdx) {
                    var px;
                    if (frameData[key] && frameData[key][frameIdx]) {
                        px = frameData[key][frameIdx];
                    } else {
                        px = loadFromProgrammatic(currentSprite.name, frameIdx);
                    }
                    var c = pixelsToCanvas(px, currentSprite.w, currentSprite.h);
                    var filename = getFilename(currentSprite.name, frameIdx, total);
                    var base64 = canvasToBase64(c);
                    saveLocal(filename, base64, function (err) {
                        done++;
                        if (err) errors.push(filename + ': ' + err);
                        if (done === total) {
                            if (errors.length > 0) {
                                showSaveStatus('Errors: ' + errors.join('; '), '#ff4444');
                            } else {
                                showSaveStatus('All ' + total + ' frames saved!', '#44ff44');
                            }
                        } else {
                            showSaveStatus('Saved ' + done + '/' + total + '...', '#ffcc00');
                        }
                    });
                })(f);
            }
        } else {
            var token = getToken();
            if (!token) {
                showSaveStatus('Set up GitHub token first', '#ff4444');
                return;
            }
            for (var f = 0; f < total; f++) {
                (function (frameIdx) {
                    var px;
                    if (frameData[key] && frameData[key][frameIdx]) {
                        px = frameData[key][frameIdx];
                    } else {
                        px = loadFromProgrammatic(currentSprite.name, frameIdx);
                    }
                    var c = pixelsToCanvas(px, currentSprite.w, currentSprite.h);
                    var filename = getFilename(currentSprite.name, frameIdx, total);
                    var path = 'tiles/' + filename;
                    var base64 = canvasToBase64(c);
                    setTimeout(function () {
                        commitFile(path, base64, 'Update ' + filename + ' from pixel editor', token, function (err) {
                            done++;
                            if (err) errors.push(filename + ': ' + err);
                            if (done === total) {
                                if (errors.length > 0) {
                                    showSaveStatus('Errors: ' + errors.join('; '), '#ff4444');
                                } else {
                                    showSaveStatus('All ' + total + ' frames saved!', '#44ff44');
                                }
                            } else {
                                showSaveStatus('Saved ' + done + '/' + total + '...', '#ffcc00');
                            }
                        });
                    }, frameIdx * 1500);
                })(f);
            }
        }
    }

    // ---------------------------------------------------------------
    // Event binding
    // ---------------------------------------------------------------

    function bindEvents() {
        // Touch events on canvas
        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', moveDraw, { passive: false });
        canvas.addEventListener('touchend', endDraw, { passive: false });
        canvas.addEventListener('touchcancel', endDraw, { passive: false });

        // Mouse events on canvas
        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', moveDraw);
        canvas.addEventListener('mouseup', endDraw);
        canvas.addEventListener('mouseleave', endDraw);

        // Grid toggle
        document.getElementById('grid-toggle').addEventListener('change', function () {
            showGrid = this.checked;
            redrawCanvas();
        });

        // Save to Game buttons
        document.getElementById('btn-save-game').addEventListener('click', saveToGame);
        document.getElementById('btn-save-all').addEventListener('click', saveAllFrames);

        // File export/import buttons
        document.getElementById('btn-download').addEventListener('click', downloadPNG);
        document.getElementById('btn-download-all').addEventListener('click', downloadAllFrames);
        document.getElementById('btn-download-zip').addEventListener('click', downloadAllTilesZip);
        document.getElementById('btn-import').addEventListener('click', importPNG);
        document.getElementById('file-input').addEventListener('change', handleFileImport);

        // Resize handler
        window.addEventListener('resize', function () {
            resizeCanvas();
            redrawCanvas();
        });
    }

    // ---------------------------------------------------------------
    // Start
    // ---------------------------------------------------------------

    window.addEventListener('load', init);
})();
