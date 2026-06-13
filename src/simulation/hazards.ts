import type { GridCell, WorldState } from '@/types'

// Real-world-grounded constants
const FIRE_SPREAD_BASE = 0.018    // intensity units/second at full fuel load, calm wind
const FIRE_BURNOUT_RATE = 0.004   // fuel consumed per second while burning
const FLOOD_SEEP_RATE = 0.006     // meters/second seep to lower neighbors
const WIND_AMPLIFIER = 2.4        // max spread multiplier in downwind direction

export function spreadHazards(state: WorldState, deltaS: number): GridCell[][] {
  const { grid, windDirection } = state
  const H = grid.length
  const W = grid[0].length

  // Deep clone to avoid mutating state
  const next: GridCell[][] = grid.map(row => row.map(cell => ({ ...cell })))

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = grid[y][x]

      // ── Fire spread ───────────────────────────────────────────────────────
      if (cell.fireIntensity > 0.05) {
        // Burn down fuel
        next[y][x].fuelLoad = Math.max(0, cell.fuelLoad - FIRE_BURNOUT_RATE * deltaS)
        if (next[y][x].fuelLoad === 0) next[y][x].fireIntensity = 0

        // Spread to neighbors
        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          const nx = x + dx; const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
          const neighbor = grid[ny][nx]
          if (neighbor.fuelLoad < 0.1 || neighbor.terrain === 'water') continue

          const windDot = dx * windDirection.dx + dy * windDirection.dy
          const windFactor = 1 + Math.max(0, windDot) * (WIND_AMPLIFIER - 1)
          const spreadRate = FIRE_SPREAD_BASE * cell.fireIntensity * neighbor.fuelLoad * windFactor
          next[ny][nx].fireIntensity = Math.min(1, neighbor.fireIntensity + spreadRate * deltaS)

          // Update traversal cost reactively
          next[ny][nx].traversalCost = computeTraversalCost(next[ny][nx])
        }
      }

      // ── Flood seep ────────────────────────────────────────────────────────
      if (cell.floodDepth > 0.05) {
        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          const nx = x + dx; const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
          const neighbor = grid[ny][nx]
          if (neighbor.elevation >= cell.elevation) continue   // only seeps downhill

          const seep = FLOOD_SEEP_RATE * (cell.floodDepth / (cell.elevation - neighbor.elevation + 0.1)) * deltaS
          next[ny][nx].floodDepth = Math.min(3, neighbor.floodDepth + seep)
          next[ny][nx].traversalCost = computeTraversalCost(next[ny][nx])
        }
      }
    }
  }

  return next
}

function computeTraversalCost(cell: GridCell): number {
  if (cell.fireIntensity > 0.5) return 10
  if (cell.floodDepth > 1.5)   return 10
  return 1
    + (cell.terrain === 'rubble' ? 1 : 0)
    + (cell.terrain === 'mud'    ? 0.5 : 0)
    + cell.fireIntensity * 6
    + cell.floodDepth   * 2
}
