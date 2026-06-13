import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats, Environment } from '@react-three/drei'
import { Suspense } from 'react'
import { Terrain } from './Terrain'
import { RobotFleet } from './RobotFleet'
import { Markers } from './Markers'
import { Hazards } from './Hazards'
import { Buildings } from './Buildings'
import { FogOfWar } from './FogOfWar'
import { PostProcessing } from './PostProcessing'
import { Camera } from './Camera'
import { useWorldStore } from '@/store/worldStore'

export function Scene() {
  const isRunning = useWorldStore(s => s.isRunning)

  return (
    <Canvas
      shadows
      gl={{ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }}
      camera={{ fov: 55, near: 0.5, far: 2000, position: [125, 120, 280] }}
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        {/* HDRI environment — ambient IBL + cinematic overcast sky background */}
        <Environment
          preset="sunset"
          background
          backgroundBlurriness={0.06}
        />

        {/* Sun directional light for crisp shadows */}
        <directionalLight
          position={[100, 80, -80]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={600}
          shadow-camera-left={-200}
          shadow-camera-right={200}
          shadow-camera-top={200}
          shadow-camera-bottom={-200}
        />
        {/* Warm fill from below — simulates fire-lit ground glow in disaster zone */}
        <hemisphereLight args={['#8ab0cc', '#6b4a2a', 0.25]} />

        <Terrain />
        <Hazards />
        <FogOfWar />
        <Buildings />
        <RobotFleet />
        <Markers />
        <PostProcessing />

        {/* Scripted cinematic camera during the demo; free orbit before START */}
        {isRunning ? (
          <Camera />
        ) : (
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
        )}

        {import.meta.env.DEV && <Stats />}
      </Suspense>
    </Canvas>
  )
}
