# The Adventure of Round Paws — Game Design Spec

## Overview

A 2D side-scrolling platformer built with HTML5 Canvas and vanilla JavaScript. Zero dependencies, runs in any browser by opening `index.html`. 16-bit retro pixel art style with procedural drum and bass music.

Round Paws is a black cat with a white triangle around his mouth. He traverses pirate ship levels, avoiding crabs, collecting carrots to throw at enemies, and reaching the flag at the end of each level.

## Tech Stack

- **Rendering:** HTML5 Canvas 2D
- **Language:** Vanilla JavaScript (ES modules via script tags, no build step)
- **Audio:** Web Audio API (procedural synthesis — no audio files)
- **Levels:** Plain text files parsed at runtime
- **Distribution:** Single folder, open `index.html` in browser

## File Structure

```
roundpaws2/
  index.html              — entry point
  css/
    game.css              — canvas container styling
  js/
    main.js               — game loop, state machine (title/play/ending)
    renderer.js           — canvas drawing, camera, sprite rendering
    player.js             — Round Paws: movement, jumping, throwing
    enemies.js            — crab AI: patrol, collision
    projectile.js         — carrot throwing logic
    level.js              — level loader (parses txt maps), tile collision
    sprites.js            — pixel art sprite definitions (programmatic)
    input.js              — keyboard input handler
    ending.js             — sleeping animation + scrolling story
    title.js              — title screen rendering + press start
    music.js              — Web Audio API drum and bass synth engine
  levels/
    level1.txt            — easy (The Poop Deck)
    level2.txt            — medium (Below Deck)
    level3.txt            — hard (The Crow's Nest)
    README.md             — level editor key and guide
```

## Game State Machine

```
Title Screen → Level 1 → Level 2 → Level 3 → Ending Screen
                  ↑          ↑          ↑
                  └── death respawn ─────┘ (restart current level)
```

## Player — Round Paws

- **Appearance:** Black fur, white triangle around mouth, green eyes, pink inner ears. 16x16 pixel sprite.
- **Physics:** Floaty and forgiving. Low gravity (~0.3), slow terminal velocity, generous air control. Hold jump for higher arc.
- **Controls:**
  - Arrow keys or WASD: move left/right
  - Space or Up: jump (hold for higher)
  - X or Z: throw carrot in facing direction
- **Carrot inventory:** Max 5 carrots. Shown in HUD. One throw = one carrot consumed.
- **Ropes:** When overlapping a rope tile (R), pressing up/down climbs vertically. Normal gravity is suspended while on the rope. Jump to dismount.
- **Death:** Water contact or crab collision → respawn at level start. No lives limit.

## Enemies — Crabs

- **Appearance:** Red body, two eye stalks, claws. 16x12 pixel sprite.
- **Behavior:** Patrol left/right on platforms, reverse at edges or walls. Constant speed, no chasing.
- **Damage:** Touch kills the player.
- **Defeat:** One carrot hit → flash and disappear.

## Weapon — Carrots

- **Pickup:** Walk over a carrot tile (K) to collect. Slight bobbing animation to draw attention.
- **Throwing:** Horizontal projectile in facing direction. Travels until hitting an enemy or exiting the screen.
- **Inventory:** Displayed as carrot icon + count in HUD top-left.

## Level Format

Plain text files. Each character = one 16x16 tile. Levels scroll horizontally, fixed height of 14 tiles (224px viewport).

### Tile Key

```
.  = empty (air)
=  = wood plank (solid platform)
#  = hull wall (solid)
~  = water (kills player)
P  = player start
C  = crab enemy
K  = carrot pickup
F  = flag/finish (end of level)
R  = rope (climbable)
B  = barrel (solid decoration)
M  = mast (background decoration)
-  = thin platform (can jump through from below)
```

### Level Editor Workflow

1. Open any `levels/level*.txt` in a text editor
2. Place characters on the grid using the key above
3. Save the file
4. Refresh the browser to play the updated level

The `levels/README.md` documents the full key and gives level design tips.

## Camera

- Follows player horizontally with smooth lerp
- Vertical position is fixed (levels are one screen tall)
- Clamps to level boundaries (no scrolling past edges)

## HUD

- **Top-left:** Carrot icon + count (e.g., "🥕 x 3")
- **Top-right:** Level name

## Screens

### Title Screen
- Dark night sky background with pixel stars and moon
- "THE ADVENTURE OF" in small gold text
- "ROUND PAWS" in large white text with orange/red drop shadow
- Large happy Round Paws sprite (closed happy eyes ^_^, tail up, big smile)
- Pirate ship deck at bottom
- "PRESS START" blinking text
- Music: chill drum and bass groove

### Gameplay
- Scrolling pirate ship level
- Player, enemies, pickups rendered on tile map
- HUD overlay
- Music: driving drum and bass beat (~170 BPM)

### Ending Screen
- Dark cozy background
- Round Paws curled up sleeping with Zzz animation (looping)
- Scrolling story text rises slowly from bottom, loops continuously
- Story is a fictional epilogue about what happened after the adventure
- Music: mellow ambient drum and bass

## Music — Procedural Drum and Bass

All audio synthesized with Web Audio API. No audio files.

- **Engine:** Oscillators for bass/synths, noise buffer for drums, gain envelopes for shaping
- **Tempo:** ~170 BPM (classic DnB)
- **Patterns:**
  - Title: half-time feel, atmospheric pads, gentle sub bass
  - Gameplay: full-speed breakbeat, rolling bassline, stab synths
  - Ending: stripped back, reverby pads, slow half-time beat
- **Drums:** Kick (sine wave pitch sweep), snare (noise + sine), hi-hat (filtered noise)
- **Bass:** Detuned saw oscillators with low-pass filter, following a looping pattern

## Levels

### Level 1 — The Poop Deck (Easy)
- Simple flat platforms, few gaps
- 2-3 crabs, plenty of carrots
- Teaches basic movement and throwing

### Level 2 — Below Deck (Medium)
- More vertical platforming, thin platforms to jump through
- Ropes to climb, barrels as obstacles
- 4-5 crabs, moderate carrot placement

### Level 3 — The Crow's Nest (Hard)
- Tricky jumps, longer gaps, water hazards
- 6-8 crabs, scarce carrots (must aim carefully)
- Reaches the mast tops, flag at the crow's nest

## Ending Story (Scrolling Text)

A fictional epilogue, approximately 10-15 sentences. Whimsical tone. Example:

> After defeating Captain Clawsworth and his crab crew, Round Paws claimed the ship as his own. He renamed it "The Fuzzy Drifter" and sailed it to the legendary Tuna Isles. There, he discovered a hidden cove filled with the finest catnip the seven seas had ever known. Word spread quickly, and cats from every port came to trade stories and nap in the warm sand. Round Paws became known not as a fearsome pirate, but as the friendliest captain to ever sail. He appointed a seagull named Gerald as first mate, though Gerald mostly just screamed at clouds. Every evening, Round Paws would sit on the bow, watching the sunset paint the waves orange and gold. And when the stars came out, he'd curl up on his favorite barrel, purring softly as the ship rocked gently on the tide. Some say if you listen carefully on a quiet night at sea, you can still hear that purr, carried on the wind across the endless ocean.

## Collision Detection

- AABB (axis-aligned bounding box) for all entities
- Tile collision: check player bounding box against solid tiles in the grid
- Thin platforms: only collide when player is falling and feet are above platform
- Enemy collision: overlap check between player and crab bounding boxes
- Projectile collision: overlap check between carrot and crab bounding boxes
