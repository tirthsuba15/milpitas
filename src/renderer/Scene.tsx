import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Terrain } from './Terrain'
import { Ecosystem } from './Ecosystem'
import { WorldEnvironment } from './Environment'
import { CameraRig } from './CameraRig'
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
      camera={{ fov: 55, near: 0.5, far: 6000, position: [125, 120, 320] }}
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        {/* Daytime blue sky, sun + matched directional shadow light, soft
            hemisphere fill, and distance fog that blends ground into horizon. */}
        <WorldEnvironment />

        {/* Grounded world: huge grass floor to the horizon + worn sim core */}
        <Terrain />

        {/* Procedural trees / rocks / bushes / grass tufts, clustered, instanced */}
        <Ecosystem />

        <Hazards />
        <FogOfWar />
        <Buildings />
        <RobotFleet />
        <Markers />
        <PostProcessing />

        {/* Dual-mode camera: ORBIT (range-limited) + FREE ROAM (WASD, clamped).
            Renders its own bottom-docked control UI. */}
        <CameraRig />
      </Suspense>
    </Canvas>
  )
}
