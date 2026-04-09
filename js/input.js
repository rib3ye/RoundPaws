/**
 * Input Manager
 *
 * Translates raw keyboard and gamepad events into game actions.
 * Call update() once per frame before reading input.
 *
 * Keyboard:
 *   A / D       — Move left / right
 *   L           — Jump / climb up
 *   S           — Climb down
 *   K           — Throw carrot
 *   Enter/Space — Start game
 *   M           — Toggle mute
 *   R           — Hot-reload tile assets
 *
 * Gamepad (Bluetooth / USB):
 *   D-pad or left stick — Move
 *   A / Cross (button 0) — Jump
 *   B / Circle (button 1) — Throw carrot
 *   Start (button 9) — Start game
 */
window.Game = window.Game || {};

Game.Input = (function () {
    // Raw key state from browser events (true while held)
    var keys = {};

    // True only on the frame a key was first pressed
    var justPressed = {};

    // Snapshot of last frame's key state (for edge detection)
    var prevKeys = {};

    // Gamepad state (merged into keys each frame)
    var gpState = {};
    var prevGpState = {};
    var gpJustPressed = {};

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

        // Log gamepad connections
        window.addEventListener('gamepadconnected', function (e) {
            console.log('Gamepad connected: ' + e.gamepad.id);
        });
        window.addEventListener('gamepaddisconnected', function (e) {
            console.log('Gamepad disconnected: ' + e.gamepad.id);
        });
    }

    /** Poll gamepad state. Standard mapping: https://w3c.github.io/gamepad/#remapping */
    function pollGamepad() {
        var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        // Reset gamepad state
        gpState = {};

        for (var i = 0; i < gamepads.length; i++) {
            var gp = gamepads[i];
            if (!gp) continue;

            // Buttons (standard mapping)
            // 0 = A/Cross, 1 = B/Circle, 2 = X/Square, 3 = Y/Triangle
            // 8 = Select/Back, 9 = Start, 12 = D-Up, 13 = D-Down, 14 = D-Left, 15 = D-Right
            if (gp.buttons[0] && gp.buttons[0].pressed) gpState.gpA = true;
            if (gp.buttons[1] && gp.buttons[1].pressed) gpState.gpB = true;
            if (gp.buttons[2] && gp.buttons[2].pressed) gpState.gpX = true;
            if (gp.buttons[3] && gp.buttons[3].pressed) gpState.gpY = true;
            if (gp.buttons[9] && gp.buttons[9].pressed) gpState.gpStart = true;
            if (gp.buttons[8] && gp.buttons[8].pressed) gpState.gpSelect = true;

            // D-pad
            if (gp.buttons[12] && gp.buttons[12].pressed) gpState.gpUp = true;
            if (gp.buttons[13] && gp.buttons[13].pressed) gpState.gpDown = true;
            if (gp.buttons[14] && gp.buttons[14].pressed) gpState.gpLeft = true;
            if (gp.buttons[15] && gp.buttons[15].pressed) gpState.gpRight = true;

            // Left stick (with deadzone)
            var deadzone = 0.3;
            if (gp.axes[0] < -deadzone) gpState.gpLeft = true;
            if (gp.axes[0] > deadzone) gpState.gpRight = true;
            if (gp.axes[1] < -deadzone) gpState.gpUp = true;
            if (gp.axes[1] > deadzone) gpState.gpDown = true;
        }

        // Edge detection for gamepad
        for (var code in gpState) {
            gpJustPressed[code] = gpState[code] && !prevGpState[code];
        }
        for (var code in prevGpState) {
            if (!gpState[code]) gpJustPressed[code] = false;
        }
        for (var code in gpState) {
            prevGpState[code] = gpState[code];
        }
        // Clear buttons that were released
        for (var code in prevGpState) {
            if (!gpState[code]) prevGpState[code] = false;
        }
    }

    /** Detect rising edges. Call once per frame before any input reads. */
    function update() {
        // Keyboard edge detection
        for (var code in keys) {
            justPressed[code] = keys[code] && !prevKeys[code];
        }
        for (var code in prevKeys) {
            if (!keys[code]) justPressed[code] = false;
        }
        for (var code in keys) {
            prevKeys[code] = keys[code];
        }

        // Poll gamepad
        pollGamepad();
    }

    /** Returns true while the action's key is held down. */
    function isDown(action) {
        switch (action) {
            case 'left':   return keys['KeyA'] || gpState.gpLeft;
            case 'right':  return keys['KeyD'] || gpState.gpRight;
            case 'up':     return keys['KeyL'] || gpState.gpA || gpState.gpUp;
            case 'down':   return keys['KeyS'] || gpState.gpDown;
            case 'throw':  return keys['KeyK'] || gpState.gpB || gpState.gpX;
            case 'start':  return keys['Enter'] || keys['Space'] || gpState.gpStart || gpState.gpA;
            case 'mute':   return keys['KeyM'];
            case 'reload': return keys['KeyR'];
            default:       return false;
        }
    }

    /** Returns true only on the first frame the action's key is pressed. */
    function wasPressed(action) {
        switch (action) {
            case 'left':   return justPressed['KeyA'] || gpJustPressed.gpLeft;
            case 'right':  return justPressed['KeyD'] || gpJustPressed.gpRight;
            case 'up':     return justPressed['KeyL'] || gpJustPressed.gpA || gpJustPressed.gpUp;
            case 'down':   return justPressed['KeyS'] || gpJustPressed.gpDown;
            case 'throw':  return justPressed['KeyK'] || gpJustPressed.gpB || gpJustPressed.gpX;
            case 'start':  return justPressed['Enter'] || justPressed['Space'] || gpJustPressed.gpStart || gpJustPressed.gpA;
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
