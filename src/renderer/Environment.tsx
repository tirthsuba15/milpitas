import { Suspense } from 'react'
import { Environment, Sky } from '@react-three/drei'
import { CENTER_X, CENTER_Z } from '@/simulation/grid'

// World centre — the 500 m map is centred on the disaster core at (250,250);
// lighting/fog/shadow camera all reference it so the whole map is covered.
const CENTER: [number, number, number] = [CENTER_X, 0, CENTER_Z]

// Sun direction (a high, slightly-west afternoon sun for warm long shadows).
// Kept far away so the directional light reads as parallel sun rays.
const SUN_DISTANCE = 1200
const SUN_AZIMUTH = -0.7 // radians, slightly behind/left
const SUN_ELEVATION = 1.05 // radians up from horizon (~60°) — high bright midday sun
const SUN_POS: [number, number, number] = [
  CENTER[0] + Math.cos(SUN_ELEVATION) * Math.cos(SUN_AZIMUTH) * SUN_DISTANCE,
  Math.sin(SUN_ELEVATION) * SUN_DISTANCE,
  CENTER[2] + Math.cos(SUN_ELEVATION) * Math.sin(SUN_AZIMUTH) * SUN_DISTANCE,
]

/**
 * Daytime outdoor lighting + sky, tuned for the 500 m map.
 *
 * - drei <Sky> renders a believable physically-based blue dome with a sun disc.
 *   turbidity/rayleigh kept low → a clean, saturated blue rather than a hazy
 *   white horizon, so the bigger sky reads as a bright clear day.
 * - A single <directionalLight castShadow> aligned to the sun gives crisp
 *   shadows; the shadow camera is widened to cover the full 500 m map centred
 *   on (250,250) so suburb + core both receive shadows.
 * - <hemisphereLight> fills shadows with sky-blue from above / grass-green
 *   bounce from below so nothing reads as pure black.
 * - Distance <fog> sits well beyond the 500 m grid (starts ~520 m) so the whole
 *   playable map stays crisp and the horizon is visible, then dissolves the far
 *   grass surround into the sky — no soupy near haze, no hard ground edge.
 *
 * This component OWNS all scene lights + sky; nothing else should add lights.
 */
export function WorldEnvironment() {
  return (
    <>
      {/* Bright clear-day blue sky with a real sun disc. turbidity=1.0 keeps
          the sky a deep saturated blue with no milky haze; rayleigh=1.2 gives
          a rich Rayleigh scattering gradient from zenith to horizon. Low
          mieCoefficient so the sun corona stays tight and the air reads clear. */}
      <Sky
        distance={4500}
        sunPosition={SUN_POS}
        turbidity={1.0}
        rayleigh={1.2}
        mieCoefficient={0.003}
        mieDirectionalG={0.88}
      />

      {/* Image-based reflections only (NOT background — the <Sky> stays the
          backdrop). A "park" preset matches a bright sunny day and gives
          metal/glass surfaces real reflections. Loaded from drei's CDN, wrapped
          in <Suspense> so a load hiccup can never black-screen the canvas.
          Modest intensity so it adds sparkle without washing out the sky. */}
      <Suspense fallback={null}>
        <Environment preset="park" background={false} environmentIntensity={0.45} />
      </Suspense>

      {/* Soft blue-from-sky / green-from-ground ambient fill, brighter so
          shadowed faces stay open rather than crushing to black.
          Sky colour boosted slightly for a crisp midday read. */}
      <hemisphereLight args={['#c8e8ff', '#6a7d45', 1.3]} />
      <ambientLight intensity={0.25} />

      {/* The sun — parallel rays, casts the scene's shadows across the map */}
      <directionalLight
        position={SUN_POS}
        intensity={3.6}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
        shadow-camera-near={1}
        shadow-camera-far={2200}
        shadow-camera-left={-320}
        shadow-camera-right={320}
        shadow-camera-top={320}
        shadow-camera-bottom={-320}
        target-position={CENTER}
      />

      {/* Atmospheric haze: city stays fully crisp (near=800, well beyond the
          ~354 m grid-corner radius), far=1500 dissolves the trimmed surround
          edge (~650 m from centre) into the sky-matched horizon colour.
          Fog colour matches the pale daytime horizon of the Sky shader so the
          ground fades smoothly into sky with no visible hard edge or void. */}
      <fog attach="fog" args={['#c4dcf2', 800, 1500]} />
    </>
  )
}
