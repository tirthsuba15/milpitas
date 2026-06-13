import type { GridCell } from '@/types'

// Single source of truth for the neighbourhood layout, shared by the sim (World.buildGrid +
// createInitialWorld) and the renderer (Terrain.Roads). Keeping it here means the visual roads
// and the pathfinding roads are identical by construction.

const CELL_SIZE_M = 5
export const worldToCell = (w: number): number => Math.round(w / CELL_SIZE_M)

// ── Roads ──────────────────────────────────────────────────────────────────────
// {x,z} = segment centre (world metres); w = x-extent, l = z-extent.
export interface RoadSegment {
  x: number
  z: number
  w: number
  l: number
}
export const ROAD_SEGMENTS: RoadSegment[] = [
  { x: 133, z: 78, w: 7, l: 100 }, // N-S main street
  { x: 163, z: 47, w: 85, l: 7 },  // E-W cross-streets
  { x: 163, z: 76, w: 85, l: 7 },
  { x: 163, z: 105, w: 85, l: 7 },
]

// ── Lots ───────────────────────────────────────────────────────────────────────
// Varied footprints + orientation facing the central (z=76) street — real plots, not a lattice.
// North row faces +z (south, toward the street); south row faces -z (north, toward the street).
export interface LotDef {
  id: string
  position: { x: number; y: number; z: number }
  footprint: { width: number; depth: number; rotationY: number }
  zoneType: string
}
export const LOT_DEFS: LotDef[] = [
  { id: 'site-1', position: { x: 146, y: 0, z: 60 }, footprint: { width: 12, depth: 9, rotationY: 0.05 }, zoneType: 'residential' },
  { id: 'site-2', position: { x: 165, y: 0, z: 58 }, footprint: { width: 9, depth: 11, rotationY: -0.04 }, zoneType: 'residential' },
  { id: 'site-3', position: { x: 184, y: 0, z: 61 }, footprint: { width: 11, depth: 10, rotationY: 0.03 }, zoneType: 'residential' },
  { id: 'site-4', position: { x: 145, y: 0, z: 91 }, footprint: { width: 10, depth: 12, rotationY: Math.PI - 0.05 }, zoneType: 'residential' },
  { id: 'site-5', position: { x: 166, y: 0, z: 93 }, footprint: { width: 13, depth: 9, rotationY: Math.PI + 0.04 }, zoneType: 'residential' },
  { id: 'site-6', position: { x: 185, y: 0, z: 90 }, footprint: { width: 9, depth: 10, rotationY: Math.PI - 0.03 }, zoneType: 'mixed_use' },
]

/**
 * Paint asphalt onto a freshly-built grid wherever a road segment covers a `clear` cell.
 * Only overwrites `clear` (never water/rubble/fire) so roads don't bleed into hazards.
 * Asphalt cells get a low traversalCost so A* (which reads cell.traversalCost) prefers roads.
 */
export function rasterizeRoads(grid: GridCell[][]): void {
  for (const s of ROAD_SEGMENTS) {
    const gx0 = worldToCell(s.x - s.w / 2)
    const gx1 = worldToCell(s.x + s.w / 2)
    const gy0 = worldToCell(s.z - s.l / 2)
    const gy1 = worldToCell(s.z + s.l / 2)
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const cell = grid[gy]?.[gx]
        if (cell && cell.terrain === 'clear') {
          cell.terrain = 'asphalt'
          cell.traversalCost = 0.8
        }
      }
    }
  }
}
