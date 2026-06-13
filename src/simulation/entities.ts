import type { WorldState, PersonEntity, RobotEntity } from '@/types'

const URGENCY_BASE_RATE = 0.5       // per second while undiscovered
const URGENCY_HAZARD_RATE = 2.0     // per second near fire/flood
const HAZARD_PROXIMITY_CELLS = 5
const UNIT_FIRE_DAMAGE_CHANCE = 0.05 // per tick if in fire cell > 0.5

export function decayPersonUrgency(state: WorldState, deltaS: number): WorldState {
  const entities = state.entities.map(e => {
    if (e.kind !== 'person' || e.status !== 'undiscovered') return e
    const person = e as PersonEntity

    const gx = Math.round(person.position.x / state.cellSizeM)
    const gy = Math.round(person.position.z / state.cellSizeM)

    const nearHazard = isNearHazard(state, gx, gy, HAZARD_PROXIMITY_CELLS)
    const rate = nearHazard ? URGENCY_HAZARD_RATE : URGENCY_BASE_RATE

    const newUrgency = Math.min(100, person.urgencyScore + rate * deltaS)

    return {
      ...person,
      urgencyScore: newUrgency,
    } satisfies PersonEntity
  })

  return { ...state, entities }
}

export function updateFogOfWar(state: WorldState): WorldState {
  const DRONE_REVEAL_RADIUS = 7
  const grid = state.grid.map(row => row.map(cell => ({ ...cell })))

  const drones = state.entities.filter(
    e => e.kind === 'robot' && (e as RobotEntity).type === 'recon_drone'
  ) as RobotEntity[]

  for (const drone of drones) {
    const cx = Math.round(drone.position.x / state.cellSizeM)
    const cy = Math.round(drone.position.z / state.cellSizeM)
    for (let dy = -DRONE_REVEAL_RADIUS; dy <= DRONE_REVEAL_RADIUS; dy++) {
      for (let dx = -DRONE_REVEAL_RADIUS; dx <= DRONE_REVEAL_RADIUS; dx++) {
        if (dx * dx + dy * dy > DRONE_REVEAL_RADIUS * DRONE_REVEAL_RADIUS) continue
        const nx = cx + dx; const ny = cy + dy
        if (nx < 0 || ny < 0 || nx >= state.gridWidth || ny >= state.gridHeight) continue
        grid[ny][nx].isRevealed = true
      }
    }
  }

  // Discover people whose cell is now revealed
  const entities = state.entities.map(e => {
    if (e.kind !== 'person') return e
    const person = e as PersonEntity
    if (person.status !== 'undiscovered') return person
    const gx = Math.round(person.position.x / state.cellSizeM)
    const gy = Math.round(person.position.z / state.cellSizeM)
    if (gx >= 0 && gy >= 0 && gy < grid.length && gx < (grid[0]?.length ?? 0) && grid[gy][gx].isRevealed) {
      return { ...person, status: 'discovered' as const, discoveredAtTick: state.tick }
    }
    return person
  })

  // Damage units in fire cells
  const damagedEntities = entities.map(e => {
    if (e.kind !== 'robot') return e
    const robot = e as RobotEntity
    if (robot.status === 'failed') return robot
    const gx = Math.round(robot.position.x / state.cellSizeM)
    const gy = Math.round(robot.position.z / state.cellSizeM)
    if (gy < 0 || gy >= grid.length || gx < 0 || gx >= (grid[0]?.length ?? 0)) return robot
    const cell = grid[gy][gx]
    if (cell.fireIntensity > 0.5 && Math.random() < UNIT_FIRE_DAMAGE_CHANCE) {
      return { ...robot, status: 'failed' as const }
    }
    return robot
  })

  return { ...state, grid, entities: damagedEntities }
}

function isNearHazard(state: WorldState, gx: number, gy: number, radius: number): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = gx + dx; const ny = gy + dy
      if (nx < 0 || ny < 0 || ny >= state.grid.length || nx >= (state.grid[0]?.length ?? 0)) continue
      const cell = state.grid[ny][nx]
      if (cell.fireIntensity > 0.1 || cell.floodDepth > 0.5) return true
    }
  }
  return false
}
