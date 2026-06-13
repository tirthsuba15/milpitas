import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Procedural low-poly ecosystem scattered across the world floor.
 *
 * Everything is rendered with <instancedMesh> for performance (a handful of
 * draw calls for thousands of objects). Placement is seeded + deterministic so
 * the world looks the same every run, and density is shaped by region:
 *   - the sim CORE (0–250 in x/z) is kept clear — it's a disaster/work zone
 *   - density ramps UP toward the surround, clustered in groves, not uniform
 */

const CORE_MIN = 0
const CORE_MAX = 250
const CORE_CX = 125
const CORE_CZ = 125

// Scatter ring: out to here from the core; beyond this the fog hides the ground.
const FIELD_HALF = 1100

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

/**
 * Produce clustered placements across the field, skipping the sim core (with a
 * soft margin) so the work zone stays clear. Returns a flat list; consumers
 * sub-sample it per object type.
 */
function scatter(seed: number, clusters: number, perCluster: number, coreMargin = 18): Placement[] {
  const rng = makeRng(seed)
  const out: Placement[] = []
  const coreLo = CORE_MIN - coreMargin
  const coreHi = CORE_MAX + coreMargin

  for (let c = 0; c < clusters; c++) {
    // Cluster centre, biased toward the surround (avoid the very middle).
    const cx = CORE_CX + (rng() - 0.5) * 2 * FIELD_HALF
    const cz = CORE_CZ + (rng() - 0.5) * 2 * FIELD_HALF
    const spread = 18 + rng() * 60

    for (let i = 0; i < perCluster; i++) {
      const x = cx + (rng() - 0.5) * 2 * spread
      const z = cz + (rng() - 0.5) * 2 * spread

      // Keep the playable core clear.
      if (x > coreLo && x < coreHi && z > coreLo && z < coreHi) continue
      // Stay within the field.
      if (Math.abs(x - CORE_CX) > FIELD_HALF || Math.abs(z - CORE_CZ) > FIELD_HALF) continue

      out.push({
        x,
        z,
        scale: 0.7 + rng() * 0.9,
        rot: rng() * Math.PI * 2,
      })
    }
  }
  return out
}

export function Ecosystem() {
  return (
    <group>
      <Trees />
      <Rocks />
      <Bushes />
      <GrassTufts />
    </group>
  )
}

// ── Trees: a trunk cylinder + two stacked cones for a layered low-poly canopy ─
function Trees() {
  const placements = useMemo(() => scatter(1337, 70, 9, 22), [])

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
      const s = p.scale * (1.4 + (p.x % 7) * 0.04)
      // trunk
      dummy.position.set(p.x, 2 * s, p.z)
      dummy.rotation.set(0, p.rot, 0)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      trunkArr.push(dummy.matrix.clone())
      // lower canopy
      dummy.position.set(p.x, (4 + 2.5) * s, p.z)
      dummy.updateMatrix()
      lowerArr.push(dummy.matrix.clone())
      // upper canopy
      dummy.position.set(p.x, (4 + 5.5) * s, p.z)
      dummy.updateMatrix()
      upperArr.push(dummy.matrix.clone())
    }
    return { trunkArr, lowerArr, upperArr }
  }, [placements])

  const n = placements.length

  return (
    <group>
      <instancedMesh
        args={[trunks, trunkMat, n]}
        castShadow
        receiveShadow
        ref={applyMatrices(matrices.trunkArr)}
      />
      <instancedMesh
        args={[lower, leafMat, n]}
        castShadow
        receiveShadow
        ref={applyMatrices(matrices.lowerArr)}
      />
      <instancedMesh
        args={[upper, leafMat2, n]}
        castShadow
        receiveShadow
        ref={applyMatrices(matrices.upperArr)}
      />
    </group>
  )
}

// ── Rocks: jittered icosahedrons, half-buried ──────────────────────────────
function Rocks() {
  const placements = useMemo(() => scatter(7771, 50, 6, 6), [])
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 0)
    // jitter verts so each rock reads a bit different despite shared geometry
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
      const s = p.scale * 1.6
      dummy.position.set(p.x, s * 0.35, p.z)
      dummy.rotation.set(p.rot * 0.5, p.rot, p.rot * 0.3)
      dummy.scale.set(s, s * 0.7, s)
      dummy.updateMatrix()
      arr.push(dummy.matrix.clone())
    }
    return arr
  }, [placements])

  return (
    <instancedMesh
      args={[geo, mat, placements.length]}
      castShadow
      receiveShadow
      ref={applyMatrices(matrices)}
    />
  )
}

// ── Bushes: clustered low dodecahedron blobs ───────────────────────────────
function Bushes() {
  const placements = useMemo(() => scatter(909, 80, 8, 10), [])
  const geo = useMemo(() => new THREE.DodecahedronGeometry(1.3, 0), [])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#456b30', roughness: 1, flatShading: true }),
    [],
  )

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D()
    const arr: THREE.Matrix4[] = []
    for (const p of placements) {
      const s = 0.6 + p.scale * 0.7
      dummy.position.set(p.x, s * 0.6, p.z)
      dummy.rotation.set(0, p.rot, 0)
      dummy.scale.set(s, s * 0.75, s)
      dummy.updateMatrix()
      arr.push(dummy.matrix.clone())
    }
    return arr
  }, [placements])

  return (
    <instancedMesh
      args={[geo, mat, placements.length]}
      castShadow
      receiveShadow
      ref={applyMatrices(matrices)}
    />
  )
}

// ── Grass tufts: crossed billboards, dense, no shadow cost ──────────────────
function GrassTufts() {
  const placements = useMemo(() => scatter(5550, 140, 14, 8), [])
  const geo = useMemo(() => {
    // two crossed quads
    const a = new THREE.PlaneGeometry(1.4, 1.0)
    const b = a.clone()
    b.rotateY(Math.PI / 2)
    const merged = mergeGeoms([a, b])
    merged.translate(0, 0.5, 0)
    return merged
  }, [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5d8a39',
        roughness: 1,
        side: THREE.DoubleSide,
        transparent: false,
      }),
    [],
  )

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D()
    const arr: THREE.Matrix4[] = []
    for (const p of placements) {
      const s = 0.8 + p.scale * 1.2
      dummy.position.set(p.x, 0, p.z)
      dummy.rotation.set(0, p.rot, 0)
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      arr.push(dummy.matrix.clone())
    }
    return arr
  }, [placements])

  return (
    <instancedMesh args={[geo, mat, placements.length]} receiveShadow ref={applyMatrices(matrices)} />
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
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }
}

/** Minimal geometry merge (positions + normals + uvs + index) for tufts. */
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
