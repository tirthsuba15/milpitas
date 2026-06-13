import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import {
  WORLD_SIZE_M, CENTER_X, CENTER_Z,
  CORE_MIN_X, CORE_MIN_Z, CORE_MAX_X, CORE_MAX_Z,
} from '@/simulation/grid'

// Full map extent (500 m). Single source of truth via grid.ts.
const GRID_SIZE_M = WORLD_SIZE_M

// Central disaster/work zone — a SUB-REGION of the map (world 125–375), not a
// separate slab. Rendered as a worn ground patch that blends into the suburb.
const CORE_SIZE_M = CORE_MAX_X - CORE_MIN_X
const CORE_CENTER_X = (CORE_MIN_X + CORE_MAX_X) / 2
const CORE_CENTER_Z = (CORE_MIN_Z + CORE_MAX_Z) / 2

// The whole world floor. A single huge plane sitting flush at y=0 that runs
// out to the horizon (where <fog> dissolves it into the sky). On top of it the
// central core reads slightly more worn/scorched — a work zone — but it is the
// SAME flat ground, no slab edge.
const SURROUND_SIZE_M = 3000

export function Terrain() {
  return (
    <group>
      <GrassSurround />
      <SimCore />
      <RubbleMounds />
    </group>
  )
}

/**
 * The vast grass groundplane reaching the horizon. Tiles the ground albedo at
 * a high repeat and tints it green so it reads as a healthy grass field
 * (a Roblox-baseplate-style ground sitting ON the world). Centred on the sim
 * core so the core sits in the middle of the world.
 */
function GrassSurround() {
  const [albedo, roughness] = useTexture([
    '/textures/ground_albedo.jpg',
    '/textures/ground_roughness.jpg',
  ])

  const [grassAlbedo, grassRough] = useMemo(() => {
    const a = albedo.clone()
    const r = roughness.clone()
    for (const t of [a, r]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(120, 120) // dense tiling so detail survives at the horizon
      t.anisotropy = 8
      t.needsUpdate = true
    }
    a.colorSpace = THREE.SRGBColorSpace
    return [a, r]
  }, [albedo, roughness])

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[CENTER_X, -0.02, CENTER_Z]}
      receiveShadow
    >
      <planeGeometry args={[SURROUND_SIZE_M, SURROUND_SIZE_M, 1, 1]} />
      <meshStandardMaterial
        map={grassAlbedo}
        roughnessMap={grassRough}
        // Push the warm aerial photo toward a lush daytime grass green
        color="#69873f"
        roughness={1.0}
        metalness={0.0}
      />
    </mesh>
  )
}

/**
 * The playable disaster/work zone — a sub-region centered on the map (world
 * 125–375). Same ground, sitting just a hair above the grass so it z-fights
 * nothing — a touch browner/worn to read as a trampled, scorched relief zone.
 * Soft-edged so it blends into the suburb.
 */
function SimCore() {
  const [albedo, roughness] = useTexture([
    '/textures/ground_albedo.jpg',
    '/textures/ground_roughness.jpg',
  ])

  const [coreAlbedo, coreRough] = useMemo(() => {
    const a = albedo.clone()
    const r = roughness.clone()
    for (const t of [a, r]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(14, 14)
      t.anisotropy = 8
      t.needsUpdate = true
    }
    a.colorSpace = THREE.SRGBColorSpace
    return [a, r]
  }, [albedo, roughness])

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[CORE_CENTER_X, 0.0, CORE_CENTER_Z]}
      receiveShadow
    >
      <planeGeometry args={[CORE_SIZE_M, CORE_SIZE_M, 32, 32]} />
      <meshStandardMaterial
        map={coreAlbedo}
        roughnessMap={coreRough}
        // Worn, slightly scorched earth — distinct from the lush surround grass
        color="#8a7d5f"
        roughness={1.0}
        metalness={0.0}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  )
}

function RubbleMounds() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const rubble = useTexture('/textures/rubble_albedo.jpg')
  rubble.wrapS = rubble.wrapT = THREE.RepeatWrapping
  rubble.colorSpace = THREE.SRGBColorSpace

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const dummy = new THREE.Object3D()
    const rng = (min: number, max: number) => min + Math.random() * (max - min)

    for (let i = 0; i < 120; i++) {
      // Cluster rubble in the disaster core's NW (core spans world 125–375;
      // legacy 5–90 / 5–100 offset by +125 keeps the original look, centered).
      const x = CORE_MIN_X + rng(5, 90)
      const z = CORE_MIN_Z + rng(5, 100)
      dummy.position.set(x, rng(0.2, 1.2), z)
      dummy.rotation.set(rng(-0.2, 0.2), rng(0, Math.PI * 2), rng(-0.2, 0.2))
      dummy.scale.setScalar(rng(0.4, 2.0))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 120]} castShadow receiveShadow>
      <boxGeometry args={[3, 1, 2]} />
      <meshStandardMaterial map={rubble} color="#8a7565" roughness={1} metalness={0.05} />
    </instancedMesh>
  )
}
