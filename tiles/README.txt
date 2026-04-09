TILE NAMING SYSTEM
==================

Drop PNG files here to override any game sprite.
The game loads these at startup and uses them instead of built-in sprites.
If a file is missing, the built-in programmatic sprite is used as fallback.

NAMING CONVENTION
-----------------

Single-frame sprites:  name.png
Animated sprites:      name_0.png, name_1.png, name_2.png, ...

LEVEL TILES (all 16x16 pixels)
------------------------------
wood_plank.png         - Wooden deck planks
hull_wall.png          - Ship hull wall
rope.png               - Climbable rope
barrel.png             - Barrel obstacle
mast.png               - Ship mast
thin_platform.png      - Thin walkable platform
water_0.png            - Water frame 0
water_1.png            - Water frame 1
water_2.png            - Water frame 2
water_3.png            - Water frame 3

CHARACTERS
----------
cat_0.png .. cat_3.png         - Player cat, facing right (16x16, 4 frames)
cat_left_0.png .. cat_left_3.png - Player cat, facing left (16x16, 4 frames)
crab_0.png .. crab_3.png       - Crab enemy (16x12, 4 frames)

OBJECTS
-------
carrot.png                     - Carrot pickup (8x14)
carrot_projectile.png          - Carrot projectile, right (8x4)
carrot_projectile_left.png     - Carrot projectile, left (8x4)
flag_0.png, flag_1.png         - Level end flag (8x16, 2 frames)

TITLE/ENDING
-------------
happy_cat.png                  - Title screen cat (32x32)
sleeping_cat_0.png .. sleeping_cat_2.png - Ending screen cat (32x16, 3 frames)

HOW TO EXPORT CURRENT SPRITES
------------------------------
Open export-tiles.html in your browser to download all current sprites as PNGs.
