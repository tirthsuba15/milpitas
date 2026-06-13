import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { Plane } from '@react-three/drei'

const GRID_SIZE_M = 250

export function Terrain() {
  return (
    <group>
      <GroundPlane />
      <RubbleMounds />
    </group>
  )
}

function GroundPlane() {
  return (
    <Plane
      args={[GRID_SIZE_M, GRID_SIZE_M, 64, 64]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[GRID_SIZE_M / 2, 0, GRID_SIZE_M / 2]}
      receiveShadow
    >
      <meshStandardMaterial
        color="#4a7c3f"
        roughness={0.9}
        metalness={0.0}
      />
    </Plane>
  )
}

function RubbleMounds() {
  const meshRef = useRef<THREE.InstancedMesh>(null)

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
      <meshStandardMaterial color="#7a6050" roughness={1} metalness={0.05} />
    </instancedMesh>
  )
}
