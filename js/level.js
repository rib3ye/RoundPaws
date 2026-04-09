window.Game = window.Game || {};

Game.Level = (function () {
    var TILE = 16;
    var SOLID_TILES = { '=': true, '#': true, 'B': true };
    var ENTITY_TILES = { 'P': true, 'C': true, 'K': true, 'F': true };

    function parse(text) {
        var lines = text.split('\n').filter(function (line) {
            return line.length > 0 && !(line[0] === '#' && line[1] === ' ');
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
        xhr.open('GET', url + '?t=' + Date.now());
        xhr.onload = function () {
            if (xhr.responseText) {
                callback(parse(xhr.responseText));
            }
        };
        xhr.onerror = function () {
            console.error('Failed to load level: ' + url);
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
