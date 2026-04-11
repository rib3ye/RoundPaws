/**
 * Ending Screen
 *
 * Plays after beating all levels. Shows a sleeping cat on a wooden deck
 * with floating "Zzz" bubbles and a scrolling story epilogue below.
 *
 * The story text scrolls upward in a clipped region and loops back
 * to the start when it reaches the end.
 */
window.Game = window.Game || {};

Game.Ending = (function () {
    var timer = 0;
    var scrollY = 0;      // current vertical scroll offset for story text
    var catFrame = 0;     // sleeping cat animation frame (0-2)
    var catTimer = 0;

    // ---------------------------------------------------------------
    // Story text (scrolls upward)
    // ---------------------------------------------------------------

    var storyLines = [
        '',
        'After defeating Captain Clawsworth',
        'and his crab crew, Round Paws',
        'claimed the ship as his own.',
        '',
        'He renamed it "The Fuzzy Drifter"',
        'and sailed to the legendary',
        'Tuna Isles.',
        '',
        'There, he discovered a hidden cove',
        'filled with the finest catnip',
        'the seven seas had ever known.',
        '',
        'Word spread quickly, and cats',
        'from every port came to trade',
        'stories and nap in the warm sand.',
        '',
        'Round Paws became known not as a',
        'fearsome pirate, but as the',
        'friendliest captain to ever sail.',
        '',
        'He appointed a seagull named Gerald',
        'as first mate, though Gerald',
        'mostly just screamed at clouds.',
        '',
        'Every evening, Round Paws would sit',
        'on the bow, watching the sunset',
        'paint the waves orange and gold.',
        '',
        'And when the stars came out,',
        'he\'d curl up on his favorite barrel,',
        'purring softly as the ship rocked',
        'gently on the tide.',
        '',
        'Some say if you listen carefully',
        'on a quiet night at sea, you can',
        'still hear that purr, carried on',
        'the wind across the endless ocean.',
        '',
        '',
        'THE END',
        '',
        'Thanks for playing!',
        '',
        'THE ADVENTURE OF ROUND PAWS',
        '',
        '',
        ''
    ];

    var totalTextHeight;

    // ---------------------------------------------------------------
    // Init
    // ---------------------------------------------------------------

    function init() {
        timer = 0;
        scrollY = 0;
        catFrame = 0;
        catTimer = 0;
        totalTextHeight = storyLines.length * 14 + 120;
    }

    // ---------------------------------------------------------------
    // Update
    // ---------------------------------------------------------------

    function update() {
        timer++;
        scrollY += 0.15; // slow upward scroll

        // Loop back to start when all text has scrolled past
        if (scrollY > totalTextHeight) {
            scrollY = -80;
        }

        // Sleeping cat animation (3 frames, slow cycle for "Zzz" bubbles)
        catTimer++;
        if (catTimer > 40) {
            catTimer = 0;
            catFrame = (catFrame + 1) % 3;
        }

        return 'ending';
    }

    // ---------------------------------------------------------------
    // Drawing
    // ---------------------------------------------------------------

    function draw() {
        var R = Game.Renderer;

        // Very dark background
        R.drawRect(0, 0, 448, 224, '#0a0a1a');

        // Dim background stars (deterministic positions based on index)
        for (var i = 0; i < 15; i++) {
            var sx = ((i * 37 + 13) % 448);
            var sy = ((i * 23 + 7) % 80);
            if ((timer + i * 11) % 80 < 60) {
                R.drawRect(sx, sy, 1, 1, '#334');
            }
        }

        // Sleeping cat sprite (centered horizontally)
        R.drawSpriteAbsolute('sleeping_cat', 208, 40, catFrame);

        // Floating "Zzz" sleep bubbles with gentle bob
        var zOffset = Math.sin(timer * 0.05) * 3;
        R.drawText('Z', 250, 38 + zOffset, '#4444aa', 10);
        R.drawText('z', 258, 30 + zOffset, '#333388', 8);
        R.drawText('z', 264, 24 + zOffset, '#222266', 6);

        // Wooden deck separator
        R.drawRect(0, 64, 448, 3, '#BF6530');
        R.drawRect(0, 67, 448, 8, '#8B4513');

        // --- Scrolling story text (clipped to lower region) ---

        var textStartY = 85;
        var textAreaHeight = 139;

        var ctx = R.getCtx();
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, textStartY, 448, textAreaHeight);
        ctx.clip();

        for (var j = 0; j < storyLines.length; j++) {
            var lineY = textStartY + j * 14 - scrollY + 100;

            // Only draw lines that are within the visible clipped area
            if (lineY > textStartY - 14 && lineY < textStartY + textAreaHeight + 14) {
                var color = storyLines[j] === 'THE END' || storyLines[j] === 'THE ADVENTURE OF ROUND PAWS'
                    ? '#ffaa00' : '#8888aa';
                R.drawTextCentered(storyLines[j], lineY, color, 8);
            }
        }

        ctx.restore();
    }

    return {
        init: init,
        update: update,
        draw: draw
    };
})();
