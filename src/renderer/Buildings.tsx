import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useWorldStore } from '@/store/worldStore'
import type { BuildSite, MaterialChoice } from '@/types'
import { seededRng, makeGableRoof } from './houseGeometry'

// Tint walls by material so the timber→recycled switch is visible in the world (P1-1).
// Variation only ever scales brightness/roughness — never hue — so this tint stays legible.
const MATERIAL_WALL: Record<MaterialChoice, { incomplete: string; complete: string }> = {
  imported_timber: { incomplete: '#b8a88a', complete: '#c8b89a' },
  salvaged_timber:  { incomplete: '#8c9a76', complete: '#9caa86' },
  recycled_panels:  { incomplete: '#7f938b', complete: '#8fa39b' },
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
    return { light: 0.9 + r() * 0.2, rough: 0.62 + r() * 0.22, chimney: r() > 0.45, ridge: D * 0.42 }
  }, [site.id, D])

  const mat = MATERIAL_WALL[site.materialChoice] ?? MATERIAL_WALL.imported_timber
  const wallColor = useMemo(
    () => new THREE.Color(isComplete ? mat.complete : mat.incomplete).multiplyScalar(v.light),
    [isComplete, mat.complete, mat.incomplete, v.light],
  )
  const roofColor = isComplete ? '#7a3f24' : '#9e7b5a'
  const roofGeom = useMemo(() => makeGableRoof(W, D, v.ridge, 0.7), [W, D, v.ridge])

  const winY = Math.min(wallHeight * 0.58, wallHeight - 0.6) + 0.16
  const doorH = Math.min(wallHeight * 0.7, 2.3)

  return (
    <group position={[site.position.x, 0, site.position.z]} rotation={[0, fp.rotationY, 0]}>
      {/* Plinth / foundation slab — slightly larger than the walls */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[W + 0.8, 0.16, D + 0.8]} />
        <meshStandardMaterial color="#b8aea0" roughness={0.95} />
      </mesh>

      {/* Walls — grow with progress */}
      {progress > 0 && (
        <mesh position={[0, wallHeight / 2 + 0.16, 0]} castShadow receiveShadow>
          <boxGeometry args={[W, wallHeight, D]} />
          <meshStandardMaterial color={wallColor} roughness={v.rough} metalness={0} />
        </mesh>
      )}

      {/* Framed windows — 40%+ (and only once walls are tall enough) */}
      {progress > 0.4 && wallHeight > 1.2 && (
        <group position={[0, winY, 0]}>
          <Window pos={[halfW, 0, -halfD * 0.45]} rotY={Math.PI / 2} lit={isComplete} />
          <Window pos={[halfW, 0, halfD * 0.45]} rotY={Math.PI / 2} lit={isComplete} />
          <Window pos={[-halfW, 0, -halfD * 0.45]} rotY={-Math.PI / 2} lit={isComplete} />
          <Window pos={[-halfW, 0, halfD * 0.45]} rotY={-Math.PI / 2} lit={isComplete} />
          <Window pos={[halfW * 0.5, 0, halfD]} rotY={0} lit={isComplete} />
          <Window pos={[-halfW * 0.45, 0, -halfD]} rotY={Math.PI} lit={isComplete} />
        </group>
      )}

      {/* Framed door + stoop on the +Z (street) face — 60%+ */}
      {progress > 0.6 && (
        <group position={[0, 0.16, halfD]}>
          <mesh position={[0, doorH / 2, 0.02]} castShadow>
            <boxGeometry args={[1.5, doorH + 0.2, 0.18]} />
            <meshStandardMaterial color="#3f3a33" roughness={0.85} />
          </mesh>
          <mesh position={[0, doorH / 2, 0.12]} castShadow>
            <boxGeometry args={[1.1, doorH, 0.1]} />
            <meshStandardMaterial color="#6b4226" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.04, 0.55]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.12, 0.9]} />
            <meshStandardMaterial color="#9a9085" roughness={0.95} />
          </mesh>
        </group>
      )}

      {/* Gable roof with eaves + ridge cap — 70%+ */}
      {progress > 0.7 && (
        <group position={[0, wallHeight + 0.16, 0]}>
          <mesh geometry={roofGeom} castShadow receiveShadow>
            <meshStandardMaterial color={roofColor} roughness={0.85} metalness={0} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, v.ridge, 0]} castShadow>
            <boxGeometry args={[W + 1.6, 0.2, 0.34]} />
            <meshStandardMaterial color="#5a3a28" roughness={0.8} />
          </mesh>
          {v.chimney && (
            <mesh position={[W * 0.28, v.ridge * 0.7, -D * 0.2]} castShadow>
              <boxGeometry args={[0.7, v.ridge + 1, 0.7]} />
              <meshStandardMaterial color="#7a6a5c" roughness={0.95} />
            </mesh>
          )}
        </group>
      )}

      <ProgressRing progress={progress} active={isActive} radius={Math.max(W, D) * 0.5 + 1} />
    </group>
  )
}

function Window({ pos, rotY, lit }: { pos: [number, number, number]; rotY: number; lit: boolean }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* frame */}
      <mesh castShadow>
        <boxGeometry args={[1.5, 1.2, 0.2]} />
        <meshStandardMaterial color="#e6e0d4" roughness={0.6} />
      </mesh>
      {/* glass — cool blue while building, warm "lights on" when complete */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[1.15, 0.9, 0.12]} />
        <meshStandardMaterial
          color={lit ? '#ffd9a0' : '#9fc2e0'}
          emissive={lit ? '#ffb04d' : '#1a2a3a'}
          emissiveIntensity={lit ? 0.9 : 0.15}
          roughness={0.1}
          metalness={0.2}
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
