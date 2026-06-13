import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useWorldStore } from '@/store/worldStore'
import type { PersonEntity } from '@/types'

export function Markers() {
  const world = useWorldStore(s => s.world)
  if (!world) return null

  const people = world.entities.filter(
    e => e.kind === 'person' && (e as PersonEntity).status === 'discovered'
  ) as PersonEntity[]

  return (
    <group>
      {people.map(person => (
        <PersonMarker key={person.id} person={person} />
      ))}
    </group>
  )
}

function PersonMarker({ person }: { person: PersonEntity }) {
  const ref = useRef<any>(null)

  const color =
    person.urgencyScore > 80 ? '#ff4444' :
    person.urgencyScore > 50 ? '#ffaa00' :
    '#ffffff'

  useFrame(({ clock }) => {
    if (ref.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * (3 + person.urgencyScore / 30)) * 0.15
      ref.current.scale.setScalar(pulse)
    }
  })

  return (
    <group position={[person.position.x, person.position.y + 1, person.position.z]}>
      <mesh ref={ref} castShadow>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} roughness={0.3} />
      </mesh>
      {/* Vertical beacon beam for critical */}
      {person.urgencyScore > 80 && (
        <mesh position={[0, 2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 4, 6]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  )
}
