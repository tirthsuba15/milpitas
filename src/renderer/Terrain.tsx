import { useRef } from 'react'
import { RepeatWrapping } from 'three'
import { useTexture, Plane } from '@react-three/drei'

// PBR textures from Poly Haven (drop in public/textures/)
// Required: ground_albedo.jpg, ground_normal.jpg, ground_roughness.jpg, ground_ao.jpg
// Plus rubble variants: rubble_albedo.jpg, rubble_normal.jpg, rubble_roughness.jpg

const GRID_SIZE_M = 250  // 50 cells × 5m

export function Terrain() {
  return (
    <group>
      <GroundPlane />
      <RubbleMounds />
    </group>
  )
}

function GroundPlane() {
  // TODO (Visual Lead P2): load PBR textures and apply with repeat(8,8)
  // const [albedo, normal, roughness, ao] = useTexture([...])
  return (
    <Plane
      args={[GRID_SIZE_M, GRID_SIZE_M, 128, 128]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[GRID_SIZE_M / 2, 0, GRID_SIZE_M / 2]}
      receiveShadow
    >
      <meshStandardMaterial
        color="#3d2b1f"
        roughness={0.95}
        metalness={0.0}
        // normalMap={normal}
        // normalScale={[1.5, 1.5]}
      />
    </Plane>
  )
}

function RubbleMounds() {
  // TODO (Visual Lead P2): replace with InstancedMesh using rubble PBR material
  // 200 instances of scaled/rotated box primitives
  const positions: [number, number, number][] = [
    [40,1,60],[70,0.5,50],[90,1.2,80],[50,0.8,100],[110,0.7,60],
    [30,1.5,45],[80,0.6,110],[60,1,130],[95,1.1,35],[45,0.9,85],
  ]

  return (
    <group>
      {positions.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, i * 0.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[4 + (i % 3), 1 + (i % 2), 3 + (i % 4)]} />
          <meshStandardMaterial color="#5a4030" roughness={1} metalness={0.05} />
        </mesh>
      ))}
    </group>
  )
}
