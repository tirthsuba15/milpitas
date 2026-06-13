import { Sky } from '@react-three/drei'
import { CENTER_X, CENTER_Z } from '@/simulation/grid'

// World centre — the 500 m map is centred on the disaster core at (250,250);
// lighting/fog/shadow camera all reference it so the whole map is covered.
const CENTER: [number, number, number] = [CENTER_X, 0, CENTER_Z]

// Sun direction (a high, slightly-west afternoon sun for warm long shadows).
// Kept far away so the directional light reads as parallel sun rays.
const SUN_DISTANCE = 1200
const SUN_AZIMUTH = -0.7 // radians, slightly behind/left
const SUN_ELEVATION = 0.9 // radians up from horizon (~52°) — bright midday-ish
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
      {/* Bright daytime blue sky with a real sun disc */}
      <Sky
        distance={4500}
        sunPosition={SUN_POS}
        turbidity={1.8}
        rayleigh={1.4}
        mieCoefficient={0.005}
        mieDirectionalG={0.85}
      />

      {/* Soft blue-from-sky / green-from-ground ambient fill */}
      <hemisphereLight args={['#cdeaff', '#5d7038', 0.9]} />
      <ambientLight intensity={0.14} />

      {/* The sun — parallel rays, casts the scene's shadows across the map */}
      <directionalLight
        position={SUN_POS}
        intensity={2.2}
        color="#fff6e8"
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

      {/* Atmospheric haze: clear over the whole 500 m map, fading the far grass
          surround into the pale-blue horizon. Start beyond the grid corners
          (~354 m from center) so nothing on the map is washed out. */}
      <fog attach="fog" args={['#cfe2f2', 700, 2800]} />
    </>
  )
}
