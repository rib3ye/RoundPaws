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
            case 'left':  return keys['KeyA'];
            case 'right': return keys['KeyD'];
            case 'up':    return keys['KeyL'];
            case 'down':  return keys['KeyS'];
            case 'throw': return keys['KeyK'];
            case 'start': return keys['Enter'] || keys['Space'];
            default: return false;
        }
    }

    function wasPressed(action) {
        switch (action) {
            case 'left':  return justPressed['KeyA'];
            case 'right': return justPressed['KeyD'];
            case 'up':    return justPressed['KeyL'];
            case 'down':  return justPressed['KeyS'];
            case 'throw': return justPressed['KeyK'];
            case 'start': return justPressed['Enter'] || justPressed['Space'];
            default: return false;
        }
    }

    return { init: init, update: update, isDown: isDown, wasPressed: wasPressed };
})();
