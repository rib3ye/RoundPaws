window.Game = window.Game || {};

Game.Input = (function () {
    var keys = {};
    var justPressed = {};
    var prevKeys = {};

    function init() {
        window.addEventListener('keydown', function (e) {
            keys[e.code] = true;
            e.preventDefault();
        });
        window.addEventListener('keyup', function (e) {
            keys[e.code] = false;
            e.preventDefault();
        });
    }

    function update() {
        for (var code in keys) {
            justPressed[code] = keys[code] && !prevKeys[code];
        }
        for (var code in prevKeys) {
            if (!keys[code]) justPressed[code] = false;
        }
        for (var code in keys) {
            prevKeys[code] = keys[code];
        }
    }

    function isDown(action) {
        switch (action) {
            case 'left':  return keys['ArrowLeft'] || keys['KeyA'];
            case 'right': return keys['ArrowRight'] || keys['KeyD'];
            case 'up':    return keys['ArrowUp'] || keys['KeyW'] || keys['Space'];
            case 'down':  return keys['ArrowDown'] || keys['KeyS'];
            case 'throw': return keys['KeyX'] || keys['KeyZ'];
            case 'start': return keys['Enter'] || keys['Space'];
            default: return false;
        }
    }

    function wasPressed(action) {
        switch (action) {
            case 'left':  return justPressed['ArrowLeft'] || justPressed['KeyA'];
            case 'right': return justPressed['ArrowRight'] || justPressed['KeyD'];
            case 'up':    return justPressed['ArrowUp'] || justPressed['KeyW'] || justPressed['Space'];
            case 'down':  return justPressed['ArrowDown'] || justPressed['KeyS'];
            case 'throw': return justPressed['KeyX'] || justPressed['KeyZ'];
            case 'start': return justPressed['Enter'] || justPressed['Space'];
            default: return false;
        }
    }

    return { init: init, update: update, isDown: isDown, wasPressed: wasPressed };
})();
