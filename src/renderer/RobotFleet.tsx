import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useWorldStore } from '@/store/worldStore'
import type { RobotEntity, RobotStatus } from '@/types'

const STATUS_COLORS: Record<RobotStatus, string> = {
  idle:    '#4488ff',
  moving:  '#44aaff',
  working: '#44ff88',
  blocked: '#ffaa00',
  failed:  '#ff4444',
}

const DRONE_POSITIONS: [number, number, number][] = [
  [0.9, 0, 0.9], [-0.9, 0, 0.9], [0.9, 0, -0.9], [-0.9, 0, -0.9],
]

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

// Minimum horizontal speed (per frame) before we trust a heading update.
// Below this we treat the unit as stationary and keep its last heading.
const HEADING_MOVE_THRESHOLD = 0.0008
// How quickly the unit yaws toward its target heading (higher = snappier).
const YAW_DAMP = 6

function RobotMesh({ robot }: { robot: RobotEntity }) {
  const isDrone = robot.type === 'recon_drone'
  const glowColor = STATUS_COLORS[robot.status]

  const groupRef = useRef<THREE.Group>(null)
  // Previous horizontal position, used to derive per-frame velocity.
  const prevPos = useRef<{ x: number; z: number } | null>(null)
  // Target yaw the unit is turning toward; retained while stationary.
  const targetYaw = useRef<number | null>(null)

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const { x, z } = robot.position

    // Keep the group's translation in sync with the latest sim position.
    group.position.set(x, robot.position.y, z)

    if (prevPos.current) {
      const dx = x - prevPos.current.x
      const dz = z - prevPos.current.z
      const dist = Math.hypot(dx, dz)
      if (dist > HEADING_MOVE_THRESHOLD) {
        // Model forward axis is +Z (ground unit's visor sits at +Z), so the
        // yaw that points +Z along (dx, dz) is atan2(dx, dz) — no extra offset.
        targetYaw.current = Math.atan2(dx, dz)
      }
    }
    prevPos.current = { x, z }

    if (targetYaw.current !== null) {
      // Smoothly damp the current yaw toward the target, taking the shortest
      // angular path so the unit turns rather than snapping.
      const current = group.rotation.y
      let diff = targetYaw.current - current
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      const t = 1 - Math.exp(-YAW_DAMP * delta)
      group.rotation.y = current + diff * t
    }
  })

  return (
    <group ref={groupRef} position={[robot.position.x, robot.position.y, robot.position.z]}>
      {isDrone ? <DroneMesh /> : <GroundUnitMesh />}
      <GlowRing color={glowColor} pulse={robot.status === 'working'} />
    </group>
  )
}

function DroneMesh() {
  const propRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (propRef.current) {
      propRef.current.rotation.y = clock.elapsedTime * 18
    }
  })

  return (
    <group>
      {/* Central body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.22, 10]} />
        <meshStandardMaterial color="#303030" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* Camera dome under body */}
      <mesh position={[0, -0.18, 0]}>
        <sphereGeometry args={[0.2, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#111111" roughness={0.05} metalness={0.8} />
      </mesh>

      {/* 4 arms */}
      {DRONE_POSITIONS.map(([x, , z], i) => (
        <mesh key={i} position={[x * 0.5, 0, z * 0.5]} rotation={[0, Math.atan2(x, z), 0]} castShadow>
          <boxGeometry args={[0.12, 0.06, 1.3]} />
          <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}

      {/* Spinning propellers */}
      <group ref={propRef}>
        {DRONE_POSITIONS.map(([x, , z], i) => (
          <mesh key={i} position={[x, 0.1, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.04, 6]} />
            <meshStandardMaterial color="#555555" roughness={0.3} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function GroundUnitMesh() {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.8, 1.0, 1.2]} />
        <meshStandardMaterial color="#4a6080" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <boxGeometry args={[0.6, 0.5, 0.6]} />
        <meshStandardMaterial color="#384858" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Eye visor */}
      <mesh position={[0, 1.38, 0.32]}>
        <boxGeometry args={[0.4, 0.12, 0.05]} />
        <meshStandardMaterial color="#88ccff" roughness={0.05} metalness={0.5} emissive="#4488cc" emissiveIntensity={0.4} />
      </mesh>
      {/* Wheels */}
      {([-0.5, 0.5] as const).map((x, i) => (
        <mesh key={i} position={[x, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.12, 8]} />
          <meshStandardMaterial color="#222222" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function GlowRing({ color, pulse }: { color: string; pulse: boolean }) {
  const ref = useRef<any>(null)
  useFrame(({ clock }) => {
    if (ref.current && pulse) {
      ref.current.material.opacity = 0.4 + Math.sin(clock.elapsedTime * 4) * 0.2
    }
  })

  return (
    <mesh ref={ref} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1.3, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} />
    </mesh>
  )
}
