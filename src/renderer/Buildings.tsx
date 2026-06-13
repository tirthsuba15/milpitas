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
        <BuildSiteMesh key={site.id} site={site} />
      ))}
    </group>
  )
}

function BuildSiteMesh({ site }: { site: BuildSite }) {
  const progress = site.modulesRequired > 0 ? site.modulesComplete / site.modulesRequired : 0
  const height = Math.max(0.1, progress * 4)
  const color = site.status === 'complete' ? '#88ffcc' : site.status === 'active' ? '#ffdd88' : '#888888'

  return (
    <group position={[site.position.x, 0, site.position.z]}>
      {/* Foundation footprint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>

      {/* Building volume — grows as modules complete */}
      {progress > 0 && (
        <mesh position={[0, height / 2, 0]} castShadow>
          <boxGeometry args={[7, height, 7]} />
          <meshStandardMaterial color="#c8b89a" roughness={0.8} metalness={0.0} />
        </mesh>
      )}

      {/* Solar panel roof */}
      {progress > 0.8 && (
        <mesh position={[0, height + 0.1, 0]} rotation={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[7, 0.15, 6]} />
          <meshStandardMaterial color="#1a3a5c" roughness={0.1} metalness={0.6} />
        </mesh>
      )}

      {/* Progress ring */}
      <ProgressRing progress={progress} active={site.status === 'active'} />
    </group>
  )
}

function ProgressRing({ progress, active }: { progress: number; active: boolean }) {
  const ref = useRef<any>(null)
  useFrame(({ clock }) => {
    if (ref.current && active) {
      ref.current.material.opacity = 0.4 + Math.sin(clock.elapsedTime * 2) * 0.2
    }
  })

  return (
    <mesh ref={ref} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Approximate arc using ring geometry — progress controls opacity */}
      <ringGeometry args={[5, 5.6, 64, 1, 0, Math.PI * 2 * progress]} />
      <meshBasicMaterial color="#00d4ff" transparent opacity={0.6} side={2} />
    </mesh>
  )
}
