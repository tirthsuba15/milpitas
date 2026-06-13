# MAP REMAKE — shared spec (read before editing any renderer file)

We are remaking Haven's 3D map so it reads as a **legible tactical disaster simulation**, not an
empty plane. The simulation engine (`src/simulation/World.ts`) is COMPLETE and CORRECT — do not
touch it. Your job is purely the **renderer** (`src/renderer/*`). Every component reads world state
reactively via `useWorldStore(s => s.world)` and must never mutate it.

## Coordinate system (IMMUTABLE — all components share this)
- World is **250m × 250m**. Grid is **50×50**, **5m per cell**. Access cells as `grid[y][x]`;
  `cell.x` and `cell.y` are indices 0–49.
- A three.js position is `[worldX, y, worldZ]`. **Grid cell (x,y) → world point `[x*5, 0, y*5]`.**
- Entities (`robot`/`person`/`debris`) and `buildSites` already store **world meters** in
  `position.{x,y,z}` (e.g. `{x:125, z:225}`), so render them at `[position.x, position.y, position.z]`.
- The ground plane is centered at `[125, 0, 125]`.
- `+Z` is "south": robots spawn at the **south edge** (z ≈ 225–230). The mission action is in the
  **north/centre** (z ≈ 30–130). The camera looks from the south-ish, downward.

## Where things are (from World.ts createInitialWorld — for sanity, read live, don't hardcode)
- **Fire zone:** grid `x<18 && y<20` → world **x≈0–90, z≈0–100** (north-west). Hottest near origin.
- **Flood zone:** grid `x>38` → world **x≈190–250** (east strip).
- **Fog of war:** only `grid[y][x].isRevealed` cells are visible; at start only `y>40`
  (world z≈205–245, the spawn strip) is revealed. Drones reveal more as they fly.
- **Build sites:** 6, world x 110–170, z 60–120 (east-central). 4 modules each.
- **People:** scattered x 30–140, z 30–120; only render `status === 'discovered'`.
- **Debris:** mid-map x 40–110, z 60–140.

## Camera / scale reality (size things to be visible)
The scene is viewed with `OrbitControls` from roughly **150m up and ~200m back, angled down**
(default camera ≈ `[125, 150, 320]`, target ≈ `[110, 0, 110]`). At that distance a real 1m robot is
a speck. **Up-scale actors for legibility** (positions stay in true world coords, only the visual
mesh size grows):
- Robots: visual silhouette ~**2.5–3m** tall.
- Person beacons: a glowing marker ~1.5m + a **tall vertical light column (~8–12m)** so discovered
  people are spottable across the field.
- Build sites: keep the **8m footprint**; walls grow to ~6m.
- Fire particles: point size ~0.8–1.2; **hard cap 500 particles total** (CLAUDE.md rule).

## Shared palette (the app theme is BLACK / monochrome — colors must POP on a dark field)
Robot status ring:
`idle #5b6b7c` · `moving #36a6ff` · `working #46f08a` · `blocked #ffb02e` · `failed #ff4d4d`
Person urgency (`urgencyScore`):
`≤50 #d4dbe6` · `51–80 #ffb02e` · `>80 #ff4d4d` (+ beacon column)
Build material tint (`site.materialChoice`) — THIS IS THE DEMO CLIMAX, make it visible:
`imported_timber #c8b89a` · `salvaged_timber #9caa86` · `recycled_panels #8fa39b`
Hazard: fire `#ff5a1e→#ff2a2a`, flood water `#13344e`, scorched ground `#2a211c`.

## Hard rules
- Touch ONLY the file(s) assigned to you. Do NOT edit `Scene.tsx` or any other agent's file.
- Keep the exact named exports (`export function Terrain()`, etc.) and prop signatures.
- Read from the store; never write. No new npm deps beyond what's installed (drei `Text`/`Billboard`,
  `Line` are available).
- Run `./node_modules/.bin/tsc --noEmit` and make sure YOUR files introduce no type errors.
- A `[Fact-Forcing Gate]` error on your FIRST edit of a file is expected: restate the facts
  (importers/callers, affected API, data schema, the verbatim task) in your message, then retry the
  identical edit — it passes on retry.
- Aesthetic: cohesive, restrained, "field-command instrument" look. No emoji. No rainbow. The map
  should feel like one designed system, not a pile of primitives.
