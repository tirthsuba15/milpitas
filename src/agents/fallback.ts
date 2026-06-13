import type { WorldState, AgentPlanResponse, RobotEntity, PersonEntity, DebrisEntity } from '@/types'

// Deterministic rule-based fallback — runs when the LLM call fails or is slow.
// Ensures the demo never stalls.
export function fallbackPlan(state: WorldState): AgentPlanResponse {
  const actions: AgentPlanResponse['actions'] = []

  // ── PHASE 4: timber-shortage recovery (must run BEFORE unit assignment) ──
  // When imported timber hits 0, switch every unfinished build site to recycled
  // panels. This is the demo's climax and cannot depend on the LLM being fast.
  // Guarded on materialChoice so we don't re-switch a site (and double-count its
  // avoided carbon) on every 3s planning tick.
  const sitesNeedingSwitch =
    state.inventory.importedTimber === 0
      ? state.buildSites.filter(s => s.status !== 'complete' && s.materialChoice !== 'recycled_panels')
      : []
  for (const site of sitesNeedingSwitch) {
    actions.push({
      type: 'allocate_material',
      siteId: site.id,
      materialChoice: 'recycled_panels',
      rationale: 'Imported timber exhausted — switching to recycled panels (12.0 → 0.8 kgCO2e/kg)',
    })
  }

  const robots = state.entities.filter(e => e.kind === 'robot') as RobotEntity[]
  const people = state.entities.filter(e => e.kind === 'person') as PersonEntity[]
  const debris = state.entities.filter(e => e.kind === 'debris' && !(e as DebrisEntity).salvaged) as DebrisEntity[]

  const idleDrones   = robots.filter(r => r.type === 'recon_drone' && r.status === 'idle')
  const idleRescue   = robots.filter(r => (r.type === 'rescue_unit' || r.type === 'medic') && r.status === 'idle')
  const idleSorters  = robots.filter(r => r.type === 'sorting_robot' && r.status === 'idle')
  const idleBuilders = robots.filter(r => r.type === 'builder_robot' && r.status === 'idle')

  // Drones → explore unknown areas. Each drone gets a DISTINCT, spread-out cell so
  // they fan out instead of all piling onto the same first-found cell.
  const reconTargets = findUnrevealedCells(state, idleDrones.length)
  idleDrones.forEach((drone, i) => {
    const target = reconTargets[i]
    if (target) {
      actions.push({
        type: 'assign_task',
        unitId: drone.id,
        task: { type: 'recon', targetEntityId: 'none', targetPosition: target, priority: 80 },
        rationale: 'Expand fog of war',
      })
    }
  })

  // Rescue → highest-urgency discovered survivors. Medics are reserved for urgency > 80
  // (don't waste a medic on a low-urgency case); plain rescue units take whoever remains.
  const urgentPeople = people
    .filter(p => p.status === 'discovered' && p.subtype === 'survivor')
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
  const rescuers = [
    ...idleRescue.filter(r => r.type === 'medic'),
    ...idleRescue.filter(r => r.type === 'rescue_unit'),
  ]
  let pi = 0
  for (const unit of rescuers) {
    const person = urgentPeople[pi]
    if (!person) break
    if (unit.type === 'medic' && person.urgencyScore <= 80) continue   // reserve medic, leave this person for a rescue unit
    actions.push({
      type: 'assign_task',
      unitId: unit.id,
      task: { type: 'rescue', targetEntityId: person.id, targetPosition: person.position, priority: 90 },
      rationale: `Rescue urgency=${person.urgencyScore.toFixed(0)}`,
    })
    pi++
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

  const switched = sitesNeedingSwitch.length
  return {
    agent: switched ? 'rebuild' : 'commander',
    actions,
    summary: switched
      ? `Imported timber exhausted — switched ${switched} build site${switched > 1 ? 's' : ''} to recycled panels. Embodied carbon per module: 9,600 → 640 kgCO2e.`
      : 'Fallback: assigning idle units by priority rules.',
  }
}

// Collect up to n unrevealed cells, spread evenly across the fog frontier so multiple
// drones don't all target the same spot. Scans north-first (toward the disaster zone).
function findUnrevealedCells(state: WorldState, n: number): { x: number; y: number; z: number }[] {
  if (n <= 0) return []
  const cells: { x: number; y: number; z: number }[] = []
  for (let y = state.gridHeight - 1; y >= 0; y--) {
    for (let x = 0; x < state.gridWidth; x++) {
      if (!state.grid[y][x].isRevealed) {
        cells.push({ x: x * state.cellSizeM, y: 2, z: y * state.cellSizeM })
      }
    }
  }
  if (cells.length <= n) return cells
  const step = cells.length / n
  return Array.from({ length: n }, (_, i) => cells[Math.floor(i * step)])
}
