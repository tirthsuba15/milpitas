import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useWorldStore } from '@/store/worldStore'
import type { BuildSite, MaterialChoice } from '@/types'
import { seededRng, makeGableRoof, smoothstep } from './houseGeometry'

// Tint walls by material so the timber→recycled switch is visible in the world (P1-1).
// Variation only ever scales brightness/roughness — never hue — so this tint stays legible.
// Tones are kept light/warm so the rebuilds read as fresh "modern modular" homes that
// sit in the same palette family as the warm-timber suburb GLBs (FIX 8) rather than
// flat saturated boxes.
const MATERIAL_WALL: Record<MaterialChoice, { incomplete: string; complete: string }> = {
  imported_timber: { incomplete: '#cdb89a', complete: '#dccba8' },
  salvaged_timber:  { incomplete: '#aeb392', complete: '#c1c5a4' },
  recycled_panels:  { incomplete: '#a6b1ab', complete: '#bcc6c0' },
}

// Warm, matte clay-tile roof family shared with the suburb roofs — desaturated so it
// reads as a real roof rather than a saturated lid.
const ROOF_INCOMPLETE = '#a98a6e'
const ROOF_COMPLETE = '#8a5236'

// Trim / accent woodwork — a single warm timber tone tying the build details together.
const TRIM_TIMBER = '#7a5a3c'

// Cross-fade windows for a detail element: opacity (transparent material) + a gentle
// scale-up so it grows in like the wall instead of popping (FIX 10).
function FadeMaterialProps(fade: number) {
  return { transparent: true, opacity: fade } as const
}

export function Buildings() {
  const world = useWorldStore(s => s.world)
  if (!world) return null

  return (
    <group>
      {world.buildSites.map(site => (
        <House key={site.id} site={site} />
      ))}
    </group>
  )
}

function House({ site }: { site: BuildSite }) {
  // Back-compat: absent footprint → default 8×8 axis-aligned lot (Phase B supplies real footprints).
  const fp = site.footprint ?? { width: 8, depth: 8, rotationY: 0 }
  const W = fp.width
  const D = fp.depth
  const halfW = W / 2
  const halfD = D / 2

  const progress = site.modulesRequired > 0 ? site.modulesComplete / site.modulesRequired : 0
  const wallHeight = Math.max(0.05, progress * 5)
  const isComplete = site.status === 'complete'
  const isActive = site.status === 'active'

  // Stable per-house variation (brightness / roughness / chimney / roof pitch) seeded by id.
  const v = useMemo(() => {
    const r = seededRng(site.id)
    return { light: 0.92 + r() * 0.14, rough: 0.66 + r() * 0.16, chimney: r() > 0.45, ridge: D * 0.42 }
  }, [site.id, D])

  const mat = MATERIAL_WALL[site.materialChoice] ?? MATERIAL_WALL.imported_timber
  const wallColor = useMemo(
    () => new THREE.Color(isComplete ? mat.complete : mat.incomplete).multiplyScalar(v.light),
    [isComplete, mat.complete, mat.incomplete, v.light],
  )
  const roofColor = isComplete ? ROOF_COMPLETE : ROOF_INCOMPLETE
  const roofGeom = useMemo(() => makeGableRoof(W, D, v.ridge, 0.7), [W, D, v.ridge])

  // ── FIX 10: ease each stage-gated detail in over a small progress window ──────
  // smoothstep gives an opacity (transparent fade) AND drives a subtle scale-up so
  // details grow in like the wall instead of snapping on at a hard threshold.
  const winFade = smoothstep(0.35, 0.45, progress)
  const doorFade = smoothstep(0.55, 0.65, progress)
  const roofFade = smoothstep(0.65, 0.8, progress)
  // 0.85→1 scale ramp: enough to read as "growing in", not so much it looks like a glitch.
  const winScale = 0.85 + winFade * 0.15
  const doorScale = 0.85 + doorFade * 0.15
  const roofScale = 0.85 + roofFade * 0.15

  const winY = Math.min(wallHeight * 0.58, wallHeight - 0.6) + 0.16
  const doorH = Math.min(wallHeight * 0.7, 2.3)

  return (
    <group position={[site.position.x, 0, site.position.z]} rotation={[0, fp.rotationY, 0]}>
      {/* Concrete pad — the slab the modular home is dropped onto */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[W + 1.2, 0.12, D + 1.2]} />
        <meshStandardMaterial color="#bdb4a6" roughness={0.98} metalness={0} />
      </mesh>
      {/* Foundation plinth — a slightly darker base course under the walls */}
      <mesh position={[0, 0.24, 0]} receiveShadow castShadow>
        <boxGeometry args={[W + 0.4, 0.36, D + 0.4]} />
        <meshStandardMaterial color="#8f8579" roughness={0.9} metalness={0} />
      </mesh>

      {/* Walls — grow with progress */}
      {progress > 0 && (
        <mesh position={[0, wallHeight / 2 + 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[W, wallHeight, D]} />
          <meshStandardMaterial color={wallColor} roughness={v.rough} metalness={0} />
        </mesh>
      )}

      {/* Corner trim posts — a cheap bevel/trim hint that reads as deliberate framing.
          Fade/grow in alongside the walls so a half-built shell still looks framed. */}
      {progress > 0.05 && wallHeight > 0.4 && (
        <group position={[0, wallHeight / 2 + 0.4, 0]}>
          {([[halfW, halfD], [halfW, -halfD], [-halfW, halfD], [-halfW, -halfD]] as const).map(
            ([cx, cz], i) => (
              <mesh key={i} position={[cx, 0, cz]} castShadow>
                <boxGeometry args={[0.18, wallHeight, 0.18]} />
                <meshStandardMaterial color={TRIM_TIMBER} roughness={0.7} metalness={0} />
              </mesh>
            ),
          )}
        </group>
      )}

      {/* Framed windows — fade + scale in across 35–45% (once walls are tall enough) */}
      {winFade > 0.001 && wallHeight > 1.2 && (
        <group position={[0, winY, 0]} scale={winScale}>
          <Window pos={[halfW, 0, -halfD * 0.45]} rotY={Math.PI / 2} lit={isComplete} fade={winFade} />
          <Window pos={[halfW, 0, halfD * 0.45]} rotY={Math.PI / 2} lit={isComplete} fade={winFade} />
          <Window pos={[-halfW, 0, -halfD * 0.45]} rotY={-Math.PI / 2} lit={isComplete} fade={winFade} />
          <Window pos={[-halfW, 0, halfD * 0.45]} rotY={-Math.PI / 2} lit={isComplete} fade={winFade} />
          <Window pos={[halfW * 0.5, 0, halfD]} rotY={0} lit={isComplete} fade={winFade} />
          <Window pos={[-halfW * 0.45, 0, -halfD]} rotY={Math.PI} lit={isComplete} fade={winFade} />
        </group>
      )}

      {/* Framed door + stoop on the +Z (street) face — fade + scale in across 55–65% */}
      {doorFade > 0.001 && (
        <group position={[0, 0.4, halfD]} scale={doorScale}>
          <mesh position={[0, doorH / 2, 0.02]} castShadow>
            <boxGeometry args={[1.5, doorH + 0.2, 0.18]} />
            <meshStandardMaterial color="#4a4138" roughness={0.85} {...FadeMaterialProps(doorFade)} />
          </mesh>
          <mesh position={[0, doorH / 2, 0.12]} castShadow>
            <boxGeometry args={[1.1, doorH, 0.1]} />
            <meshStandardMaterial color="#7a4e2c" roughness={0.65} {...FadeMaterialProps(doorFade)} />
          </mesh>
          <mesh position={[0, -0.24, 0.55]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.12, 0.9]} />
            <meshStandardMaterial color="#a59a8c" roughness={0.95} {...FadeMaterialProps(doorFade)} />
          </mesh>
        </group>
      )}

      {/* Gable roof with eaves + ridge cap — grows/fades in across 65–80% */}
      {roofFade > 0.001 && (
        <group position={[0, wallHeight + 0.4, 0]} scale={[1, roofScale, 1]}>
          <mesh geometry={roofGeom} castShadow receiveShadow>
            <meshStandardMaterial
              color={roofColor}
              roughness={0.92}
              metalness={0}
              side={THREE.DoubleSide}
              {...FadeMaterialProps(roofFade)}
            />
          </mesh>
          <mesh position={[0, v.ridge, 0]} castShadow>
            <boxGeometry args={[W + 1.6, 0.2, 0.34]} />
            <meshStandardMaterial color={TRIM_TIMBER} roughness={0.8} {...FadeMaterialProps(roofFade)} />
          </mesh>
          {v.chimney && (
            <mesh position={[W * 0.28, v.ridge * 0.7, -D * 0.2]} castShadow>
              <boxGeometry args={[0.7, v.ridge + 1, 0.7]} />
              <meshStandardMaterial color="#857565" roughness={0.95} {...FadeMaterialProps(roofFade)} />
            </mesh>
          )}
        </group>
      )}

      <ProgressRing progress={progress} active={isActive} radius={Math.max(W, D) * 0.5 + 1} />
    </group>
  )
}

function Window({
  pos,
  rotY,
  lit,
  fade = 1,
}: {
  pos: [number, number, number]
  rotY: number
  lit: boolean
  fade?: number
}) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* frame — warm timber to match the corner trim / suburb woodwork */}
      <mesh castShadow>
        <boxGeometry args={[1.5, 1.2, 0.2]} />
        <meshStandardMaterial color="#e8ddc8" roughness={0.6} transparent opacity={fade} />
      </mesh>
      {/* glass — cool blue while building, warm "lights on" when complete */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[1.15, 0.9, 0.12]} />
        <meshStandardMaterial
          color={lit ? '#ffd9a0' : '#9fc2e0'}
          emissive={lit ? '#ffb04d' : '#1a2a3a'}
          emissiveIntensity={(lit ? 0.9 : 0.15) * fade}
          roughness={0.1}
          metalness={0.2}
          transparent
          opacity={fade}
        />
      </mesh>
    </group>
  )
}

function ProgressRing({ progress, active, radius }: { progress: number; active: boolean; radius: number }) {
  const ref = useRef<any>(null)
  useFrame(({ clock }) => {
    if (ref.current && active) {
      ref.current.material.opacity = 0.25 + Math.sin(clock.elapsedTime * 2) * 0.12
    }
  })

  if (progress <= 0) return null

  return (
    <mesh ref={ref} position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius, radius + 0.5, 64, 1, 0, Math.PI * 2 * progress]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  )
}
