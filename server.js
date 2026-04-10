/**
 * Local dev server for Round Paws
 *
 * Serves static files over HTTPS and provides an API for the pixel
 * art editor to save PNGs directly to the tiles/ folder.
 * The game auto-reloads sprites by polling /api/tile-version.
 *
 * Usage:  node server.js
 * Then:   https://localhost:3000/editor.html
 *
 * On first run, generates a self-signed certificate (stored in .cert/).
 * Your browser will warn about the cert — click "Advanced" > "Proceed"
 * once and it's remembered for localhost.
 */
var https = require('https');
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var PORT = 3000;
var ROOT = __dirname;
var CERT_DIR = path.join(ROOT, '.cert');
var KEY_PATH = path.join(CERT_DIR, 'localhost.key');
var CERT_PATH = path.join(CERT_DIR, 'localhost.crt');

// Incremented every time a tile changes — game polls this to detect changes
var tileVersion = 0;

var MIME = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.ico': 'image/x-icon'
};

// ---------------------------------------------------------------
// Self-signed certificate generation
// ---------------------------------------------------------------

function ensureCert(callback) {
    if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
        callback();
        return;
    }

    if (!fs.existsSync(CERT_DIR)) {
        fs.mkdirSync(CERT_DIR);
    }

    console.log('Generating self-signed certificate...');

    var cmd = 'openssl req -x509 -newkey rsa:2048 -nodes' +
        ' -keyout ' + KEY_PATH +
        ' -out ' + CERT_PATH +
        ' -days 365' +
        ' -subj "/CN=localhost"' +
        ' -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"';

    childProcess.exec(cmd, function (err) {
        if (err) {
            console.error('Failed to generate certificate:', err.message);
            console.error('Make sure openssl is installed.');
            process.exit(1);
        }
        console.log('Certificate saved to .cert/');
        callback();
    });
}

// ---------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------

function handleRequest(req, res) {
    // API: save a tile PNG
    if (req.method === 'POST' && req.url === '/api/save-tile') {
        var body = [];
        req.on('data', function (chunk) { body.push(chunk); });
        req.on('end', function () {
            try {
                var json = JSON.parse(Buffer.concat(body).toString());
                var filename = path.basename(json.filename); // sanitize
                if (!filename.endsWith('.png')) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Filename must end in .png' }));
                    return;
                }
                var filePath = path.join(ROOT, 'tiles', filename);
                var data = Buffer.from(json.data, 'base64');
                fs.writeFileSync(filePath, data);
                tileVersion++;
                console.log('Saved tiles/' + filename + ' (v' + tileVersion + ')');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, version: tileVersion }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

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

    // API: tile version (polled by game for live reload)
    if (req.method === 'GET' && req.url === '/api/tile-version') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store'
        });
        res.end(JSON.stringify({ version: tileVersion }));
        return;
    }

    // API: list saved tiles
    if (req.method === 'GET' && req.url === '/api/list-tiles') {
        var tilesDir = path.join(ROOT, 'tiles');
        var files = fs.readdirSync(tilesDir).filter(function (f) {
            return f.endsWith('.png');
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(files));
        return;
    }

    // Static file serving
    var urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';
    var filePath = path.join(ROOT, urlPath);

    // Prevent directory traversal
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, function (err, data) {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        var ext = path.extname(filePath);
        res.writeHead(200, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(data);
    });
}

// ---------------------------------------------------------------
// Watch tiles/ for changes (from external edits, not just API)
// ---------------------------------------------------------------

function watchTiles() {
    var tilesDir = path.join(ROOT, 'tiles');
    var debounce = null;

    fs.watch(tilesDir, function (eventType, filename) {
        if (filename && !filename.endsWith('.png')) return;
        clearTimeout(debounce);
        debounce = setTimeout(function () {
            tileVersion++;
            console.log('Tile changed: ' + (filename || '(unknown)') + ' (v' + tileVersion + ')');
        }, 300);
    });
}

// ---------------------------------------------------------------
// Start server
// ---------------------------------------------------------------

ensureCert(function () {
    var options = {
        key: fs.readFileSync(KEY_PATH),
        cert: fs.readFileSync(CERT_PATH)
    };

    var server = https.createServer(options, handleRequest);

    server.listen(PORT, function () {
        console.log('');
        console.log('Round Paws server running at https://localhost:' + PORT);
        console.log('Game:   https://localhost:' + PORT + '/');
        console.log('Editor: https://localhost:' + PORT + '/editor.html');
        console.log('');
        console.log('Tiles auto-reload in the game when changed.');
    });

    watchTiles();
});
