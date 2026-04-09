/**
 * Input Manager
 *
 * Translates raw keyboard events into game actions.
 * Call update() once per frame before reading input.
 *
 * Controls:
 *   A / D       — Move left / right
 *   L           — Jump / climb up
 *   S           — Climb down
 *   K           — Throw carrot
 *   Enter/Space — Start game
 *   M           — Toggle mute
 *   R           — Hot-reload tile assets
 */
window.Game = window.Game || {};

Game.Input = (function () {
    // Raw key state from browser events (true while held)
    var keys = {};

    // True only on the frame a key was first pressed
    var justPressed = {};

    // Snapshot of last frame's key state (for edge detection)
    var prevKeys = {};

    /** Bind keyboard listeners. Call once at startup. */
    function init() {
        window.addEventListener('keydown', function (e) {
            // Shift+R: hard reload (clear cache and refresh page)
            if (e.code === 'KeyR' && e.shiftKey) {
                location.reload(true);
                return;
            }
            keys[e.code] = true;
            e.preventDefault();
        });
        window.addEventListener('keyup', function (e) {
            keys[e.code] = false;
            e.preventDefault();
        });
    }

    /** Detect rising edges. Call once per frame before any input reads. */
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

    /** Returns true while the action's key is held down. */
    function isDown(action) {
        switch (action) {
            case 'left':   return keys['KeyA'];
            case 'right':  return keys['KeyD'];
            case 'up':     return keys['KeyL'];
            case 'down':   return keys['KeyS'];
            case 'throw':  return keys['KeyK'];
            case 'start':  return keys['Enter'] || keys['Space'];
            case 'mute':   return keys['KeyM'];
            case 'reload': return keys['KeyR'];
            default:       return false;
        }
    }

    /** Returns true only on the first frame the action's key is pressed. */
    function wasPressed(action) {
        switch (action) {
            case 'left':   return justPressed['KeyA'];
            case 'right':  return justPressed['KeyD'];
            case 'up':     return justPressed['KeyL'];
            case 'down':   return justPressed['KeyS'];
            case 'throw':  return justPressed['KeyK'];
            case 'start':  return justPressed['Enter'] || justPressed['Space'];
            case 'mute':     return justPressed['KeyM'];
            case 'reload':   return justPressed['KeyR'];
            case 'volUp':    return justPressed['ArrowUp'];
            case 'volDown':  return justPressed['ArrowDown'];
            default:         return false;
        }
    }

    return {
        init: init,
        update: update,
        isDown: isDown,
        wasPressed: wasPressed
    };
})();
