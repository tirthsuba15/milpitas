import { Canvas } from '@react-three/fiber'
import { Environment, Stats } from '@react-three/drei'
import { Suspense } from 'react'
import { Terrain } from './Terrain'
import { RobotFleet } from './RobotFleet'
import { Markers } from './Markers'
import { Hazards } from './Hazards'
import { Buildings } from './Buildings'
import { FogOfWar } from './FogOfWar'
import { PostProcessing } from './PostProcessing'
import { Camera } from './Camera'

export function Scene() {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }}
      camera={{ fov: 55, near: 0.5, far: 2000, position: [80, 60, 80] }}
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        {/* Environment: HDRI from public/hdri/ — smoke-filled overcast */}
        <Environment files="/hdri/kloofendal_overcast.hdr" background backgroundBlurriness={0.05} />

        {/* Single directional sun for crisp shadows */}
        <directionalLight
          position={[80, 120, -60]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={600}
          shadow-camera-left={-200}
          shadow-camera-right={200}
          shadow-camera-top={200}
          shadow-camera-bottom={-200}
        />
        <ambientLight intensity={0.2} />

        <Terrain />
        <Hazards />
        <FogOfWar />
        <Buildings />
        <RobotFleet />
        <Markers />
        <Camera />
        <PostProcessing />

        {import.meta.env.DEV && <Stats />}
      </Suspense>
    </Canvas>
  )
}
