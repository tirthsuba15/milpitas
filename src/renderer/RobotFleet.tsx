import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useWorldStore } from '@/store/worldStore'
import type { RobotEntity, RobotStatus } from '@/types'

const STATUS_COLORS: Record<RobotStatus, string> = {
  idle:    '#4488ff',
  moving:  '#44aaff',
  working: '#44ff88',
  blocked: '#ffaa00',
  failed:  '#ff4444',
}

const ROBOT_COLORS: Record<string, string> = {
  recon_drone:    '#88ccff',
  rescue_unit:    '#ff8844',
  medic:          '#ff44aa',
  sorting_robot:  '#aaaa44',
  hauler:         '#886644',
  builder_robot:  '#44aa88',
  restoration_unit:'#88ff44',
}

export function RobotFleet() {
  const world = useWorldStore(s => s.world)
  if (!world) return null

  const robots = world.entities.filter(e => e.kind === 'robot') as RobotEntity[]

  return (
    <group>
      {robots.map(robot => (
        <RobotMesh key={robot.id} robot={robot} />
      ))}
    </group>
  )
}

function RobotMesh({ robot }: { robot: RobotEntity }) {
  const isDrone = robot.type === 'recon_drone'
  const color = ROBOT_COLORS[robot.type] ?? '#ffffff'
  const glowColor = STATUS_COLORS[robot.status]

  return (
    <group position={[robot.position.x, robot.position.y, robot.position.z]}>
      {/* Body — TODO (Visual Lead P3): replace with loaded GLB model */}
      <mesh castShadow>
        {isDrone
          ? <cylinderGeometry args={[0.8, 0.8, 0.3, 8]} />
          : <capsuleGeometry args={[0.4, 1.2, 4, 8]} />
        }
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Status glow ring on the ground */}
      <GlowRing color={glowColor} pulse={robot.status === 'working'} />
    </group>
  )
}

function GlowRing({ color, pulse }: { color: string; pulse: boolean }) {
  const ref = useRef<any>(null)
  useFrame(({ clock }) => {
    if (ref.current && pulse) {
      ref.current.material.opacity = 0.5 + Math.sin(clock.elapsedTime * 4) * 0.3
    }
  })

  return (
    <mesh ref={ref} position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1.3, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} />
    </mesh>
  )
}
