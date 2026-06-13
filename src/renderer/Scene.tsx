import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'
import { Terrain } from './Terrain'
import { RobotFleet } from './RobotFleet'
import { Markers } from './Markers'
import { Hazards } from './Hazards'
import { Buildings } from './Buildings'
import { FogOfWar } from './FogOfWar'
import { PostProcessing } from './PostProcessing'

export function Scene() {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }}
      camera={{ fov: 55, near: 0.5, far: 2000, position: [125, 120, 280] }}
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        {/* Environment: HDRI from public/hdri/ — drives image-based lighting
            AND renders as the sky. This is the photoreal disaster-zone mood. */}
        <Environment files="/hdri/kloofendal_overcast.hdr" background backgroundBlurriness={0.04} />

        {/* Single directional sun for crisp shadows on top of the HDRI fill */}
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
        <PostProcessing />

        {/* Camera controls — scroll to zoom, drag to orbit, right-click to pan */}
        <OrbitControls
          target={[125, 0, 125]}
          minDistance={20}
          maxDistance={500}
          maxPolarAngle={Math.PI / 2.1}
          enablePan
          enableZoom
          enableRotate
          zoomSpeed={1.2}
          panSpeed={1.0}
        />
      </Suspense>
    </Canvas>
  )
}
