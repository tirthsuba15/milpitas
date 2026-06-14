import type { WorldState, AgentPlanResponse, RobotEntity, PersonEntity, DebrisEntity, Vec3 } from '@/types'
import { findPath } from '@/simulation/pathfinding'

// Deterministic rule-based fallback — runs when the LLM call fails or is slow.
// Ensures the demo never stalls.
//
// CORE RULE: never assign a unit to a target it cannot reach. Every assignment below is gated
// on reachable() (findPath returns non-null), which both stops units wandering toward fog/empty
// corners and routes around the known pathfinding/spawn hazards (e.g. a survivor stranded in a
// fire cell) WITHOUT touching the sim files. findPath is a sub-millisecond binary-heap A* and is
// documented as safe to call per assignment.
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

  const idleDrones   = robots.filter(r => r.type === 'recon_drone'   && r.status === 'idle')
  const idleRescue   = robots.filter(r => (r.type === 'rescue_unit' || r.type === 'medic') && r.status === 'idle')
  const idleSorters  = robots.filter(r => r.type === 'sorting_robot' && r.status === 'idle')
  const idleBuilders = robots.filter(r => r.type === 'builder_robot' && r.status === 'idle')
  const idleHaulers  = robots.filter(r => r.type === 'hauler'        && r.status === 'idle')

  // ── Drones → nearest REACHABLE fog-frontier cell, biased toward the occupied zone
  // (build sites / discovered people / known debris), fanned out so two drones never claim the
  // same sector. Reveal already happens during movement, so no arrival hook is needed.
  const reconTargets = pickReconTargets(state, idleDrones)
  idleDrones.forEach((drone, i) => {
    const target = reconTargets[i]
    if (target) {
      actions.push({
        type: 'assign_task',
        unitId: drone.id,
        task: { type: 'recon', targetEntityId: 'none', targetPosition: target, priority: 80 },
        rationale: `${drone.id} → survey sector ${Math.round(target.x)},${Math.round(target.z)}`,
      })
    }
  })

  // ── Rescue → highest-urgency discovered survivor that is actually REACHABLE. Skipping an
  // unreachable survivor (e.g. one stranded inside a fire cell) lets the unit take the next
  // valid one instead of stalling forever. Medics reserved for urgency > 80.
  const survivors = people
    .filter(p => p.status === 'discovered' && p.subtype === 'survivor')
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
  const rescuers = [
    ...idleRescue.filter(r => r.type === 'medic'),
    ...idleRescue.filter(r => r.type === 'rescue_unit'),
  ]
  // Survivors that already have a rescuer en route — don't pile a second unit onto them.
  const enRouteSurvivorIds = new Set(
    robots
      .filter(r => (r.type === 'rescue_unit' || r.type === 'medic') && r.status !== 'idle' && r.task?.type === 'rescue')
      .map(r => r.task!.targetEntityId)
  )
  const claimedPeople = new Set<string>()
  for (const unit of rescuers) {
    const person = survivors.find(p =>
      !claimedPeople.has(p.id) &&
      !enRouteSurvivorIds.has(p.id) &&
      !(unit.type === 'medic' && p.urgencyScore <= 80) &&   // reserve medic for the critical cases
      reachable(state, unit, p.position)
    )
    if (!person) continue
    claimedPeople.add(person.id)
    actions.push({
      type: 'assign_task',
      unitId: unit.id,
      task: { type: 'rescue', targetEntityId: person.id, targetPosition: person.position, priority: 90 },
      rationale: `${unit.id} → ${person.id} (urgency ${person.urgencyScore.toFixed(0)}, ${person.vulnerability})`,
    })
  }

  // ── Sorter → highest-carbon debris whose cell is REVEALED (the debris equivalent of
  // "discovered") and REACHABLE. Never dispatched into fog or onto an impassable pile.
  const sortable = debris
    .filter(d => cellRevealed(state, d.position))
    .sort((a, b) => b.kgCo2eIfSalvaged - a.kgCo2eIfSalvaged)
  const claimedDebris = new Set<string>()
  for (const sorter of idleSorters) {
    const d = sortable.find(d => !claimedDebris.has(d.id) && reachable(state, sorter, d.position))
    if (!d) continue
    claimedDebris.add(d.id)
    actions.push({
      type: 'assign_task',
      unitId: sorter.id,
      task: { type: 'sort_debris', targetEntityId: d.id, targetPosition: d.position, priority: 60 },
      rationale: `${sorter.id} → ${d.debrisType} ${d.massKg}kg, saves ${d.kgCo2eIfSalvaged}kg CO₂e`,
    })
  }

  // ── Builders → AT MOST ONE per active site. Never onto a site that already has a builder
  // moving/working toward it, and each open site goes to its NEAREST reachable idle builder
  // (so the on-site builder keeps placing modules rather than a fresh one walking over). This
  // is the fix for "the house builds before its builder arrives": no more convergence.
  const occupiedSiteIds = new Set(
    robots
      .filter(r => r.type === 'builder_robot' && r.status !== 'idle' && r.task?.type === 'build_module')
      .map(r => r.task!.targetEntityId)
  )
  const openSites = state.buildSites.filter(s => s.status === 'active' && !occupiedSiteIds.has(s.id))
  const usedBuilders = new Set<string>()
  for (const site of openSites) {
    const chosen = idleBuilders
      .filter(b => !usedBuilders.has(b.id))
      .sort((a, b) => dist2(a.position, site.position) - dist2(b.position, site.position))
      .find(b => reachable(state, b, site.position))
    if (!chosen) continue
    usedBuilders.add(chosen.id)
    actions.push({
      type: 'assign_task',
      unitId: chosen.id,
      task: { type: 'build_module', targetEntityId: site.id, targetPosition: site.position, priority: 70 },
      rationale: `${chosen.id} → ${site.id} (${site.modulesComplete}/${site.modulesRequired} built, ${site.materialChoice.replace(/_/g, ' ')})`,
    })
  }

  // ── Hauler → builds draw from SHARED INVENTORY (deductMaterial), so the hauler is off the
  // critical path and there are no deliveries to fake. Stage it near the build zone (its nearest
  // build site) so it sits with the rebuild crew instead of stranded at spawn, then idle there.
  // haul_material has no arrival consequence, so this is a pure reposition — no fake work.
  for (const hauler of idleHaulers) {
    const staging = nearestSitePos(state, hauler)
    if (!staging) break
    if (dist2(hauler.position, staging) <= STAGING_NEAR_M * STAGING_NEAR_M) continue   // already staged → stay put (stable)
    if (!reachable(state, hauler, staging)) continue
    actions.push({
      type: 'assign_task',
      unitId: hauler.id,
      task: { type: 'haul_material', targetEntityId: 'none', targetPosition: staging, priority: 20 },
      rationale: `${hauler.id} → staging at build zone`,
    })
  }

  // Comms log = events a coordinator must act on, not routine assignments. Emit ONE meaningful
  // line per plan, or none: the timber-switch MATERIAL event, else a newly-BLOCKED site, else
  // stay silent (empty summary → App.tsx logs nothing). Survivor-reached / module-done lines are
  // emitted by the sim itself on actual arrival, so the fallback never restates them.
  const switched = sitesNeedingSwitch.length
  if (switched) {
    return {
      agent: 'rebuild',
      actions,
      summary: `MATERIAL — timber exhausted. ${switched} site${switched > 1 ? 's' : ''} switched to recycled panels, carbon 9,600→640 kg per module.`,
    }
  }
  const blocked = newlyBlockedSite(state)
  if (blocked) {
    return {
      agent: 'logistics',
      actions,
      summary: `BLOCKED — ${blocked.site} out of ${blocked.material}. Coordinator action may be needed.`,
    }
  }
  return { agent: 'commander', actions, summary: '' }
}

// ── Comms helpers: surface only a coordinator-relevant event, and only on its EDGE ─────────────
const reportedBlocked = new Set<string>()

function materialStock(state: WorldState, choice: string): number {
  switch (choice) {
    case 'imported_timber': return state.inventory.importedTimber
    case 'imported_panels': return state.inventory.importedPanels
    case 'salvaged_timber': return state.inventory.salvagedTimber
    case 'recycled_panels': return state.inventory.recycledPanels
    default: return Infinity
  }
}

// An active site whose chosen material is exhausted can't progress. Report it ONCE (on the edge),
// not every tick it stays blocked; forget it when it recovers so a future block re-reports.
function newlyBlockedSite(state: WorldState): { site: string; material: string } | null {
  let found: { site: string; material: string } | null = null
  const current = new Set<string>()
  for (const s of state.buildSites) {
    if (s.status !== 'active' || s.modulesComplete >= s.modulesRequired) continue
    if (materialStock(state, s.materialChoice) > 0) continue
    current.add(s.id)
    if (!reportedBlocked.has(s.id) && !found) found = { site: s.id, material: s.materialChoice.replace(/_/g, ' ') }
  }
  for (const id of [...reportedBlocked]) if (!current.has(id)) reportedBlocked.delete(id)
  if (found) reportedBlocked.add(found.site)
  return found
}

// ── helpers ────────────────────────────────────────────────────────────────────
const SECTOR_M = 60          // keep two drones at least this far apart (fan-out)
const STAGING_NEAR_M = 15    // a hauler is "staged" once within this of its build-zone spot
const MAX_RECON_TRIES = 30   // bound findPath calls per drone when ranking frontier cells

const dist2 = (a: Vec3, b: Vec3) => { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz }

const reachable = (state: WorldState, unit: RobotEntity, pos: Vec3): boolean =>
  findPath(state.grid, unit.position, pos, unit.clearanceRadius) !== null

function cellRevealed(state: WorldState, pos: Vec3): boolean {
  const gx = Math.round(pos.x / state.cellSizeM)
  const gy = Math.round(pos.z / state.cellSizeM)
  return !!state.grid[gy]?.[gx]?.isRevealed
}

function nearestSitePos(state: WorldState, unit: RobotEntity): Vec3 | null {
  if (!state.buildSites.length) return null
  return [...state.buildSites].sort((a, b) => dist2(a.position, unit.position) - dist2(b.position, unit.position))[0].position
}

// Centre of "where the action is" — build sites + discovered people + known debris — used to
// bias recon toward occupied territory instead of empty map corners.
function interestCentroid(state: WorldState): Vec3 {
  const pts: Vec3[] = [
    ...state.buildSites.map(s => s.position),
    ...state.entities.filter(e => e.kind === 'person' && (e as PersonEntity).status === 'discovered').map(e => e.position),
    ...state.entities.filter(e => e.kind === 'debris' && !(e as DebrisEntity).salvaged).map(e => e.position),
  ]
  if (!pts.length) return { x: (state.gridWidth * state.cellSizeM) / 2, y: 0, z: (state.gridHeight * state.cellSizeM) / 2 }
  const sum = pts.reduce((a, p) => ({ x: a.x + p.x, y: 0, z: a.z + p.z }), { x: 0, y: 0, z: 0 })
  return { x: sum.x / pts.length, y: 0, z: sum.z / pts.length }
}

function hasRevealedNeighbor(state: WorldState, x: number, y: number): boolean {
  const g = state.grid
  return (
    !!g[y - 1]?.[x]?.isRevealed || !!g[y + 1]?.[x]?.isRevealed ||
    !!g[y]?.[x - 1]?.isRevealed || !!g[y]?.[x + 1]?.isRevealed
  )
}

// One reachable fog-frontier target per drone: nearest to the drone, biased toward the occupied
// zone, and at least SECTOR_M from any target already claimed this tick (so drones fan out).
function pickReconTargets(state: WorldState, drones: RobotEntity[]): (Vec3 | null)[] {
  if (!drones.length) return []
  const interest = interestCentroid(state)
  const frontier: Vec3[] = []
  for (let y = 0; y < state.gridHeight; y++) {
    for (let x = 0; x < state.gridWidth; x++) {
      if (state.grid[y][x].isRevealed) continue
      if (!hasRevealedNeighbor(state, x, y)) continue
      frontier.push({ x: x * state.cellSizeM, y: 2, z: y * state.cellSizeM })
    }
  }
  const score = (c: Vec3, d: RobotEntity) =>
    Math.hypot(c.x - d.position.x, c.z - d.position.z) + 0.5 * Math.hypot(c.x - interest.x, c.z - interest.z)
  const claimed: Vec3[] = []
  return drones.map(drone => {
    const ranked = frontier
      .filter(c => claimed.every(cl => dist2(cl, c) >= SECTOR_M * SECTOR_M))
      .sort((a, b) => score(a, drone) - score(b, drone))
    let tries = 0
    for (const c of ranked) {
      if (++tries > MAX_RECON_TRIES) break
      if (reachable(state, drone, c)) { claimed.push(c); return c }
    }
    return null
  })
}
