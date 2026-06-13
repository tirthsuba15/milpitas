import { Canvas } from '@react-three/fiber'
import { Sky, OrbitControls, Stats } from '@react-three/drei'
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
        {/* Sky with visible sun */}
        <Sky
          sunPosition={[100, 80, -80]}
          turbidity={6}
          rayleigh={1.5}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />

        {/* Sun-matched directional light */}
        <directionalLight
          position={[100, 80, -80]}
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
        {/* Sky-bounce fill light — blue from above, green from ground */}
        <hemisphereLight args={['#87ceeb', '#4a7c3f', 0.5]} />
        <ambientLight intensity={0.15} />

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

        {import.meta.env.DEV && <Stats />}
      </Suspense>
    </Canvas>
  )
}
