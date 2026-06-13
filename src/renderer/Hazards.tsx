import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useWorldStore } from '@/store/worldStore'
import type { GridCell } from '@/types'

const CELL_M = 5

export function Hazards() {
  const world = useWorldStore(s => s.world)
  if (!world) return null

  const fireCells = world.grid.flat().filter(c => c.fireIntensity > 0.1 && c.isRevealed)
  const floodCells = world.grid.flat().filter(c => c.floodDepth > 0.1 && c.isRevealed)

  return (
    <group>
      <FireParticles cells={fireCells} cellSizeM={world.cellSizeM} />
      <FloodPlanes cells={floodCells} cellSizeM={world.cellSizeM} />
    </group>
  )
}

const PARTICLES_PER_CELL = 6
const MAX_FIRE_CELLS = Math.floor(500 / PARTICLES_PER_CELL) // keeps total ≤ 500 particles

function FireParticles({ cells, cellSizeM }: { cells: GridCell[]; cellSizeM: number }) {
  const ref = useRef<THREE.Points>(null)

  // Prioritise cells with highest fire intensity; cap to avoid frame drops
  const activeCells = cells.length > MAX_FIRE_CELLS
    ? cells.slice(0, MAX_FIRE_CELLS)
    : cells
  const total = activeCells.length * PARTICLES_PER_CELL

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(total * 3)
    const col = new Float32Array(total * 3)
    activeCells.forEach((cell, ci) => {
      for (let p = 0; p < PARTICLES_PER_CELL; p++) {
        const i = (ci * PARTICLES_PER_CELL + p) * 3
        pos[i]   = cell.x * cellSizeM + (Math.random() - 0.5) * cellSizeM
        pos[i+1] = Math.random() * 3 * cell.fireIntensity
        pos[i+2] = cell.y * cellSizeM + (Math.random() - 0.5) * cellSizeM
        const t = Math.random()
        col[i]   = 1; col[i+1] = 0.3 + t * 0.3; col[i+2] = 0  // orange→red
      }
    })
    return { positions: pos, colors: col }
  }, [activeCells.length])

  useFrame(() => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < total; i++) {
      pos[i * 3 + 1] += 0.04   // drift upward
      if (pos[i * 3 + 1] > 6) pos[i * 3 + 1] = 0  // reset
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  if (total === 0) return null

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.6} vertexColors transparent opacity={0.85} sizeAttenuation />
    </points>
  )
}

function FloodPlanes({ cells, cellSizeM }: { cells: GridCell[]; cellSizeM: number }) {
  // TODO (Visual Lead P5): replace with animated water material using normal map ripple
  return (
    <group>
      {cells.map(cell => (
        <mesh key={`flood-${cell.x}-${cell.y}`} position={[cell.x * cellSizeM, cell.floodDepth * 0.5, cell.y * cellSizeM]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cellSizeM, cellSizeM]} />
          <meshStandardMaterial color="#1a4a6e" transparent opacity={0.65} roughness={0.05} metalness={0.1} />
        </mesh>
      ))}
    </group>
  )
}
