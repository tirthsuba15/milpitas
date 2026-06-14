import * as THREE from 'three'

/**
 * Smooth Hermite interpolation (GLSL smoothstep). Returns 0 below `edge0`, 1
 * above `edge1`, and an eased ramp in between — used to fade/scale build-stage
 * details in over a small progress window instead of snapping at a threshold.
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Deterministic PRNG seeded from a string (e.g. site.id) → stable per-building
 * variation that never changes between renders. FNV-1a hash → mulberry32.
 */
export function seededRng(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Gable (triangular-prism) roof. Ridge runs along X; the two slopes face ±Z and the
 * triangular gable ends face ±X. `overhang` extends the eaves beyond the walls.
 * Non-indexed so normals are flat per-face → crisp roof edges. Render with DoubleSide.
 */
export function makeGableRoof(width: number, depth: number, rise: number, overhang = 0.6): THREE.BufferGeometry {
  const X = width / 2 + overhang
  const Z = depth / 2 + overhang
  const A0: [number, number, number] = [-X, 0, -Z]
  const B0: [number, number, number] = [-X, 0, Z]
  const C0: [number, number, number] = [-X, rise, 0]
  const A1: [number, number, number] = [X, 0, -Z]
  const B1: [number, number, number] = [X, 0, Z]
  const C1: [number, number, number] = [X, rise, 0]
  const tri = (a: number[], b: number[], c: number[]) => [...a, ...b, ...c]
  const pos = [
    ...tri(A0, C0, C1), ...tri(A0, C1, A1), // slope facing -Z
    ...tri(B1, C1, C0), ...tri(B1, C0, B0), // slope facing +Z
    ...tri(A0, B0, C0),                      // gable end -X
    ...tri(A1, C1, B1),                      // gable end +X
  ]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}
