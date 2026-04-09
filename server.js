/**
 * Local dev server for Round Paws
 *
 * Serves static files and provides an API for the pixel art editor
 * to save PNGs directly to the tiles/ folder.
 *
 * Usage:  node server.js
 * Then:   http://localhost:3000/editor.html
 */
var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = 3000;
var ROOT = __dirname;

var MIME = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.ico': 'image/x-icon'
};

var server = http.createServer(function (req, res) {
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
});

server.listen(PORT, function () {
    console.log('Round Paws server running at http://localhost:' + PORT);
    console.log('Game:   http://localhost:' + PORT + '/');
    console.log('Editor: http://localhost:' + PORT + '/editor.html');
});
