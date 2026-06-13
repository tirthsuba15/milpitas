import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

const GRID_SIZE_M = 250
const CENTER_X = GRID_SIZE_M / 2
const CENTER_Z = GRID_SIZE_M / 2

// The whole world floor. A single huge plane sitting flush at y=0 that runs
// out to the horizon (where <fog> dissolves it into the sky). On top of it the
// sim core (0–250 in x/z) reads slightly more worn/scorched — a work zone —
// but it is the SAME flat ground, no slab edge.
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
 * The playable disaster/work zone (0–250 in x & z). Same ground, sitting just
 * a hair above the grass so it z-fights nothing — a touch browner/worn to read
 * as a trampled, scorched relief zone. Soft-edged so it blends into the grass.
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
      position={[CENTER_X, 0.0, CENTER_Z]}
      receiveShadow
    >
      <planeGeometry args={[GRID_SIZE_M, GRID_SIZE_M, 32, 32]} />
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
      // Cluster rubble in the disaster zone (northwest)
      const x = rng(5, 90)
      const z = rng(5, 100)
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
