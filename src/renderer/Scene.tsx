import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Terrain } from './Terrain'
import { Ecosystem } from './Ecosystem'
import { WorldEnvironment } from './Environment'
import { CameraRig, CameraControlUI } from './CameraRig'
import { RobotFleet } from './RobotFleet'
import { Markers } from './Markers'
import { Hazards } from './Hazards'
import { Buildings } from './Buildings'
import { SuburbStructures } from './SuburbStructures'
import { SuburbProps } from './SuburbProps'
import { FogOfWar } from './FogOfWar'
import { PostProcessing } from './PostProcessing'

export function Scene() {
  return (
    <>
    <Canvas
      shadows
      gl={{ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }}
      camera={{ fov: 55, near: 0.5, far: 6000, position: [250, 140, 560] }}
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

        {/* Suburban set-dressing rendered from the seeded layout DATA: real GLB
            houses/civic blocks + street props (cars, lights, fences, mailboxes,
            benches). Each gets its own Suspense so a slow/failed model load can
            never block the rest of the scene. Both no-op until world is loaded. */}
        <Suspense fallback={null}>
          <SuburbStructures />
        </Suspense>
        <Suspense fallback={null}>
          <SuburbProps />
        </Suspense>

        <Hazards />
        <FogOfWar />
        <Buildings />
        <RobotFleet />
        <Markers />
        <PostProcessing />

        {/* Dual-mode camera: ORBIT (range-limited) + FREE ROAM (WASD, clamped). */}
        <CameraRig />
      </Suspense>
    </Canvas>

    {/* Camera mode toggle — plain fixed DOM overlay, OUTSIDE the canvas so it
        never moves with the 3D camera. Pinned bottom-left. */}
    <CameraControlUI />
    </>
  )
}
