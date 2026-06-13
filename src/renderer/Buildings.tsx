import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useWorldStore } from '@/store/worldStore'
import type { BuildSite } from '@/types'

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
  const progress = site.modulesRequired > 0 ? site.modulesComplete / site.modulesRequired : 0
  const wallHeight = Math.max(0.05, progress * 5)
  const isComplete = site.status === 'complete'
  const isActive = site.status === 'active'

  const wallColor = isComplete ? '#f5f0e8' : '#d6cfc4'
  const roofColor = isComplete ? '#8b4513' : '#9e7b5a'

  return (
    <group position={[site.position.x, 0, site.position.z]}>
      {/* Foundation slab */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[8, 0.1, 8]} />
        <meshStandardMaterial color="#c8bfb0" roughness={0.9} />
      </mesh>

      {/* Walls — grow with progress */}
      {progress > 0 && (
        <mesh position={[0, wallHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[7.5, wallHeight, 7.5]} />
          <meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.0} />
        </mesh>
      )}

      {/* Windows — appear at 40%+ progress */}
      {progress > 0.4 && (
        <group position={[0, wallHeight * 0.55, 0]}>
          <mesh position={[3.8, 0, 0]} castShadow>
            <boxGeometry args={[0.15, 1.0, 1.4]} />
            <meshStandardMaterial color="#b8d4ee" roughness={0.1} metalness={0.3} />
          </mesh>
          <mesh position={[-3.8, 0, 0]} castShadow>
            <boxGeometry args={[0.15, 1.0, 1.4]} />
            <meshStandardMaterial color="#b8d4ee" roughness={0.1} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0, 3.8]} castShadow>
            <boxGeometry args={[1.4, 1.0, 0.15]} />
            <meshStandardMaterial color="#b8d4ee" roughness={0.1} metalness={0.3} />
          </mesh>
        </group>
      )}

      {/* Pyramid roof — appears at 70%+ progress */}
      {progress > 0.7 && (
        <mesh position={[0, wallHeight + 1.6, 0]} castShadow>
          <coneGeometry args={[6, 3.2, 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.8} metalness={0.0} />
        </mesh>
      )}

      {/* Door — appears at 60%+ progress */}
      {progress > 0.6 && (
        <mesh position={[0, wallHeight * 0.3, 3.82]} castShadow>
          <boxGeometry args={[1.2, wallHeight * 0.55, 0.15]} />
          <meshStandardMaterial color="#6b4226" roughness={0.9} />
        </mesh>
      )}

      {/* Progress ring on ground */}
      <ProgressRing progress={progress} active={isActive} />
    </group>
  )
}

function ProgressRing({ progress, active }: { progress: number; active: boolean }) {
  const ref = useRef<any>(null)
  useFrame(({ clock }) => {
    if (ref.current && active) {
      ref.current.material.opacity = 0.25 + Math.sin(clock.elapsedTime * 2) * 0.12
    }
  })

  if (progress <= 0) return null

  return (
    <mesh ref={ref} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[5, 5.5, 64, 1, 0, Math.PI * 2 * progress]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={2} />
    </mesh>
  )
}
