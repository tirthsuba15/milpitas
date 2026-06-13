// ─── Grid dimensions — single source of truth ─────────────────────────────────
// The live sim grid and everything that renders against it (Terrain, FogOfWar,
// Hazards, Ecosystem, …) must share these constants. Do not hardcode 100 / 500
// anywhere else — import from here so the grid can be resized in one place.

/** Cells per side of the square world grid. */
export const GRID_W = 100
export const GRID_H = 100

/** Meters per cell. World extent = GRID_W * CELL_SIZE_M. */
export const CELL_SIZE_M = 5

/** Full world extent in meters (square). 100 × 5 = 500. */
export const WORLD_SIZE_M = GRID_W * CELL_SIZE_M

/** World-space center of the map. */
export const CENTER_X = (GRID_W * CELL_SIZE_M) / 2
export const CENTER_Z = (GRID_H * CELL_SIZE_M) / 2

// ─── Central disaster / work zone (the original ~50×50 demo region) ────────────
// A SUB-REGION of the same world — not a separate slab. Expressed in cells so
// sim + layout agree. Centered on the map; the surrounding cells are an existing
// suburban neighborhood the sim can traverse.
export const CORE_HALF_CELLS = 25   // → 50×50 cell core
export const CORE_MIN_CELL_X = GRID_W / 2 - CORE_HALF_CELLS  // 25
export const CORE_MAX_CELL_X = GRID_W / 2 + CORE_HALF_CELLS  // 75
export const CORE_MIN_CELL_Z = GRID_H / 2 - CORE_HALF_CELLS  // 25
export const CORE_MAX_CELL_Z = GRID_H / 2 + CORE_HALF_CELLS  // 75

/** Disaster core bounds in world meters. */
export const CORE_MIN_X = CORE_MIN_CELL_X * CELL_SIZE_M  // 125
export const CORE_MAX_X = CORE_MAX_CELL_X * CELL_SIZE_M  // 375
export const CORE_MIN_Z = CORE_MIN_CELL_Z * CELL_SIZE_M  // 125
export const CORE_MAX_Z = CORE_MAX_CELL_Z * CELL_SIZE_M  // 375

/** True if a cell (x,y) falls inside the central disaster/work zone. */
export function isCoreCell(x: number, y: number): boolean {
  return (
    x >= CORE_MIN_CELL_X && x < CORE_MAX_CELL_X &&
    y >= CORE_MIN_CELL_Z && y < CORE_MAX_CELL_Z
  )
}

// ─── Deterministic RNG (mulberry32) ────────────────────────────────────────────
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
