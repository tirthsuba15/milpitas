import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useWorldStore } from '@/store/worldStore'
import { CELL_SIZE_M, isCoreCell, makeRng } from '@/simulation/grid'
import { ModelBoundary } from './ModelBoundary'
import type { WorldState, ZoneType } from '@/types'

/**
 * SuburbProps — deterministic street set-dressing scattered over the suburb:
 * parked cars + streetlights along roads, fence segments around some yards,
 * and occasional mailboxes / benches near house fronts and sidewalks.
 *
 * Everything is seeded from world.suburb.seed so the dressing is identical every
 * run, and nothing is placed inside the disaster core (that's the live work
 * zone). The road asphalt and hedges are the ground/ecosystem agent's domain —
 * we only add the prop objects.
 *
 * Performance: each prop type is one cloned-and-scaled GLB reused across all of
 * its placements. Props are tiny low-poly models and counts are capped, so total
 * object count stays modest and frame-time-friendly. (Targeting real-world
 * dimensions per prop rather than per-footprint, since props are sub-cell.)
 */

const MODELS = {
  car1: '/models/street/car_sedan.glb',
  car2: '/models/street/car_sedan2.glb',
  streetlight: '/models/street/streetlight.glb',
  fence: '/models/street/fence.glb',
  fenceMetal: '/models/street/fence_metal.glb',
  bench: '/models/street/bench.glb',
  mailbox: '/models/street/mailbox.glb',
} as const
type ModelKey = keyof typeof MODELS

// Target real-world size (meters) along the model's largest horizontal axis, so
// every kit's arbitrary units get normalized to a believable scale.
const TARGET_SIZE_M: Record<ModelKey, number> = {
  car1: 4.4,
  car2: 4.4,
  streetlight: 5.0, // height-driven, but we normalize by max dim → tall & thin
  fence: CELL_SIZE_M, // one segment spans ~one cell
  fenceMetal: CELL_SIZE_M,
  bench: 1.8,
  mailbox: 1.1,
}

interface PropFit {
  scene: THREE.Object3D
  scale: number
  yOffset: number
}

/** Load a prop, recenter horizontally, normalize to TARGET_SIZE_M, seat on ground. */
function usePropFit(key: ModelKey): PropFit {
  const { scene } = useGLTF(MODELS[key])
  return useMemo(() => {
    const root = scene.clone(true)
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    const box = new THREE.Box3().setFromObject(root)
    const size = new THREE.Vector3()
    box.getSize(size)
    const center = new THREE.Vector3()
    box.getCenter(center)
    root.position.x -= center.x
    root.position.z -= center.z
    const maxDim = Math.max(size.x, size.z) || 1
    const scale = TARGET_SIZE_M[key] / maxDim
    const yOffset = -box.min.y * scale
    return { scene: root, scale, yOffset }
  }, [scene, key])
}

interface Placement {
  x: number
  z: number
  rotY: number
}

/**
 * One instanced batch of a prop. Uses <instancedMesh> per mesh in the (usually
 * single-mesh) low-poly prop for speed. Falls back to primitive clones when the
 * model has multiple meshes/materials, which is rare for these props.
 */
function PropBatch({ modelKey, placements }: { modelKey: ModelKey; placements: Placement[] }) {
  const fit = usePropFit(modelKey)

  // Collect mesh parts so we can instance each (geometry, material) pair.
  const parts = useMemo(() => {
    const out: { geo: THREE.BufferGeometry; mat: THREE.Material | THREE.Material[]; local: THREE.Matrix4 }[] = []
    fit.scene.updateWorldMatrix(true, true)
    fit.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && m.geometry) {
        // local transform relative to the fit root (captures recenter offset)
        out.push({ geo: m.geometry, mat: m.material, local: m.matrixWorld.clone() })
      }
    })
    return out
  }, [fit.scene])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  return (
    <group>
      {parts.map((part, pi) => (
        <instancedMesh
          key={pi}
          args={[part.geo, part.mat as THREE.Material, placements.length]}
          castShadow
          receiveShadow
          ref={(mesh) => {
            if (!mesh) return
            const base = new THREE.Matrix4()
            for (let i = 0; i < placements.length; i++) {
              const p = placements[i]
              base.compose(
                new THREE.Vector3(p.x, fit.yOffset, p.z),
                new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.rotY, 0)),
                new THREE.Vector3(fit.scale, fit.scale, fit.scale),
              )
              // apply the part's local (recentered) transform within the model
              dummy.matrix.copy(base).multiply(part.local)
              mesh.setMatrixAt(i, dummy.matrix)
            }
            mesh.instanceMatrix.needsUpdate = true
            mesh.computeBoundingSphere()
          }}
        />
      ))}
    </group>
  )
}

/**
 * PropBatch wrapped in an error boundary. Props are pure set-dressing, so if a
 * single prop GLB fails to load we simply skip that batch (no-op fallback)
 * rather than let it crash the suburb — the scene reads fine without it.
 */
function GuardedPropBatch({ modelKey, placements }: { modelKey: ModelKey; placements: Placement[] }) {
  return (
    <ModelBoundary fallback={null}>
      <PropBatch modelKey={modelKey} placements={placements} />
    </ModelBoundary>
  )
}

// ── Placement planning (deterministic, seeded) ───────────────────────────────

function cellCenter(cx: number, cz: number): [number, number] {
  return [cx * CELL_SIZE_M + CELL_SIZE_M / 2, cz * CELL_SIZE_M + CELL_SIZE_M / 2]
}

function zoneAt(world: WorldState, x: number, z: number): ZoneType | null {
  if (x < 0 || z < 0 || z >= world.grid.length || x >= world.grid[0].length) return null
  return world.grid[z][x].zone
}

interface PlanResult {
  cars: Placement[]
  lights: Placement[]
  fences: Placement[]
  fencesMetal: Placement[]
  mailboxes: Placement[]
  benches: Placement[]
}

function planProps(world: WorldState): PlanResult {
  const rng = makeRng(world.suburb.seed ^ 0x5151)
  const cars: Placement[] = []
  const lights: Placement[] = []
  const fences: Placement[] = []
  const fencesMetal: Placement[] = []
  const mailboxes: Placement[] = []
  const benches: Placement[] = []

  const H = world.grid.length
  const W = world.grid[0].length

  // Whether a road cell has an adjacent house/yard (so we only dress lived-in streets).
  const nearHomes = (x: number, z: number): boolean => {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        const zn = zoneAt(world, x + dx, z + dz)
        if (zn === 'house_lot' || zn === 'yard' || zn === 'civic') return true
      }
    }
    return false
  }

  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      if (isCoreCell(x, z)) continue
      const zone = world.grid[z][x].zone
      const [wx, wz] = cellCenter(x, z)

      if (zone === 'road') {
        const horizontal = zoneAt(world, x - 1, z) === 'road' || zoneAt(world, x + 1, z) === 'road'
        const along = horizontal ? 0 : Math.PI / 2 // car faces along the street

        // Streetlights at regular intervals along roads (every ~4 cells = 20 m).
        if (((x + z) % 4 === 0) && nearHomes(x, z)) {
          // push the lamp to the curb edge, not the center line
          const off = CELL_SIZE_M * 0.42
          lights.push({
            x: wx + (horizontal ? 0 : off),
            z: wz + (horizontal ? off : 0),
            rotY: rng() * Math.PI * 2,
          })
        }

        // Occasional parked cars at the curb near homes.
        if (nearHomes(x, z) && rng() < 0.16) {
          const off = CELL_SIZE_M * 0.28
          cars.push({
            x: wx + (horizontal ? 0 : off),
            z: wz + (horizontal ? off : 0),
            rotY: along + (rng() < 0.5 ? 0 : Math.PI),
          })
        }
      }

      if (zone === 'sidewalk') {
        // Mailboxes & benches occasionally on sidewalks that border yards.
        const bordersYard =
          zoneAt(world, x - 1, z) === 'yard' || zoneAt(world, x + 1, z) === 'yard' ||
          zoneAt(world, x, z - 1) === 'yard' || zoneAt(world, x, z + 1) === 'yard'
        if (bordersYard && rng() < 0.18) {
          mailboxes.push({ x: wx, z: wz, rotY: rng() * Math.PI * 2 })
        } else if (rng() < 0.04) {
          benches.push({ x: wx, z: wz, rotY: rng() * Math.PI * 2 })
        }
      }

      if (zone === 'yard') {
        // Fence segments on yard cells that border a road/sidewalk (front-yard fence).
        const edgeDir =
          (zoneAt(world, x, z - 1) === 'road' || zoneAt(world, x, z - 1) === 'sidewalk') ? 0 :
          (zoneAt(world, x, z + 1) === 'road' || zoneAt(world, x, z + 1) === 'sidewalk') ? Math.PI :
          (zoneAt(world, x - 1, z) === 'road' || zoneAt(world, x - 1, z) === 'sidewalk') ? Math.PI / 2 :
          (zoneAt(world, x + 1, z) === 'road' || zoneAt(world, x + 1, z) === 'sidewalk') ? Math.PI / 2 :
          null
        if (edgeDir !== null && rng() < 0.5) {
          // civic yards get metal fence; residential gets wood
          const isCivicYard =
            zoneAt(world, x - 1, z) === 'civic' || zoneAt(world, x + 1, z) === 'civic' ||
            zoneAt(world, x, z - 1) === 'civic' || zoneAt(world, x, z + 1) === 'civic'
          const place = { x: wx, z: wz, rotY: edgeDir }
          if (isCivicYard) fencesMetal.push(place)
          else fences.push(place)
        }
      }
    }
  }

  // Safety caps to keep object counts bounded.
  return {
    cars: cars.slice(0, 120),
    lights: lights.slice(0, 260),
    fences: fences.slice(0, 600),
    fencesMetal: fencesMetal.slice(0, 120),
    mailboxes: mailboxes.slice(0, 160),
    benches: benches.slice(0, 60),
  }
}

export function SuburbProps() {
  const world = useWorldStore((s) => s.world)
  const plan = useMemo(() => (world ? planProps(world) : null), [world])

  if (!world || !plan) return null

  // Split cars across the two sedan models for variety, deterministically.
  const cars1 = plan.cars.filter((_, i) => i % 2 === 0)
  const cars2 = plan.cars.filter((_, i) => i % 2 === 1)

  return (
    <group name="suburb-props">
      {cars1.length > 0 && <GuardedPropBatch modelKey="car1" placements={cars1} />}
      {cars2.length > 0 && <GuardedPropBatch modelKey="car2" placements={cars2} />}
      {plan.lights.length > 0 && <GuardedPropBatch modelKey="streetlight" placements={plan.lights} />}
      {plan.fences.length > 0 && <GuardedPropBatch modelKey="fence" placements={plan.fences} />}
      {plan.fencesMetal.length > 0 && <GuardedPropBatch modelKey="fenceMetal" placements={plan.fencesMetal} />}
      {plan.mailboxes.length > 0 && <GuardedPropBatch modelKey="mailbox" placements={plan.mailboxes} />}
      {plan.benches.length > 0 && <GuardedPropBatch modelKey="bench" placements={plan.benches} />}
    </group>
  )
}

Object.values(MODELS).forEach((url) => useGLTF.preload(url))
