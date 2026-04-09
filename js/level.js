/**
 * Level Loader & Tile Queries
 *
 * Parses text-based level files into a level object containing:
 *   - grid[][]      : 2D array of tile characters
 *   - playerStart   : {x, y} spawn position
 *   - enemies[]     : crab spawn positions
 *   - carrots[]     : carrot pickup positions
 *   - barrels[]     : pushable barrel positions
 *   - flag          : level-end flag position
 *
 * Tile legend:
 *   =  Wood plank (solid)
 *   #  Hull wall (solid)
 *   ~  Water (kills player)
 *   -  Thin platform (one-way, stand on top)
 *   R  Rope (climbable)
 *   M  Mast (decorative)
 *   .  Empty space
 *
 * Entity markers (extracted during parse, replaced with '.'):
 *   P  Player start
 *   C  Crab enemy
 *   K  Carrot pickup
 *   F  Flag (level exit)
 *   B  Barrel (pushable)
 */
window.Game = window.Game || {};

Game.Level = (function () {
    var TILE = 16; // pixels per tile

    // Tiles the player and enemies cannot pass through
    var SOLID_TILES = { '=': true, '#': true };

    // Characters that represent entities (removed from the grid during parse)
    var ENTITY_TILES = { 'P': true, 'C': true, 'K': true, 'F': true, 'B': true };

    // ---------------------------------------------------------------
    // Parsing
    // ---------------------------------------------------------------

    /**
     * Parse a level text file into a level object.
     * Lines starting with "# " are treated as comments and skipped.
     */
    function parse(text) {
        var lines = text.split('\n').filter(function (line) {
            return line.length > 0 && !(line[0] === '#' && line[1] === ' ');
        });

        var grid = [];
        var enemies = [];
        var carrots = [];
        var barrels = [];
        var playerStart = { x: 0, y: 0 };
        var flag = { x: 0, y: 0 };

        for (var row = 0; row < lines.length; row++) {
            var gridRow = [];

            for (var col = 0; col < lines[row].length; col++) {
                var ch = lines[row][col];

                // Entity markers are extracted into arrays and replaced with empty space
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
                } else if (ch === 'B') {
                    barrels.push({ x: col, y: row });
                    gridRow.push('.');
                } else {
                    gridRow.push(ch);
                }
            }

            grid.push(gridRow);
        }

        return {
            grid: grid,
            width: grid.length > 0 ? grid[0].length : 0,
            height: grid.length,
            playerStart: playerStart,
            enemies: enemies,
            carrots: carrots,
            barrels: barrels,
            flag: flag
        };
    }

    // ---------------------------------------------------------------
    // Tile queries (used by player, enemies, projectiles, etc.)
    // ---------------------------------------------------------------

    /** Get the tile character at (col, row). Returns '.' for out-of-bounds. */
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

    // ---------------------------------------------------------------
    // Loading
    // ---------------------------------------------------------------

    /** Fetch a level file by URL and parse it. Cache-busted to support live editing. */
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
