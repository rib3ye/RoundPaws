# Web-Based Level Editor — Design Spec

## Overview

A browser-based level editor for Round Paws, served from the existing Node dev server. Optimized for mouse+keyboard. Supports horizontal and vertical scrolling for long and tall levels. Matches the visual style of the existing pixel art tile editor (`editor.html`).

## Layout

Three-region layout: left sidebar, main canvas, bottom status bar.

### Left Sidebar (~180px)

- **Tile palette** — each tile type rendered with its actual game sprite + character label, grouped:
  - **Tiles**: `.` Air/Eraser, `=` Wood Plank, `#` Hull Wall, `~` Water, `-` Thin Platform, `R` Rope, `M` Mast
  - **Entities**: `P` Player Start, `C` Crab, `K` Carrot, `F` Flag, `B` Barrel
- **Tools section** — Draw, Erase, Fill, Select (buttons with hotkey labels)
- **Level section** — level file selector dropdown, New/Save/Load buttons, dimensions display

Click a palette item to select it. Pressing its character key on the keyboard also selects it (e.g., press `=` to select Wood Plank).

### Main Canvas Area

- Tile grid rendered on `#87CEEB` sky-blue background
- Each tile drawn at configurable zoom (default 24px per tile)
- Thin grid lines overlay (toggleable)
- Dashed rectangle overlay showing the 28x14-tile game viewport region, anchored to the cursor position or player start, to give a sense of what the player sees
- Scrollbars (horizontal and vertical) reflecting current viewport position within the full level

### Bottom Status Bar

- Current cursor position: `Col 12, Row 5`
- Level dimensions: `60 x 20`
- Current tool and selected tile
- Zoom level

## Interaction Model

### Drawing

- **Draw tool (D)**: Left-click or left-drag paints the selected tile onto the grid
- **Erase tool (E)**: Left-click or left-drag paints `.` (air)
- **Fill tool (F)**: Left-click flood-fills a contiguous region of the same tile type with the selected tile
- **Select tool (S)**: Left-drag to create a rectangular selection; supports Ctrl+C (copy), Ctrl+X (cut), Ctrl+V (paste at cursor)
- **Right-click always erases** regardless of active tool

### Navigation

- **Mouse wheel**: vertical scroll
- **Shift + mouse wheel**: horizontal scroll
- **Middle-click drag**: free pan in any direction
- **WASD / Arrow keys**: pan the viewport
- **Ctrl + mouse wheel**: zoom in/out (clamp to 8px–48px per tile)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| D | Draw tool |
| E | Erase tool |
| F | Fill tool |
| S | Select tool |
| G | Toggle grid overlay |
| `.` `=` `#` `~` `-` `R` `M` `B` `P` `C` `K` `F` | Select that tile/entity (note: F as tile selector only when not in tool-select mode — hold Shift+F for Flag to avoid conflict with Fill) |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Ctrl+S | Save to game (disk) |
| Ctrl+N | New level dialog |
| `+` / `-` | Add/remove columns or rows from level edges (opens a small direction picker) |
| Delete / Backspace | Clear selection to air |

### Hotkey Conflict Resolution

- `F` alone activates the Fill tool
- `Shift+F` selects the Flag entity
- All other character keys select tiles directly since they don't conflict with tool shortcuts

## Persistence

### Auto-Save (LocalStorage)

- Every edit auto-saves the current level state to `localStorage` keyed by `level-editor:<filename>`
- On page load, if a localStorage draft exists for the loaded level, prompt: "Resume unsaved draft?" with options to restore or discard
- Stores: grid data, level dimensions, filename

### Save to Game (Disk)

- "Save to Game" button writes the level `.txt` file to the `levels/` directory via a new server API endpoint
- Keyboard shortcut: Ctrl+S

### Server API (new endpoints)

- `POST /api/save-level` — accepts `{ filename: "level1.txt", data: "...level text..." }`, writes to `levels/`
- `GET /api/list-levels` — returns array of `.txt` filenames in `levels/`
- `GET /api/load-level?file=level1.txt` — returns the raw text content of a level file

### Load

- Dropdown in sidebar lists available level files (fetched from `/api/list-levels`)
- Selecting a file loads it into the editor
- On load, checks localStorage for a newer draft and offers to restore

### New Level

- "New" button opens a dialog to set width and height (defaults: 60 wide, 14 tall)
- Creates a blank grid filled with `.` (air)
- User enters a filename (e.g., `level4.txt`)

## Level Format

Identical to the existing `.txt` format:
- One character per tile
- Lines starting with `# ` are comments (first line = level name/description)
- Variable width and height
- Fully backward-compatible with existing levels

## Game Engine Changes

### Vertical Camera Scrolling (renderer.js)

The renderer currently only scrolls horizontally. Add vertical camera tracking:
- `camera.y` tracks player Y position, lerped like `camera.x`
- Clamp to `[0, levelHeight * TILE - canvasH]`
- If level height <= 14 (fits in one screen), lock `camera.y = 0` (existing behavior preserved)
- Update `drawLevel` to cull rows by camera.y the same way it culls columns by camera.x
- Update `drawSprite` to offset by `camera.y`

### Level Loader (level.js)

No changes needed — `parse()` already handles variable-height grids.

### Player (player.js)

No changes needed — player movement and collision already work with any grid size. The camera change is purely in the renderer.

## Visual Style

Match the existing tile editor (`editor.html`):
- Background: `#1a1a2e`
- Sidebar: `#16213e` with `#0f3460` borders
- Accent: `#e94560`
- Active states: `#2a1a3e` background with accent border
- Monospace font throughout
- Buttons: same `.sprite-btn` / `.tool-btn` styling patterns

## File Structure

- `level-editor.html` — the editor page (HTML + inline styles matching editor.html pattern)
- `js/level-editor.js` — all editor logic (single file, IIFE pattern matching other game JS)
- `server.js` — add 3 new API endpoints

## Out of Scope

- Multi-level management UI (just a simple file picker)
- Undo history persistence across page reloads
- Collaborative editing
- In-editor playtesting (user just opens the game in another tab)
