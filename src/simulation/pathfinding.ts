import type { GridCell, Vec3 } from '@/types'
import { CELL_SIZE_M } from './grid'

// A* on the hazard grid. Returns world-space Vec3 waypoints or null if no path.
//
// Performance: on the 100×100 (10k-cell) grid a linear-scan open set would be
// O(n²). We use a binary min-heap keyed on f, plus flat typed-array bookkeeping
// (g-scores, came-from, closed/open flags) indexed by cell id = y*W+x. This
// keeps a full-map search well under a millisecond and is safe to call per
// assignment without throttling.
export function findPath(
  grid: GridCell[][],
  from: Vec3,
  to: Vec3,
  clearanceRadius: number,
  cellSizeM = CELL_SIZE_M
): Vec3[] | null {
  const gridH = grid.length
  const gridW = grid[0]?.length ?? 0
  if (!gridW) return null

  const sx = Math.round(from.x / cellSizeM)
  const sy = Math.round(from.z / cellSizeM)
  const ex = Math.round(to.x / cellSizeM)
  const ey = Math.round(to.z / cellSizeM)

  if (sx < 0 || sy < 0 || sx >= gridW || sy >= gridH) return null
  if (ex < 0 || ey < 0 || ex >= gridW || ey >= gridH) return null
  if (sx === ex && sy === ey) return []

  const N = gridW * gridH
  const idx = (x: number, y: number) => y * gridW + x
  const goal = idx(ex, ey)

  const gScore = new Float64Array(N).fill(Infinity)
  const cameFrom = new Int32Array(N).fill(-1)
  const closed = new Uint8Array(N)

  const heap = new MinHeap(N)
  const h = (x: number, y: number) => Math.abs(x - ex) + Math.abs(y - ey)

  const start = idx(sx, sy)
  gScore[start] = 0
  heap.push(start, h(sx, sy))

  const dirs = [1, 0, -1, 0, 0, 1, 0, -1] // x,y pairs

  while (heap.size > 0) {
    const current = heap.pop()
    if (current === goal) return reconstruct(cameFrom, start, goal, gridW, cellSizeM, from.y)
    if (closed[current]) continue
    closed[current] = 1

    const cx = current % gridW
    const cy = (current / gridW) | 0

    for (let d = 0; d < 8; d += 2) {
      const nx = cx + dirs[d]
      const ny = cy + dirs[d + 1]
      if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH) continue
      const ni = idx(nx, ny)
      if (closed[ni]) continue

      const cost = traversalCost(grid[ny][nx], clearanceRadius)
      if (cost >= 10) continue // impassable

      const tentative = gScore[current] + cost
      if (tentative < gScore[ni]) {
        gScore[ni] = tentative
        cameFrom[ni] = current
        heap.push(ni, tentative + h(nx, ny))
      }
    }
  }

  return null // no path
}

function reconstruct(
  cameFrom: Int32Array,
  start: number,
  goal: number,
  gridW: number,
  cellSizeM: number,
  y: number,
): Vec3[] {
  const path: Vec3[] = []
  let n = goal
  while (n !== -1 && n !== start) {
    const x = n % gridW
    const gy = (n / gridW) | 0
    path.unshift({ x: x * cellSizeM, y, z: gy * cellSizeM })
    n = cameFrom[n]
  }
  return path // already excludes the start cell
}

function traversalCost(cell: GridCell, _clearanceRadius: number): number {
  if (cell.fireIntensity > 0.5) return 10 // impassable
  if (cell.floodDepth > 1.0) return 10
  let cost = cell.traversalCost
  if (cell.fireIntensity > 0) cost += cell.fireIntensity * 8
  if (cell.floodDepth > 0) cost += cell.floodDepth * 3
  return cost
}

// ─── Binary min-heap keyed on priority (f-score) ───────────────────────────────
class MinHeap {
  private items: Int32Array
  private prio: Float64Array
  size = 0

  constructor(capacityHint: number) {
    // Open set can re-push the same node; size it generously.
    const cap = Math.max(16, capacityHint)
    this.items = new Int32Array(cap)
    this.prio = new Float64Array(cap)
  }

  push(item: number, priority: number): void {
    if (this.size >= this.items.length) this.grow()
    let i = this.size++
    this.items[i] = item
    this.prio[i] = priority
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.prio[parent] <= this.prio[i]) break
      this.swap(i, parent)
      i = parent
    }
  }

  pop(): number {
    const top = this.items[0]
    const last = --this.size
    this.items[0] = this.items[last]
    this.prio[0] = this.prio[last]
    let i = 0
    while (true) {
      const l = 2 * i + 1
      const r = 2 * i + 2
      let smallest = i
      if (l < this.size && this.prio[l] < this.prio[smallest]) smallest = l
      if (r < this.size && this.prio[r] < this.prio[smallest]) smallest = r
      if (smallest === i) break
      this.swap(i, smallest)
      i = smallest
    }
    return top
  }

  private swap(a: number, b: number): void {
    const ti = this.items[a]; this.items[a] = this.items[b]; this.items[b] = ti
    const tp = this.prio[a]; this.prio[a] = this.prio[b]; this.prio[b] = tp
  }

  private grow(): void {
    const ni = new Int32Array(this.items.length * 2)
    const np = new Float64Array(this.prio.length * 2)
    ni.set(this.items); np.set(this.prio)
    this.items = ni; this.prio = np
  }
}
