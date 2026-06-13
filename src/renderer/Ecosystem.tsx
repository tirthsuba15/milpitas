import { useMemo } from 'react'
import * as THREE from 'three'
import { GRID_W, GRID_H, CELL_SIZE_M, CENTER_X, CENTER_Z } from '@/simulation/grid'
import { useWorldStore } from '@/store/worldStore'
import type { ZoneType } from '@/types'

/**
 * Procedural low-poly ecosystem scattered across the 500 m sim map, ZONE-AWARE.
 *
 * Placement reads world.grid[y][x].zone and only drops nature on 'nature' and
 * 'yard' cells — never on roads, sidewalks, house_lots, civic blocks or the
 * disaster_core. Yards get sparse ornamental greenery; open nature cells get
 * lush, dense grass + groves of trees + bushes so the WHOLE map reads as a
 * living, used suburb-with-greenery rather than an empty field.
 *
 * Everything is one <instancedMesh> per object layer (a few draw calls for
 * thousands of objects). Counts are capped and grass is LOD-thinned with
 * distance from the map center so the 500 m extent stays performant.
 */

// ── deterministic RNG (mulberry32) ──────────────────────────────────────────
function makeRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Placement {
  x: number
  z: number
  scale: number
  rot: number
}

const NATURE_ZONES: ReadonlySet<ZoneType> = new Set<ZoneType>(['nature', 'yard'])

/**
 * Walk the zone grid and emit placements only on plantable (nature/yard) cells.
 * `densityPerCell` is the expected count per qualifying cell (can be <1 → sparse
 * or >1 → multiple tufts). `yardFactor` thins placement on yard cells so they
 * read as tended (sparser) vs wild nature. `seed` keeps it deterministic.
 */
function scatterOnZones(
  grid: { zone: ZoneType }[][] | null,
  seed: number,
  densityPerCell: number,
  opts: {
    yardFactor?: number
    minScale?: number
    maxScale?: number
    jitter?: number // 0..0.5 of a cell
  } = {},
): Placement[] {
  if (!grid) return []
  const { yardFactor = 0.4, minScale = 0.7, maxScale = 1.6, jitter = 0.5 } = opts
  const rng = makeRng(seed)
  const out: Placement[] = []

  for (let y = 0; y < GRID_H; y++) {
    const row = grid[y]
    if (!row) continue
    for (let x = 0; x < GRID_W; x++) {
      const cell = row[x]
      if (!cell || !NATURE_ZONES.has(cell.zone)) continue
      const isYard = cell.zone === 'yard'
      // Expected per-cell count, thinned on yards.
      const expected = densityPerCell * (isYard ? yardFactor : 1)
      // Whole part = guaranteed, fractional part = probabilistic.
      let count = Math.floor(expected)
      if (rng() < expected - count) count += 1

      for (let i = 0; i < count; i++) {
        const wx = (x + 0.5 + (rng() - 0.5) * 2 * jitter) * CELL_SIZE_M
        const wz = (y + 0.5 + (rng() - 0.5) * 2 * jitter) * CELL_SIZE_M
        out.push({
          x: wx,
          z: wz,
          scale: minScale + rng() * (maxScale - minScale),
          rot: rng() * Math.PI * 2,
        })
      }
    }
  }
  return out
}

export function Ecosystem() {
  const world = useWorldStore((s) => s.world)
  const grid = world?.grid ?? null

  return (
    <group>
      <Trees grid={grid} />
      <Bushes grid={grid} />
      <Rocks grid={grid} />
      <GrassTufts grid={grid} />
    </group>
  )
}

type GridProp = { grid: { zone: ZoneType }[][] | null }

// ── Trees: trunk + two stacked cones for a layered low-poly canopy ──────────
function Trees({ grid }: GridProp) {
  // ~0.08 trees per plantable cell → groves, capped well under a few hundred.
  const placements = useMemo(
    () => scatterOnZones(grid, 1337, 0.08, { yardFactor: 0.5, minScale: 0.9, maxScale: 1.7 }),
    [grid],
  )

  const trunkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 1 }),
    [],
  )
  const leafMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3f6b2e', roughness: 1 }),
    [],
  )
  const leafMat2 = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#4f7d36', roughness: 1 }),
    [],
  )

  const { trunks, lower, upper } = useMemo(() => {
    const trunkG = new THREE.CylinderGeometry(0.35, 0.55, 4, 6)
    const lowerG = new THREE.ConeGeometry(3.4, 5, 7)
    const upperG = new THREE.ConeGeometry(2.4, 4, 7)
    return { trunks: trunkG, lower: lowerG, upper: upperG }
  }, [])

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D()
    const trunkArr: THREE.Matrix4[] = []
    const lowerArr: THREE.Matrix4[] = []
    const upperArr: THREE.Matrix4[] = []
    for (const p of placements) {
      const s = p.scale * 1.3
      dummy.position.set(p.x, 2 * s, p.z)
      dummy.rotation.set(0, p.rot, 0)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      trunkArr.push(dummy.matrix.clone())
      dummy.position.set(p.x, (4 + 2.5) * s, p.z)
      dummy.updateMatrix()
      lowerArr.push(dummy.matrix.clone())
      dummy.position.set(p.x, (4 + 5.5) * s, p.z)
      dummy.updateMatrix()
      upperArr.push(dummy.matrix.clone())
    }
    return { trunkArr, lowerArr, upperArr }
  }, [placements])

  const n = placements.length
  if (n === 0) return null

  return (
    <group>
      <instancedMesh
        key={`trunk-${n}`}
        args={[trunks, trunkMat, n]}
        castShadow
        receiveShadow
        ref={applyMatrices(matrices.trunkArr)}
      />
      <instancedMesh
        key={`lower-${n}`}
        args={[lower, leafMat, n]}
        castShadow
        receiveShadow
        ref={applyMatrices(matrices.lowerArr)}
      />
      <instancedMesh
        key={`upper-${n}`}
        args={[upper, leafMat2, n]}
        castShadow
        receiveShadow
        ref={applyMatrices(matrices.upperArr)}
      />
    </group>
  )
}

// ── Rocks: jittered icosahedrons, half-buried, sparse on nature ─────────────
function Rocks({ grid }: GridProp) {
  const placements = useMemo(
    () => scatterOnZones(grid, 7771, 0.02, { yardFactor: 0.1, minScale: 0.6, maxScale: 1.4 }),
    [grid],
  )
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 0)
    const pos = g.attributes.position as THREE.BufferAttribute
    const rng = makeRng(42)
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) * (0.8 + rng() * 0.5),
        pos.getY(i) * (0.7 + rng() * 0.5),
        pos.getZ(i) * (0.8 + rng() * 0.5),
      )
    }
    g.computeVertexNormals()
    return g
  }, [])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#7c7a73', roughness: 1, flatShading: true }),
    [],
  )

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D()
    const arr: THREE.Matrix4[] = []
    for (const p of placements) {
      const s = p.scale * 1.4
      dummy.position.set(p.x, s * 0.35, p.z)
      dummy.rotation.set(p.rot * 0.5, p.rot, p.rot * 0.3)
      dummy.scale.set(s, s * 0.7, s)
      dummy.updateMatrix()
      arr.push(dummy.matrix.clone())
    }
    return arr
  }, [placements])

  const n = placements.length
  if (n === 0) return null

  return (
    <instancedMesh
      key={`rock-${n}`}
      args={[geo, mat, n]}
      castShadow
      receiveShadow
      ref={applyMatrices(matrices)}
    />
  )
}

// ── Bushes: clustered low dodecahedron blobs on nature + yards ──────────────
function Bushes({ grid }: GridProp) {
  const placements = useMemo(
    () => scatterOnZones(grid, 909, 0.16, { yardFactor: 0.6, minScale: 0.7, maxScale: 1.5 }),
    [grid],
  )
  const geo = useMemo(() => new THREE.DodecahedronGeometry(1.3, 0), [])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#456b30', roughness: 1, flatShading: true }),
    [],
  )

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D()
    const arr: THREE.Matrix4[] = []
    for (const p of placements) {
      const s = 0.5 + p.scale * 0.6
      dummy.position.set(p.x, s * 0.6, p.z)
      dummy.rotation.set(0, p.rot, 0)
      dummy.scale.set(s, s * 0.75, s)
      dummy.updateMatrix()
      arr.push(dummy.matrix.clone())
    }
    return arr
  }, [placements])

  const n = placements.length
  if (n === 0) return null

  return (
    <instancedMesh
      key={`bush-${n}`}
      args={[geo, mat, n]}
      castShadow
      receiveShadow
      ref={applyMatrices(matrices)}
    />
  )
}

// ── Grass tufts: crossed billboards, dense + lush, LOD-thinned by distance ──
function GrassTufts({ grid }: GridProp) {
  // Dense on wild nature, sparse on yards. ~1.6/cell on nature gives a lush
  // carpet; distance thinning (below) caps the visible count toward the edges.
  const placements = useMemo(
    () => scatterOnZones(grid, 5550, 1.6, { yardFactor: 0.5, minScale: 0.7, maxScale: 1.5 }),
    [grid],
  )

  const geo = useMemo(() => {
    // three crossed quads for a fuller tuft, anchored at the base.
    const a = new THREE.PlaneGeometry(1.3, 1.1)
    const b = a.clone()
    b.rotateY(Math.PI / 3)
    const c = a.clone()
    c.rotateY((2 * Math.PI) / 3)
    const merged = mergeGeoms([a, b, c])
    merged.translate(0, 0.55, 0)
    return merged
  }, [])

  // Two-tone grass with slight emissive lift so it stays lush in shadow.
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5f8f37',
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    [],
  )

  const { matrices, count } = useMemo(() => {
    const dummy = new THREE.Object3D()
    const arr: THREE.Matrix4[] = []
    // LOD thinning: keep all tufts near center, drop a growing fraction with
    // distance so the far field doesn't pay for blades the fog mostly hides.
    const rng = makeRng(99)
    const maxR = (Math.SQRT2 * (GRID_W * CELL_SIZE_M)) / 2 // corner distance
    for (const p of placements) {
      const dx = p.x - CENTER_X
      const dz = p.z - CENTER_Z
      const d = Math.sqrt(dx * dx + dz * dz)
      const keepProb = THREE.MathUtils.clamp(1 - (d / maxR) * 0.55, 0.45, 1)
      if (rng() > keepProb) continue
      const s = 1.0 + p.scale * 1.1
      dummy.position.set(p.x, 0, p.z)
      dummy.rotation.set(0, p.rot, 0)
      dummy.scale.set(s, s * (0.9 + (p.x % 3) * 0.1), s)
      dummy.updateMatrix()
      arr.push(dummy.matrix.clone())
    }
    return { matrices: arr, count: arr.length }
  }, [placements])

  if (count === 0) return null

  return (
    <instancedMesh
      key={`grass-${count}`}
      args={[geo, mat, count]}
      receiveShadow
      ref={applyMatrices(matrices)}
    />
  )
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** Callback ref that writes a matrix list into an instanced mesh on mount. */
function applyMatrices(matrices: THREE.Matrix4[]) {
  return (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    for (let i = 0; i < matrices.length; i++) {
      mesh.setMatrixAt(i, matrices[i])
    }
    mesh.count = matrices.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }
}

/** Minimal geometry merge (positions + normals + uvs + index). */
function mergeGeoms(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry()
  const posArrays: number[] = []
  const normArrays: number[] = []
  const uvArrays: number[] = []
  const indices: number[] = []
  let vOffset = 0
  for (const g of geoms) {
    const pos = g.attributes.position as THREE.BufferAttribute
    const norm = g.attributes.normal as THREE.BufferAttribute
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      posArrays.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      normArrays.push(norm.getX(i), norm.getY(i), norm.getZ(i))
      uvArrays.push(uv.getX(i), uv.getY(i))
    }
    const idx = g.index
    if (idx) {
      for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + vOffset)
    }
    vOffset += pos.count
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(posArrays, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normArrays, 3))
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvArrays, 2))
  out.setIndex(indices)
  return out
}
