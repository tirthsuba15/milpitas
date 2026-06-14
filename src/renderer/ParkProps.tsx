import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { makeRng } from '@/simulation/grid'
import { ModelBoundary } from './ModelBoundary'

/**
 * ParkProps — greenery, benches, and landmark centerpieces for the community
 * park occupying the former disaster_core.
 *
 * Reuses existing GLBs (tree, bush, flowers, bench) with bbox-normalized scale,
 * matching the SuburbStructures / SuburbProps pattern.  Landmark structures
 * (gazebo, fountain, playground) are built from procedural Three.js geometry.
 *
 * PLACEMENT CONSTRAINTS (world units, XZ):
 *   Core bounds X,Z ∈ [125,375] — everything stays inside.
 *   Build-site exclusion: X∈[256,324], Z∈[169,229] — no props there.
 *   Pond exclusion: ellipse center (222,305), radii 28×20 m + 4 m margin.
 *   Landmarks: gazebo ~(248,288), fountain ~(195,255), playground ~(300,290).
 */

// ── Existing GLB paths ───────────────────────────────────────────────────────
const TREE_URL    = '/models/nature/tree.glb'
const BUSH_URL    = '/models/nature/bush.glb'
const FLOWERS_URL = '/models/nature/flowers.glb'
const BENCH_URL   = '/models/street/bench.glb'

useGLTF.preload(TREE_URL)
useGLTF.preload(BUSH_URL)
useGLTF.preload(FLOWERS_URL)
useGLTF.preload(BENCH_URL)

// ── Constraint helpers ───────────────────────────────────────────────────────

const CORE_MIN = 125
const CORE_MAX = 375
const BUILD_X0 = 256, BUILD_X1 = 324
const BUILD_Z0 = 169, BUILD_Z1 = 229
const POND_CX = 222, POND_CZ = 305
const POND_RX = 28 + 4    // semi-axis X + margin
const POND_RZ = 20 + 4    // semi-axis Z + margin

function inBuildSite(x: number, z: number): boolean {
  return x >= BUILD_X0 && x <= BUILD_X1 && z >= BUILD_Z0 && z <= BUILD_Z1
}

function inPond(x: number, z: number): boolean {
  const dx = (x - POND_CX) / POND_RX
  const dz = (z - POND_CZ) / POND_RZ
  return dx * dx + dz * dz < 1
}

function isPlaceable(x: number, z: number, margin = 0): boolean {
  return (
    x >= CORE_MIN + margin && x <= CORE_MAX - margin &&
    z >= CORE_MIN + margin && z <= CORE_MAX - margin &&
    !inBuildSite(x, z) &&
    !inPond(x, z)
  )
}

// ── GLB instancing helpers ───────────────────────────────────────────────────

interface GLBFit {
  /** Each (geo, mat, local-matrix) part of the GLB, one entry per sub-mesh. */
  parts: Array<{ geo: THREE.BufferGeometry; mat: THREE.Material | THREE.Material[]; local: THREE.Matrix4 }>
  scale: number
  yOffset: number
}

/**
 * Collect every mesh in a GLB scene and compute a normalized scale so the
 * bounding-box max horizontal dimension equals targetSizeM.  Returns parts that
 * can each be fed into their own InstancedMesh.
 */
function useGLBFit(url: string, targetSizeM: number): GLBFit {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    // Update world matrices so matrixWorld is correct for each sub-mesh.
    scene.updateWorldMatrix(true, true)

    // Collect all mesh parts.
    const parts: GLBFit['parts'] = []
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && m.geometry) {
        parts.push({ geo: m.geometry, mat: m.material, local: m.matrixWorld.clone() })
      }
    })

    // Compute overall bounding box from the scene root.
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.z) || 1
    const scale = targetSizeM / maxDim
    const yOffset = -box.min.y * scale

    return { parts, scale, yOffset }
  // targetSizeM is a stable literal — intentionally not in deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene])
}

// ── Placement type ───────────────────────────────────────────────────────────

interface Pt { x: number; z: number; rot: number; scl: number }

// ── Scatter helpers ──────────────────────────────────────────────────────────

function scatter(
  seed: number,
  count: number,
  margin = 12,
  scaleMin = 0.8,
  scaleMax = 1.4,
): Pt[] {
  const rng = makeRng(seed)
  const out: Pt[] = []
  let tries = 0
  while (out.length < count && tries < count * 30) {
    tries++
    const x = CORE_MIN + margin + rng() * (CORE_MAX - CORE_MIN - margin * 2)
    const z = CORE_MIN + margin + rng() * (CORE_MAX - CORE_MIN - margin * 2)
    if (!isPlaceable(x, z, margin)) continue
    out.push({ x, z, rot: rng() * Math.PI * 2, scl: scaleMin + rng() * (scaleMax - scaleMin) })
  }
  return out
}

function lakesideBenches(): Pt[] {
  const rng = makeRng(0xABCD)
  const angles = [0.3, 0.9, 1.6, 2.3, 3.0, 3.7, 4.5, 5.2]
  const out: Pt[] = []
  for (const a of angles) {
    const x = POND_CX + Math.cos(a) * (POND_RX + 3)
    const z = POND_CZ + Math.sin(a) * (POND_RZ + 3)
    if (!isPlaceable(x, z)) continue
    const rot = Math.atan2(POND_CX - x, POND_CZ - z) + (rng() - 0.5) * 0.3
    out.push({ x, z, rot, scl: 1 })
  }
  return out
}

function benchRing(seed: number, count: number): Pt[] {
  const rng = makeRng(seed)
  const cx = 250, cz = 250
  const out: Pt[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rng() * 0.25
    const r = 88 + rng() * 18
    const x = cx + Math.cos(angle) * r
    const z = cz + Math.sin(angle) * r
    if (!isPlaceable(x, z)) continue
    const rot = Math.atan2(cx - x, cz - z) + (rng() - 0.5) * 0.35
    out.push({ x, z, rot, scl: 1 })
  }
  return out
}

// ── GLB instanced batch renderer ─────────────────────────────────────────────

/** Reusable dummy for building instance matrices without allocating per call. */
const _dummy = new THREE.Object3D()

/**
 * Renders all `pts` as instanced draw calls — one InstancedMesh per sub-mesh
 * in the GLB (matching SuburbProps.tsx pattern).  One draw call per sub-mesh
 * instead of one draw call per placement.
 */
function GLBBatch({ url, targetSizeM, pts }: { url: string; targetSizeM: number; pts: Pt[] }) {
  const fit = useGLBFit(url, targetSizeM)

  if (fit.parts.length === 0 || pts.length === 0) return null

  return (
    <group>
      {fit.parts.map((part, pi) => (
        <instancedMesh
          key={pi}
          args={[part.geo, part.mat as THREE.Material, pts.length]}
          castShadow
          receiveShadow
          ref={(mesh) => {
            if (!mesh) return
            const base = new THREE.Matrix4()
            for (let i = 0; i < pts.length; i++) {
              const p = pts[i]
              base.compose(
                new THREE.Vector3(p.x, fit.yOffset, p.z),
                new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.rot, 0)),
                new THREE.Vector3(fit.scale * p.scl, fit.scale * p.scl, fit.scale * p.scl),
              )
              // Bake the part's local sub-mesh transform into each instance.
              _dummy.matrix.copy(base).multiply(part.local)
              mesh.setMatrixAt(i, _dummy.matrix)
            }
            mesh.instanceMatrix.needsUpdate = true
            mesh.computeBoundingSphere()
          }}
        />
      ))}
    </group>
  )
}

// ── Landmark: Gazebo ─────────────────────────────────────────────────────────

function Gazebo({ position }: { position: [number, number, number] }) {
  const roofMat   = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7B3A12', roughness: 0.8, flatShading: true }), [])
  const pillarMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#D4C99A', roughness: 0.9 }), [])
  const baseMat   = useMemo(() => new THREE.MeshStandardMaterial({ color: '#B8A882', roughness: 1 }), [])
  const floorMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: '#C9B87A', roughness: 1 }), [])

  const roofGeo   = useMemo(() => new THREE.ConeGeometry(7, 4.5, 6), [])
  const capGeo    = useMemo(() => new THREE.SphereGeometry(0.4, 6, 4), [])
  const pillarGeo = useMemo(() => new THREE.CylinderGeometry(0.3, 0.38, 4.5, 8), [])
  const baseGeo   = useMemo(() => new THREE.CylinderGeometry(6.6, 7.1, 0.45, 6), [])
  const floorGeo  = useMemo(() => new THREE.CylinderGeometry(5.9, 5.9, 0.2, 6), [])

  const pillarPositions = useMemo<[number, number, number][]>(() =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6
      return [Math.cos(a) * 5.8, 2.25, Math.sin(a) * 5.8]
    }),
  [])

  return (
    <group position={position}>
      <mesh geometry={baseGeo}   material={baseMat}   position={[0, 0.225, 0]} receiveShadow />
      <mesh geometry={floorGeo}  material={floorMat}  position={[0, 0.55, 0]}  receiveShadow />
      {pillarPositions.map((pos, i) => (
        <mesh key={i} geometry={pillarGeo} material={pillarMat} position={pos} castShadow />
      ))}
      <mesh geometry={roofGeo} material={roofMat} position={[0, 6.75, 0]} castShadow receiveShadow />
      <mesh geometry={capGeo}  material={roofMat} position={[0, 9.0, 0]}  castShadow />
    </group>
  )
}

// ── Landmark: Fountain ───────────────────────────────────────────────────────

function Fountain({ position }: { position: [number, number, number] }) {
  const stoneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9E9E8E', roughness: 0.9, flatShading: true }), [])
  const waterMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#4aafc5', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.75,
  }), [])

  const basinRingGeo  = useMemo(() => new THREE.TorusGeometry(4, 0.55, 8, 24), [])
  const basinFloorGeo = useMemo(() => new THREE.CylinderGeometry(4, 4.2, 0.25, 24), [])
  const waterGeo      = useMemo(() => new THREE.CircleGeometry(3.7, 24), [])
  const pedestalGeo   = useMemo(() => new THREE.CylinderGeometry(0.5, 0.7, 2.2, 12), [])
  const bowlGeo       = useMemo(() => new THREE.CylinderGeometry(1.8, 0.55, 0.35, 16), [])
  const upperWaterGeo = useMemo(() => new THREE.CircleGeometry(1.6, 16), [])
  const spoutGeo      = useMemo(() => new THREE.SphereGeometry(0.22, 8, 6), [])

  return (
    <group position={position}>
      <mesh geometry={basinFloorGeo} material={stoneMat} position={[0, 0.125, 0]} receiveShadow />
      <mesh geometry={basinRingGeo}  material={stoneMat} position={[0, 0.55, 0]}  rotation={[Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={waterGeo}      material={waterMat} position={[0, 0.5, 0]}   rotation={[-Math.PI / 2, 0, 0]} />
      <mesh geometry={pedestalGeo}   material={stoneMat} position={[0, 1.1, 0]}   castShadow />
      <mesh geometry={bowlGeo}       material={stoneMat} position={[0, 2.4, 0]}   castShadow />
      <mesh geometry={upperWaterGeo} material={waterMat} position={[0, 2.58, 0]}  rotation={[-Math.PI / 2, 0, 0]} />
      <mesh geometry={spoutGeo}      material={stoneMat} position={[0, 2.95, 0]}  castShadow />
    </group>
  )
}

// ── Landmark: Playground ─────────────────────────────────────────────────────

function Playground({ position }: { position: [number, number, number] }) {
  const metalMat    = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d04040', roughness: 0.4, metalness: 0.55 }), [])
  const seatMat     = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2060bf', roughness: 0.8 }), [])
  const slideMat    = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8b820', roughness: 0.4, metalness: 0.3 }), [])
  const platformMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a04e18', roughness: 0.85 }), [])

  const postGeo     = useMemo(() => new THREE.CylinderGeometry(0.12, 0.12, 4, 8), [])
  const crossbarGeo = useMemo(() => new THREE.CylinderGeometry(0.1, 0.1, 5.2, 8), [])
  const chainGeo    = useMemo(() => new THREE.CylinderGeometry(0.04, 0.04, 2, 6), [])
  const seatGeo     = useMemo(() => new THREE.BoxGeometry(0.55, 0.1, 0.28), [])
  const rampGeo     = useMemo(() => new THREE.BoxGeometry(1.0, 0.1, 3.5), [])
  const platformGeo = useMemo(() => new THREE.BoxGeometry(2.2, 0.18, 2.2), [])
  const railGeo     = useMemo(() => new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), [])
  const rungGeo     = useMemo(() => new THREE.CylinderGeometry(0.06, 0.06, 0.65, 6), [])

  return (
    <group position={position}>
      {/* Swing set */}
      <group position={[-3.5, 0, 0]}>
        {/* Left A-frame */}
        <mesh geometry={postGeo} material={metalMat} position={[-2.0, 2, -0.7]} rotation={[0.22, 0, 0]} castShadow />
        <mesh geometry={postGeo} material={metalMat} position={[-2.0, 2,  0.7]} rotation={[-0.22, 0, 0]} castShadow />
        {/* Right A-frame */}
        <mesh geometry={postGeo} material={metalMat} position={[2.0, 2, -0.7]} rotation={[0.22, 0, 0]} castShadow />
        <mesh geometry={postGeo} material={metalMat} position={[2.0, 2,  0.7]} rotation={[-0.22, 0, 0]} castShadow />
        {/* Crossbar */}
        <mesh geometry={crossbarGeo} material={metalMat} position={[0, 4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow />
        {/* Left swing */}
        <mesh geometry={chainGeo} material={metalMat} position={[-1.2, 3, 0]} castShadow />
        <mesh geometry={seatGeo}  material={seatMat}  position={[-1.2, 1.9, 0]} castShadow />
        {/* Right swing */}
        <mesh geometry={chainGeo} material={metalMat} position={[1.2, 3, 0]} castShadow />
        <mesh geometry={seatGeo}  material={seatMat}  position={[1.2, 1.9, 0]} castShadow />
      </group>

      {/* Slide */}
      <group position={[3.5, 0, 0]}>
        {/* Support posts */}
        <mesh geometry={postGeo} material={metalMat} position={[-0.9, 1.3, -1.0]} castShadow />
        <mesh geometry={postGeo} material={metalMat} position={[ 0.9, 1.3, -1.0]} castShadow />
        <mesh geometry={postGeo} material={metalMat} position={[-0.9, 1.3,  1.0]} castShadow />
        <mesh geometry={postGeo} material={metalMat} position={[ 0.9, 1.3,  1.0]} castShadow />
        {/* Platform */}
        <mesh geometry={platformGeo} material={platformMat} position={[0, 2.6, -1.0]} castShadow receiveShadow />
        {/* Ramp slide */}
        <mesh geometry={rampGeo} material={slideMat} position={[0, 1.55, 0.85]} rotation={[-0.52, 0, 0]} castShadow />
        {/* Ladder rails */}
        <mesh geometry={railGeo} material={metalMat} position={[-0.36, 1.3, -2.1]} rotation={[0.35, 0, 0]} castShadow />
        <mesh geometry={railGeo} material={metalMat} position={[ 0.36, 1.3, -2.1]} rotation={[0.35, 0, 0]} castShadow />
        {/* Ladder rungs */}
        {[0, 0.65, 1.3].map((dy, i) => (
          <mesh key={i} geometry={rungGeo} material={metalMat}
            position={[0, 0.4 + dy, -2.3 + dy * 0.25]}
            rotation={[0.35, Math.PI / 2, 0]}
            castShadow />
        ))}
      </group>
    </group>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────

export function ParkProps() {
  const treePts   = useMemo(() => scatter(0x1A2B3C, 32, 14, 0.85, 1.55), [])
  const bushPts   = useMemo(() => scatter(0x4D5E6F, 28, 10, 0.7, 1.3),   [])
  const flowerPts = useMemo(() => scatter(0x7F8091, 18, 10, 0.6, 1.1),   [])
  const benchPts  = useMemo(() => [
    ...benchRing(0xBEEF01, 10),
    ...lakesideBenches(),
  ], [])

  return (
    <group name="park-props">
      {/* Greenery — existing GLBs */}
      <ModelBoundary fallback={null}>
        <GLBBatch url={TREE_URL}    targetSizeM={6}   pts={treePts}   />
      </ModelBoundary>
      <ModelBoundary fallback={null}>
        <GLBBatch url={BUSH_URL}    targetSizeM={2.2} pts={bushPts}   />
      </ModelBoundary>
      <ModelBoundary fallback={null}>
        <GLBBatch url={FLOWERS_URL} targetSizeM={1.2} pts={flowerPts} />
      </ModelBoundary>
      <ModelBoundary fallback={null}>
        <GLBBatch url={BENCH_URL}   targetSizeM={1.8} pts={benchPts}  />
      </ModelBoundary>

      {/* Landmark centerpieces — procedural geometry */}
      <Gazebo     position={[248, 0, 288]} />
      <Fountain   position={[195, 0, 255]} />
      <Playground position={[300, 0, 290]} />
    </group>
  )
}
