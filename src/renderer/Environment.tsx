import { Sky } from '@react-three/drei'

// World centre — the sim core sits at [125,0,125]; lighting/fog reference it.
const CENTER: [number, number, number] = [125, 0, 125]

// Sun direction (a high, slightly-west afternoon sun for warm long shadows).
// Kept far away so the directional light reads as parallel sun rays.
const SUN_DISTANCE = 900
const SUN_AZIMUTH = -0.7 // radians, slightly behind/left
const SUN_ELEVATION = 0.85 // radians up from horizon (~49°) — bright daytime
const SUN_POS: [number, number, number] = [
  CENTER[0] + Math.cos(SUN_ELEVATION) * Math.cos(SUN_AZIMUTH) * SUN_DISTANCE,
  Math.sin(SUN_ELEVATION) * SUN_DISTANCE,
  CENTER[2] + Math.cos(SUN_ELEVATION) * Math.sin(SUN_AZIMUTH) * SUN_DISTANCE,
]

/**
 * Daytime outdoor lighting + sky.
 *
 * - drei <Sky> renders a bright physically-based blue dome with a sun disc.
 * - A single <directionalLight castShadow> aligned to the sun gives crisp
 *   ground/object shadows (the shadow camera is centred on the sim core).
 * - <hemisphereLight> fills shadows with sky-blue from above / grass-green
 *   bounce from below so nothing reads as pure black — the "outdoors" feel.
 * - Distance <fog> fades the giant ground into the sky at the horizon so the
 *   surround never shows a hard edge.
 */
export function WorldEnvironment() {
  return (
    <>
      {/* Bright daytime blue sky with a real sun disc */}
      <Sky
        distance={4500}
        sunPosition={SUN_POS}
        turbidity={2.2}
        rayleigh={1.1}
        mieCoefficient={0.006}
        mieDirectionalG={0.8}
      />

      {/* Soft blue-from-sky / green-from-ground ambient fill */}
      <hemisphereLight args={['#bfe3ff', '#5a6b3a', 0.85]} />
      <ambientLight intensity={0.12} />

      {/* The sun — parallel rays, casts the scene's shadows */}
      <directionalLight
        position={SUN_POS}
        intensity={2.1}
        color="#fff6e8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-near={1}
        shadow-camera-far={1400}
        shadow-camera-left={-260}
        shadow-camera-right={260}
        shadow-camera-top={260}
        shadow-camera-bottom={-260}
        target-position={CENTER}
      />

      {/* Atmospheric haze — blends the far ground into the sky at the horizon.
          Colour matches the pale-blue sky near the horizon line. */}
      <fog attach="fog" args={['#cfe2f2', 900, 2600]} />
    </>
  )
}
