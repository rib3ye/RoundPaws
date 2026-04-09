/**
 * Local dev server for Round Paws
 *
 * Serves static files over HTTPS and provides an API for the pixel
 * art editor to save PNGs directly to the tiles/ folder.
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
var crypto = require('crypto');
var childProcess = require('child_process');

var PORT = 3000;
var ROOT = __dirname;
var CERT_DIR = path.join(ROOT, '.cert');
var KEY_PATH = path.join(CERT_DIR, 'localhost.key');
var CERT_PATH = path.join(CERT_DIR, 'localhost.crt');

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

    // Use openssl to generate a self-signed cert for localhost
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
                console.log('Saved tiles/' + filename + ' (' + data.length + ' bytes)');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
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
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
}

// ---------------------------------------------------------------
// WebSocket for live reload (minimal implementation, no deps)
// ---------------------------------------------------------------

var wsClients = [];

function upgradeToWebSocket(req, socket) {
    var key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }

    var accept = crypto.createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-5AB9B1540F35')
        .digest('base64');

    socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        'Sec-WebSocket-Accept: ' + accept + '\r\n' +
        '\r\n'
    );

    wsClients.push(socket);
    socket.on('close', function () {
        wsClients = wsClients.filter(function (s) { return s !== socket; });
    });
    socket.on('error', function () {
        wsClients = wsClients.filter(function (s) { return s !== socket; });
    });
}

/** Send a WebSocket text frame to all connected clients. */
function wsBroadcast(msg) {
    var payload = Buffer.from(msg);
    var frame;
    if (payload.length < 126) {
        frame = Buffer.alloc(2 + payload.length);
        frame[0] = 0x81; // text frame, fin
        frame[1] = payload.length;
        payload.copy(frame, 2);
    } else {
        frame = Buffer.alloc(4 + payload.length);
        frame[0] = 0x81;
        frame[1] = 126;
        frame.writeUInt16BE(payload.length, 2);
        payload.copy(frame, 4);
    }
    for (var i = 0; i < wsClients.length; i++) {
        try { wsClients[i].write(frame); } catch (e) {}
    }
}

// ---------------------------------------------------------------
// Watch tiles/ for changes
// ---------------------------------------------------------------

function watchTiles() {
    var tilesDir = path.join(ROOT, 'tiles');
    var debounce = null;

    fs.watch(tilesDir, function (eventType, filename) {
        if (!filename || !filename.endsWith('.png')) return;
        // Debounce rapid changes (e.g. editor saving multiple frames)
        clearTimeout(debounce);
        debounce = setTimeout(function () {
            console.log('Tile changed: ' + filename + ' — notifying browser');
            wsBroadcast('reload-tiles');
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

    // Handle WebSocket upgrade requests
    server.on('upgrade', function (req, socket, head) {
        if (req.url === '/ws') {
            upgradeToWebSocket(req, socket);
        } else {
            socket.destroy();
        }
    });

    server.listen(PORT, function () {
        console.log('');
        console.log('Round Paws server running at https://localhost:' + PORT);
        console.log('Game:   https://localhost:' + PORT + '/');
        console.log('Editor: https://localhost:' + PORT + '/editor.html');
        console.log('');
        console.log('Watching tiles/ for changes — game auto-reloads sprites.');
        console.log('');
        console.log('First time? Your browser will show a security warning.');
        console.log('Click "Advanced" > "Proceed to localhost" to continue.');
    });

    watchTiles();
});
