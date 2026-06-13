import type { ZoneType, PlacedStructure, SuburbLayout, StructureType } from '@/types'
import {
  GRID_W, GRID_H, CELL_SIZE_M, makeRng, isCoreCell,
  CORE_MIN_X, CORE_MAX_X, CORE_MIN_Z, CORE_MAX_Z,
} from './grid'

// ─── Suburban layout generator (seeded, deterministic) ─────────────────────────
//
// Produces, over the full 100×100 grid:
//   • a per-cell ZoneType map (roads / sidewalks / yards / house_lot / civic /
//     nature / disaster_core) — the sim reads this for traversal biasing and the
//     visual agent renders models on top of it.
//   • a list of PlacedStructure (houses + a few civic blocks) the renderer maps
//     to models, each with grid coords + rotation.
//
// Design goals (per INTEGRATION_PLAN): "balanced suburb + nature" — a LOOSE
// street grid, houses on lots between roads, generous green gaps, and the
// central disaster core left as a sub-region that blends into the suburb (no
// hard slab edge — the core just gets the disaster_core zone, same ground).

const DEFAULT_SEED = 0xA7E04 // stable arbitrary seed → identical renders

// Street grid spacing in cells. Roads every BLOCK cells in each axis; the gaps
// between are residential blocks. Loose (not every cell) by design.
const BLOCK = 12          // ~60 m blocks
const ROAD_HALF = 0       // road is 1 cell wide (center line); sidewalks flank it

interface SuburbResult {
  zones: ZoneType[][]      // [y][x]
  layout: SuburbLayout
}

const STRUCTURE_FOOTPRINT: Record<StructureType, number> = {
  house_small: 2,
  house_medium: 2,
  house_large: 3,
  civic_block: 4,
}

/**
 * Build the deterministic suburb. Returns a per-cell zone grid (for the sim &
 * renderer) and a SuburbLayout (structures + core bounds) for WorldState.
 */
export function buildSuburb(seed: number = DEFAULT_SEED): SuburbResult {
  const rng = makeRng(seed)

  // 1. Everything starts as nature (green space).
  const zones: ZoneType[][] = Array.from({ length: GRID_H }, () =>
    Array.from({ length: GRID_W }, () => 'nature' as ZoneType),
  )

  const isRoad = (x: number, y: number) =>
    x % BLOCK === 0 || y % BLOCK === 0

  // 2. Lay the loose street grid + flanking sidewalks (skip the disaster core,
  //    so the core blends as bare worn ground rather than gridded streets).
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (isCoreCell(x, y)) continue
      if (isRoad(x, y)) {
        zones[y][x] = 'road'
      }
    }
  }
  // Sidewalks: nature cells orthogonally adjacent to a road become sidewalk.
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (isCoreCell(x, y) || zones[y][x] !== 'nature') continue
      if (
        (x > 0 && zones[y][x - 1] === 'road') ||
        (x < GRID_W - 1 && zones[y][x + 1] === 'road') ||
        (y > 0 && zones[y - 1][x] === 'road') ||
        (y < GRID_H - 1 && zones[y + 1][x] === 'road')
      ) {
        zones[y][x] = 'sidewalk'
      }
    }
  }

  // 3. Place houses on lots inside each block, leaving yards + green gaps.
  const structures: PlacedStructure[] = []
  let structId = 0

  for (let by = 0; by < GRID_H; by += BLOCK) {
    for (let bx = 0; bx < GRID_W; bx += BLOCK) {
      // Interior of this block (exclude the road lines on its edges).
      const x0 = bx + 1 + ROAD_HALF
      const z0 = by + 1 + ROAD_HALF
      const x1 = Math.min(bx + BLOCK - 1, GRID_W - 1)
      const z1 = Math.min(by + BLOCK - 1, GRID_H - 1)

      // Lots arranged in a 2×2-ish pattern within the block, with gaps.
      const lotStep = 5  // ~25 m lot pitch → space for house + yard between
      for (let lz = z0 + 1; lz < z1 - 1; lz += lotStep) {
        for (let lx = x0 + 1; lx < x1 - 1; lx += lotStep) {
          // Leave roughly 1/3 of lots as open green space for a natural suburb.
          if (rng() < 0.33) continue

          const roll = rng()
          const type: StructureType =
            roll < 0.55 ? 'house_small' :
            roll < 0.85 ? 'house_medium' :
            'house_large'
          const fp = STRUCTURE_FOOTPRINT[type]

          // Skip if the footprint would touch the disaster core or run off-grid
          // or overlap a road/sidewalk — keep houses on green lots only.
          if (!footprintIsFreeGreen(zones, lx, lz, fp)) continue

          // Stamp the footprint as house_lot (impassable) and ring it with yard.
          stampFootprint(zones, lx, lz, fp, 'house_lot')
          stampYardRing(zones, lx, lz, fp)

          // Face the house toward the nearest road (rough: 4 cardinal choices).
          const rotationDeg = faceNearestRoad(zones, lx, lz, fp, rng)

          structures.push({
            id: `house-${structId++}`,
            type,
            gridX: lx,
            gridZ: lz,
            rotationDeg,
            footprintCells: fp,
          })
        }
      }
    }
  }

  // 4. A few small civic blocks scattered in the suburb (not in the core).
  const civicCount = 5
  let placedCivic = 0
  let guard = 0
  while (placedCivic < civicCount && guard++ < 400) {
    const lx = 4 + Math.floor(rng() * (GRID_W - 12))
    const lz = 4 + Math.floor(rng() * (GRID_H - 12))
    const fp = STRUCTURE_FOOTPRINT.civic_block
    if (!footprintIsFreeGreen(zones, lx, lz, fp)) continue
    stampFootprint(zones, lx, lz, fp, 'civic')
    stampYardRing(zones, lx, lz, fp)
    structures.push({
      id: `civic-${placedCivic}`,
      type: 'civic_block',
      gridX: lx,
      gridZ: lz,
      rotationDeg: [0, 90, 180, 270][Math.floor(rng() * 4)],
      footprintCells: fp,
    })
    placedCivic++
  }

  // 5. Mark the disaster core zone (a sub-region; same ground, blends in).
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (isCoreCell(x, y)) zones[y][x] = 'disaster_core'
    }
  }

  const layout: SuburbLayout = {
    seed,
    structures,
    disasterCore: { minX: CORE_MIN_X, minZ: CORE_MIN_Z, maxX: CORE_MAX_X, maxZ: CORE_MAX_Z },
  }

  return { zones, layout }
}

// ─── Zone → traversal cost ─────────────────────────────────────────────────────
// Roads are cheapest (units prefer streets); house/civic footprints are
// impassable; yards/sidewalks/nature are normal-ish. The core is left neutral so
// the disaster hazard logic (rubble/fire/flood) dominates there.
export function zoneBaseCost(zone: ZoneType): number {
  switch (zone) {
    case 'road':       return 0.6   // prefer streets
    case 'sidewalk':   return 0.9
    case 'house_lot':  return 10    // impassable
    case 'civic':      return 10    // impassable
    case 'yard':       return 1.2
    case 'nature':     return 1.4   // crossing open ground is a touch slower
    case 'disaster_core':
    default:           return 1
  }
}

export function zoneTerrain(zone: ZoneType): 'clear' | 'asphalt' {
  return zone === 'road' || zone === 'sidewalk' ? 'asphalt' : 'clear'
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID_W && y < GRID_H
}

/** A square footprint at (ox,oz) of side fp is free green & off the core. */
function footprintIsFreeGreen(zones: ZoneType[][], ox: number, oz: number, fp: number): boolean {
  for (let dz = 0; dz < fp; dz++) {
    for (let dx = 0; dx < fp; dx++) {
      const x = ox + dx, z = oz + dz
      if (!inBounds(x, z)) return false
      if (isCoreCell(x, z)) return false
      const zn = zones[z][x]
      if (zn !== 'nature') return false  // only on open green, never on roads/lots
    }
  }
  return true
}

function stampFootprint(zones: ZoneType[][], ox: number, oz: number, fp: number, zone: ZoneType): void {
  for (let dz = 0; dz < fp; dz++) {
    for (let dx = 0; dx < fp; dx++) {
      const x = ox + dx, z = oz + dz
      if (inBounds(x, z)) zones[z][x] = zone
    }
  }
}

/** Surround a footprint with a yard ring (only over nature cells). */
function stampYardRing(zones: ZoneType[][], ox: number, oz: number, fp: number): void {
  for (let dz = -1; dz <= fp; dz++) {
    for (let dx = -1; dx <= fp; dx++) {
      const x = ox + dx, z = oz + dz
      if (!inBounds(x, z) || isCoreCell(x, z)) continue
      if (zones[z][x] === 'nature') zones[z][x] = 'yard'
    }
  }
}

/** Rough yaw (deg) toward the closest road from the footprint center. */
function faceNearestRoad(zones: ZoneType[][], ox: number, oz: number, fp: number, rng: () => number): number {
  const cx = ox + fp / 2, cz = oz + fp / 2
  let best = -1
  let bestDir = Math.floor(rng() * 4) * 90
  const search = 6
  for (let r = 1; r <= search; r++) {
    const probes: Array<[number, number, number]> = [
      [cx, cz - r, 0],    // +Z faces north(-z)? keep 0 = +Z toward -z road
      [cx + r, cz, 90],
      [cx, cz + r, 180],
      [cx - r, cz, 270],
    ]
    for (const [px, pz, deg] of probes) {
      const x = Math.round(px), z = Math.round(pz)
      if (inBounds(x, z) && zones[z][x] === 'road') {
        if (best < 0 || r < best) { best = r; bestDir = deg }
      }
    }
    if (best > 0) break
  }
  return bestDir
}
