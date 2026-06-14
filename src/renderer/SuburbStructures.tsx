import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useWorldStore } from '@/store/worldStore'
import { CELL_SIZE_M, isCoreCell } from '@/simulation/grid'
import { ModelBoundary } from './ModelBoundary'
import type { PlacedStructure, StructureType } from '@/types'

/**
 * SuburbStructures — renders every house / civic block in
 * world.suburb.structures as a real GLB model, scale-normalized and seated on
 * the ground.
 *
 * GLBs come from many different sources with wildly different native units, so
 * for each unique model we measure its bounding box once and compute a uniform
 * scale that makes the building footprint ≈ footprintCells * CELL_SIZE_M (minus
 * a small yard margin). We also lift the model so its min-y rests on y=0.
 *
 * Performance: each placement is a cheap `<primitive>` clone of a shared,
 * drei-cached gltf scene (geometry + materials are reused across clones — only
 * the scene-graph wrapper is duplicated). With ~100 low-poly homes this stays
 * well within frame budget and keeps the code robust against the nested,
 * multi-material scene graphs these kits ship with (true GPU instancing of
 * arbitrary glTF hierarchies is brittle and not worth it at this count).
 */

// ── Model catalog ────────────────────────────────────────────────────────────
const MODELS = {
  house: '/models/building/house.glb',
  house2: '/models/building/house2.glb',
  house3: '/models/building/house3.glb',
  twostory: '/models/building/house_twostory.glb',
  cottage: '/models/building/cottage.glb',
  townhouse: '/models/building/townhouse.glb',
} as const
type ModelKey = keyof typeof MODELS

// StructureType → candidate models (varied by a stable per-structure hash).
const TYPE_MODELS: Record<StructureType, ModelKey[]> = {
  house_small: ['house2', 'house3', 'cottage', 'twostory'],
  house_medium: ['house', 'townhouse'],
  house_large: ['townhouse'],
  civic_block: ['townhouse'], // scaled up below for a civic-sized footprint
}

// Fraction of the lot the building body should fill (rest reads as yard margin).
const FOOTPRINT_FILL = 0.72
// Civic blocks read better a bit taller / bulkier than a normal home.
const CIVIC_EXTRA_SCALE = 1.15

// Stable hash so model choice & jitter are identical every render.
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

function pickModel(st: PlacedStructure): ModelKey {
  const candidates = TYPE_MODELS[st.type]
  const idx = Math.floor(hashStr(st.id) * candidates.length) % candidates.length
  return candidates[idx]
}

interface ModelFit {
  scene: THREE.Object3D
  /** native size of the model along X / Z (max horizontal footprint dim) */
  baseFootprint: number
  /** native min-y after centering on origin in XZ */
  minY: number
}

/**
 * Load a model, recenter it horizontally on the origin, and measure the data
 * needed to normalize scale + seat it on the ground. Cached per model URL.
 */
function useModelFit(url: string): ModelFit {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    const root = scene.clone(true)
    // shadows on every mesh
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
    // Recenter horizontally so rotation pivots about the building center.
    root.position.x -= center.x
    root.position.z -= center.z
    const baseFootprint = Math.max(size.x, size.z) || 1
    return { scene: root, baseFootprint, minY: box.min.y }
  }, [scene])
}

function StructureModel({ st }: { st: PlacedStructure }) {
  const modelKey = pickModel(st)
  const fit = useModelFit(MODELS[modelKey])

  // Footprint center in world meters. gridX/gridZ is the footprint ORIGIN
  // (top-left), so the center is offset by half the footprint.
  const half = (st.footprintCells * CELL_SIZE_M) / 2
  const wx = st.gridX * CELL_SIZE_M + half
  const wz = st.gridZ * CELL_SIZE_M + half

  // Normalize scale so building body ≈ footprint * fill.
  const targetFootprint =
    st.footprintCells * CELL_SIZE_M * FOOTPRINT_FILL *
    (st.type === 'civic_block' ? CIVIC_EXTRA_SCALE : 1)
  const scale = targetFootprint / fit.baseFootprint

  // Seat on ground: after scaling, min-y must land at 0.
  const yOffset = -fit.minY * scale

  const instance = useMemo(() => fit.scene.clone(true), [fit.scene])

  return (
    <group
      position={[wx, yOffset, wz]}
      rotation={[0, THREE.MathUtils.degToRad(st.rotationDeg), 0]}
      scale={scale}
    >
      <primitive object={instance} />
    </group>
  )
}

/**
 * Placeholder for a structure whose GLB failed to load: a neutral house-colored
 * box roughly the size of the lot footprint, seated on the ground. Keeps the
 * suburb readable instead of leaving a hole where the model would be.
 */
function StructureFallback({ st }: { st: PlacedStructure }) {
  const half = (st.footprintCells * CELL_SIZE_M) / 2
  const wx = st.gridX * CELL_SIZE_M + half
  const wz = st.gridZ * CELL_SIZE_M + half

  // Match the same body footprint the real model targets, with a plausible height.
  const footprint =
    st.footprintCells * CELL_SIZE_M * FOOTPRINT_FILL *
    (st.type === 'civic_block' ? CIVIC_EXTRA_SCALE : 1)
  const height = st.type === 'civic_block' ? footprint * 1.1 : footprint * 0.8

  return (
    <mesh
      position={[wx, height / 2, wz]}
      rotation={[0, THREE.MathUtils.degToRad(st.rotationDeg), 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[footprint, height, footprint]} />
      <meshStandardMaterial color="#c8bfb0" roughness={0.9} metalness={0} />
    </mesh>
  )
}

export function SuburbStructures() {
  const world = useWorldStore((s) => s.world)

  const structures = useMemo(() => {
    if (!world) return []
    // Guardrail: never render a structure whose footprint enters the core.
    return world.suburb.structures.filter((st) => {
      for (let dz = 0; dz < st.footprintCells; dz++) {
        for (let dx = 0; dx < st.footprintCells; dx++) {
          if (isCoreCell(st.gridX + dx, st.gridZ + dz)) return false
        }
      }
      return true
    })
  }, [world])

  if (!world) return null

  return (
    <group name="suburb-structures">
      {structures.map((st) => (
        <ModelBoundary key={st.id} fallback={<StructureFallback st={st} />}>
          <StructureModel st={st} />
        </ModelBoundary>
      ))}
    </group>
  )
}

// Preload every house model so first paint doesn't pop.
Object.values(MODELS).forEach((url) => useGLTF.preload(url))
