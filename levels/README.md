# Level Editor Guide — The Adventure of Round Paws

## How to Edit Levels

1. Open any `level*.txt` file in a text editor
2. Each character represents a 16x16 pixel tile
3. Edit the characters using the key below
4. Save the file and refresh the browser

## Tile Key

| Char | Name           | Description                              |
|------|----------------|------------------------------------------|
| `.`  | Air            | Empty space                              |
| `=`  | Wood Plank     | Solid platform — walkable surface        |
| `#`  | Hull Wall      | Solid wall — blocks movement             |
| `~`  | Water          | Kills the player on contact              |
| `P`  | Player Start   | Where Round Paws spawns (one per level)  |
| `C`  | Crab           | Enemy — patrols left/right on platform   |
| `K`  | Carrot         | Weapon pickup — Round Paws can throw it  |
| `F`  | Flag           | Level exit — touching it completes level |
| `R`  | Rope           | Climbable — press up/down to climb       |
| `B`  | Barrel         | Solid decoration — acts like a wall      |
| `M`  | Mast           | Background decoration — no collision     |
| `-`  | Thin Platform  | Can jump through from below              |

## Rules

- Each level must have exactly one `P` (player start)
- Each level must have exactly one `F` (flag/finish)
- Height should be 14 rows (the game viewport is 14 tiles tall)
- Width can be any length — the camera scrolls horizontally
- Lines starting with `#` at column 0 followed by a space are comments and are ignored
- Place `C` crabs on surfaces — they patrol left/right and reverse at edges
- Place `~` water at the bottom for a danger zone

## Tips

- Start easy: wide platforms, few gaps, plenty of carrots
- Use `R` ropes for vertical sections
- Use `-` thin platforms for interesting vertical movement
- Crabs are more dangerous in tight spaces
- Place carrots before crab encounters so the player is prepared
- Leave some breathing room between challenges
- Test by playing! Save and refresh the browser.

## Creating New Levels

1. Copy an existing level file as a template
2. Name it `levelN.txt` (e.g., `level4.txt`)
3. Edit `js/main.js` to add the new file to `levelFiles` and `levelNames` arrays
4. Refresh the browser to play
