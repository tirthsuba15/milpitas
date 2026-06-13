import type { GridCell, Vec3 } from '@/types'

interface Node {
  x: number; y: number
  g: number; h: number; f: number
  parent: Node | null
}

// A* on the hazard grid. Returns world-space Vec3 waypoints or null if no path.
export function findPath(
  grid: GridCell[][],
  from: Vec3,
  to: Vec3,
  clearanceRadius: number,
  cellSizeM = 5
): Vec3[] | null {
  const gridH = grid.length
  const gridW = grid[0]?.length ?? 0
  if (!gridW) return null

  const toCell = (w: Vec3) => ({ gx: Math.round(w.x / cellSizeM), gy: Math.round(w.z / cellSizeM) })
  const toWorld = (gx: number, gy: number, y = 0): Vec3 => ({ x: gx * cellSizeM, y, z: gy * cellSizeM })

  const { gx: sx, gy: sy } = toCell(from)
  const { gx: ex, gy: ey } = toCell(to)

  if (sx === ex && sy === ey) return []

  const open = new Map<string, Node>()
  const closed = new Set<string>()
  const key = (x: number, y: number) => `${x},${y}`

  const h = (x: number, y: number) => Math.abs(x - ex) + Math.abs(y - ey)
  const start: Node = { x: sx, y: sy, g: 0, h: h(sx, sy), f: h(sx, sy), parent: null }
  open.set(key(sx, sy), start)

  while (open.size > 0) {
    // pick lowest f
    let current: Node | null = null
    for (const node of open.values()) {
      if (!current || node.f < current.f) current = node
    }
    if (!current) break

    if (current.x === ex && current.y === ey) {
      const path: Vec3[] = []
      let n: Node | null = current
      while (n) { path.unshift(toWorld(n.x, n.y, from.y)); n = n.parent }
      return path.slice(1) // skip start position
    }

    open.delete(key(current.x, current.y))
    closed.add(key(current.x, current.y))

    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nx = current.x + dx
      const ny = current.y + dy
      if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH) continue
      if (closed.has(key(nx, ny))) continue

      const cell = grid[ny][nx]
      const cost = traversalCost(cell, clearanceRadius)
      if (cost >= 10) continue  // impassable

      const g = current.g + cost
      const existing = open.get(key(nx, ny))
      if (!existing || g < existing.g) {
        const neighbor: Node = { x: nx, y: ny, g, h: h(nx, ny), f: g + h(nx, ny), parent: current }
        open.set(key(nx, ny), neighbor)
      }
    }
  }

  return null // no path
}

function traversalCost(cell: GridCell, clearanceRadius: number): number {
  if (cell.fireIntensity > 0.5) return 10  // impassable
  if (cell.floodDepth > 1.0)   return 10
  let cost = cell.traversalCost
  if (cell.fireIntensity > 0)  cost += cell.fireIntensity * 8
  if (cell.floodDepth > 0)     cost += cell.floodDepth * 3
  return cost
}
