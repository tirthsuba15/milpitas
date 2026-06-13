import type { WorldState, AgentPlanResponse, RobotEntity, PersonEntity, DebrisEntity } from '@/types'

// Deterministic rule-based fallback — runs when the LLM call fails or is slow.
// Ensures the demo never stalls.
export function fallbackPlan(state: WorldState): AgentPlanResponse {
  const actions: AgentPlanResponse['actions'] = []

  const robots = state.entities.filter(e => e.kind === 'robot') as RobotEntity[]
  const people = state.entities.filter(e => e.kind === 'person') as PersonEntity[]
  const debris = state.entities.filter(e => e.kind === 'debris' && !(e as DebrisEntity).salvaged) as DebrisEntity[]

  const idleDrones   = robots.filter(r => r.type === 'recon_drone' && r.status === 'idle')
  const idleRescue   = robots.filter(r => (r.type === 'rescue_unit' || r.type === 'medic') && r.status === 'idle')
  const idleSorters  = robots.filter(r => r.type === 'sorting_robot' && r.status === 'idle')
  const idleBuilders = robots.filter(r => r.type === 'builder_robot' && r.status === 'idle')

  // Drones → explore unknown areas
  for (const drone of idleDrones) {
    const target = findUnrevealedCell(state)
    if (target) {
      actions.push({
        type: 'assign_task',
        unitId: drone.id,
        task: { type: 'recon', targetEntityId: 'none', targetPosition: target, priority: 80 },
        rationale: 'Expand fog of war',
      })
    }
  }

  // Rescue units → highest-urgency discovered person
  const urgentPeople = people
    .filter(p => p.status === 'discovered' && p.subtype === 'survivor')
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
  for (let i = 0; i < Math.min(idleRescue.length, urgentPeople.length); i++) {
    actions.push({
      type: 'assign_task',
      unitId: idleRescue[i].id,
      task: { type: 'rescue', targetEntityId: urgentPeople[i].id, targetPosition: urgentPeople[i].position, priority: 90 },
      rationale: `Rescue urgency=${urgentPeople[i].urgencyScore.toFixed(0)}`,
    })
  }

  // Sorters → highest-value unsalvaged debris
  const topDebris = debris.sort((a, b) => b.kgCo2eIfSalvaged - a.kgCo2eIfSalvaged)
  for (let i = 0; i < Math.min(idleSorters.length, topDebris.length); i++) {
    actions.push({
      type: 'assign_task',
      unitId: idleSorters[i].id,
      task: { type: 'sort_debris', targetEntityId: topDebris[i].id, targetPosition: topDebris[i].position, priority: 60 },
      rationale: 'Maximize salvage value',
    })
  }

  // Builders → active build sites
  const activeSites = state.buildSites.filter(s => s.status === 'active')
  for (let i = 0; i < Math.min(idleBuilders.length, activeSites.length); i++) {
    actions.push({
      type: 'assign_task',
      unitId: idleBuilders[i].id,
      task: { type: 'build_module', targetEntityId: activeSites[i].id, targetPosition: activeSites[i].position, priority: 70 },
      rationale: 'Continue build progress',
    })
  }

  return {
    agent: 'commander',
    actions,
    summary: 'Fallback: assigning idle units by priority rules.',
  }
}

function findUnrevealedCell(state: WorldState): { x: number; y: number; z: number } | null {
  for (let y = state.gridHeight - 1; y >= 0; y--) {
    for (let x = 0; x < state.gridWidth; x++) {
      if (!state.grid[y][x].isRevealed) {
        return { x: x * state.cellSizeM, y: 2, z: y * state.cellSizeM }
      }
    }
  }
  return null
}
