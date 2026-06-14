import type { WorldState, Entity, GridCell, AgentAction, RobotEntity, PersonEntity, DebrisEntity, Task, AgentType, Vec3, BuildSite, VulnerabilityLevel } from '@/types'
import { findPath } from './pathfinding'
import { spreadHazards } from './hazards'
import { decayPersonUrgency, updateFogOfWar } from './entities'
import { updateCarbonLedger, addSalvage, deductMaterial } from './ledger'
import { updateScore } from './scoring'
import { bus } from '@/events/bus'
import { GRID_W, GRID_H, CELL_SIZE_M, CORE_MIN_X, CORE_MIN_Z, isCoreCell } from './grid'
import { buildSuburb, zoneBaseCost, zoneTerrain } from './suburb'

// The original demo authored entities/sites in a 0–250 m world. The disaster
// core now lives as a sub-region centered on the 500 m map (world 125–375), so
// every legacy position is shifted by this offset into the core. Keeping the
// authoring numbers untouched + offsetting keeps the demo identical, just centered.
const CORE_OFFSET_X = CORE_MIN_X  // 125
const CORE_OFFSET_Z = CORE_MIN_Z  // 125

// Run the fire/flood CA every N ticks (deltaS scaled to preserve spread rate).
const HAZARD_EVERY = 3

// First-responder tuning (Fix 2).
const FIRE_SUPPRESSION_PER_TICK = 0.2   // intensity knocked down per tick while extinguishing
const DAMAGED_FIRE_START = 0.4          // starting fire on a damaged home — below the 0.5 "impassable / unit-damage" line so responders can reach & survive it

// Everything below the fleet is driven by the four mission-setup counts:
//   houseCount     — homes to rebuild (each = a displaced family + its build site)
//   damagedCount   — how many of those homes start ON FIRE (responders extinguish first)
//   droneCount     — recon drones
//   responderCount — first-responder units (extinguish → rebuild → house the family)
// App.tsx calls createInitialWorld(houses, drones, teams); damagedCount defaults to
// houseCount (the setup slider is literally "Damaged houses") but is honoured if passed.
export function createInitialWorld(
  houseCount = 6,
  droneCount = 2,
  responderCount = 3,
  damagedCount = houseCount,
): WorldState {
  const { zones, layout } = buildSuburb()
  const houses = houseLayout(houseCount, damagedCount)

  // Spread the homes evenly across the core, then set fire on the damaged ones.
  let grid = buildGrid(zones)
  grid = igniteDamagedHouses(grid, houses)

  const entities = buildInitialEntities(houseCount, damagedCount, droneCount, responderCount)

  // One build site per home, co-located with its family and pre-linked so a single
  // responder can drive the full extinguish → rebuild → house sequence (Fix 2).
  const buildSites: BuildSite[] = houses.map((h, i) => offsetSite({
    id: `site-${i + 1}`,
    position: h.position,
    modulesRequired: 4,
    modulesComplete: 0,
    status: 'active' as const,
    assignedFamilyId: h.famId,
    materialChoice: 'imported_timber' as const,
    kgCo2eSpent: 0,
  } satisfies BuildSite))

  return {
    tick: 0,
    elapsedSeconds: 0,
    phase: 'deploying',
    entities,
    grid,
    gridWidth: GRID_W,
    gridHeight: GRID_H,
    cellSizeM: CELL_SIZE_M,
    suburb: layout,
    buildSites,
    inventory: {
      importedTimber: 8000,
      importedPanels: 2000,
      salvagedTimber: 0,
      salvagedSteel: 0,
      salvagedAggregate: 0,
      recycledPanels: 0,
    },
    energy: { totalKwh: 500, usedKwh: 0, solarGeneratedKwh: 0 },
    carbon: { avoidedKgCo2e: 0, spentKgCo2e: 0, baselineKgCo2e: 45000 },
    score: { familiesHoused: 0, familiesTotal: houseCount, vulnerableHousedPct: 0, peopleRescued: 0, peopleTotal: 0, wasteDivertedKg: 0 },
    commsLog: [],
    activeEvents: [],
    windDirection: { dx: 1, dy: -1 },
  }
}

export class World {
  state: WorldState

  constructor(initial: WorldState) {
    this.state = initial
  }

  tick(deltaMs: number): void {
    const deltaS = deltaMs / 1000
    this.state = {
      ...this.state,
      tick: this.state.tick + 1,
      elapsedSeconds: this.state.elapsedSeconds + deltaS,
    }

    this._advanceUnits(deltaS)
    this._advanceResponders(deltaS)     // Fix 2: deterministic first-responder loop (extinguish → rebuild → house)
    // Throttle the hazard cellular automaton: on the 100×100 grid scanning every
    // tick is wasteful (fire/flood only live in the core). Run it every
    // HAZARD_EVERY ticks with a scaled deltaS so the spread RATE is unchanged.
    if (this.state.tick % HAZARD_EVERY === 0) {
      this.state = { ...this.state, grid: spreadHazards(this.state, deltaS * HAZARD_EVERY) }
    }
    this.state = decayPersonUrgency(this.state, deltaS)
    this.state = updateFogOfWar(this.state)
    this._updateHousingAssignments()   // after discovery is set in updateFogOfWar
    this.state = updateScore(this.state)
    this._updatePhase()                // deploying → active → complete (gates debrief/counterfactual)
    bus.emit('world:tick', this.state)
  }

  applyAction(action: AgentAction): void {
    bus.emit('agent:action', action)
    switch (action.type) {
      case 'assign_task': {
        const unit = this._getEntity(action.unitId) as RobotEntity | undefined
        if (!unit || unit.kind !== 'robot') return
        const path = findPath(this.state.grid, unit.position, action.task.targetPosition, unit.clearanceRadius)
        // findPath returns null when no route exists (e.g. target walled off by fire) and [] when the unit
        // is already on the target. Reject null so we never fabricate an arrival downstream — leave the unit
        // idle so a later re-plan can retry once the route opens.
        if (path === null) return
        const updated: RobotEntity = { ...unit, status: 'moving', task: { id: crypto.randomUUID(), ...action.task, startedAt: this.state.tick, assignedBy: 'commander' } }
        ;(updated as any)._path = path
        this._updateEntity(updated)
        break
      }
      case 'allocate_material': {
        const site = this.state.buildSites.find(s => s.id === action.siteId)
        if (!site) return
        const updatedSites = this.state.buildSites.map(s =>
          s.id === action.siteId ? { ...s, materialChoice: action.materialChoice } : s
        )
        this.state = updateCarbonLedger({ ...this.state, buildSites: updatedSites }, action)
        break
      }
      case 'narrate':
        this.state = {
          ...this.state,
          commsLog: [...this.state.commsLog.slice(-99), { tick: this.state.tick, agent: action.agent, message: action.message }],
        }
        break
    }
  }

  triggerTimberShortage(): void {
    this.state = { ...this.state, inventory: { ...this.state.inventory, importedTimber: 0, importedPanels: 0 }, activeEvents: [...this.state.activeEvents, 'timber_shortage'] }
  }

  triggerSecondStorm(): void {
    // Ignite a fresh fire band along the NORTH edge of the disaster core (core
    // cells 25..75 in each axis; this band sits at the core's top, in suburb-
    // adjacent territory so it threatens the neighborhood too).
    const grid = this.state.grid.map(row => row.map(cell => {
      const cx = cell.x - (this.state.gridWidth / 2 - 25)
      const cy = cell.y - (this.state.gridHeight / 2 - 25)
      const inCore = isCoreCell(cell.x, cell.y)
      if (inCore && cy < 15 && cx > 20 && cx < 35) return { ...cell, fireIntensity: Math.min(1, cell.fireIntensity + 0.8), fuelLoad: 1 }
      return cell
    }))
    this.state = { ...this.state, grid, windDirection: { dx: 0, dy: 1 }, activeEvents: [...this.state.activeEvents, 'second_storm'] }
  }

  private _getEntity(id: string): Entity | undefined {
    return this.state.entities.find(e => e.id === id)
  }

  private _updateEntity(entity: Entity): void {
    this.state = {
      ...this.state,
      entities: this.state.entities.map(e => e.id === entity.id ? entity : e),
    }
  }

  private _advanceUnits(deltaS: number): void {
    const arrivals: RobotEntity[] = []
    const entities = this.state.entities.map(e => {
      // Responders are driven entirely by _advanceResponders (their own movement + work
      // loop), so the generic task/arrival mover must never touch them.
      if (e.kind !== 'robot' || e.status !== 'moving' || (e as RobotEntity).type === 'restoration_unit') return e
      const path: Vec3[] | undefined = (e as any)._path
      // An empty/spent path on a moving unit means it has reached its target → arrival.
      // (null paths never reach here — they're rejected at assign time — so this is always genuine.)
      if (!path || path.length === 0) {
        const arrived: RobotEntity = { ...e, status: 'working' as const }
        arrivals.push(arrived)
        return arrived
      }
      const target = path[0]
      const dx = target.x - e.position.x
      const dz = target.z - e.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      const step = e.speed * deltaS * this.state.cellSizeM
      if (dist <= step) {
        const remaining = path.slice(1)
        ;(e as any)._path = remaining
        const moved: RobotEntity = { ...e, position: { x: target.x, y: e.position.y, z: target.z }, status: remaining.length === 0 ? 'working' as const : 'moving' as const }
        if (remaining.length === 0) arrivals.push(moved)
        return moved
      }
      return { ...e, position: { x: e.position.x + (dx / dist) * step, y: e.position.y, z: e.position.z + (dz / dist) * step } }
    })
    this.state = { ...this.state, entities }

    // Resolve task consequences for everyone who just arrived, then release them to idle so the next plan
    // tick can reassign — this is what keeps drones exploring and builders building module after module.
    for (const r of arrivals) {
      if (r.task) this.onTaskArrival(r, r.task)
      this._setUnitIdle(r.id)
    }
  }

  // ── First-responder loop (Fix 2) ────────────────────────────────────────────
  // Each responder (restoration_unit) autonomously runs the sequence for one home:
  //   a. travel to its assigned house
  //   b. if the house is on fire, knock fireIntensity down 0.2/tick until it hits 0
  //   c. once the fire is out (or there never was one), place one module/tick
  //   d. at modulesComplete === modulesRequired the family is housed and the responder idles
  // Then it picks the next unfinished home. Houses are claimed 1:1 so two responders
  // never converge on the same build site.
  private _advanceResponders(deltaS: number): void {
    const responders = this.state.entities.filter(
      e => e.kind === 'robot' && (e as RobotEntity).type === 'restoration_unit'
    ) as RobotEntity[]
    if (responders.length === 0) return

    // Homes already being serviced this round (skip failed units so a dead responder
    // doesn't lock its house forever — another responder can re-claim it).
    const claimed = new Set<string>(
      responders
        .filter(r => r.status !== 'failed')
        .map(r => (r as any)._houseSiteId as string | undefined)
        .filter((id): id is string => !!id)
    )

    for (const r of responders) {
      if (r.status === 'failed') continue

      let siteId = (r as any)._houseSiteId as string | undefined
      let site = siteId ? this.state.buildSites.find(s => s.id === siteId) : undefined

      // Finished or vanished assignment → release and fall through to re-dispatch.
      if (site && site.status === 'complete') {
        if (siteId) claimed.delete(siteId)
        this._releaseResponder(r.id)
        site = undefined
      }

      // (a-dispatch) Idle / unassigned → claim the nearest reachable unfinished home.
      if (!site) {
        const next = this._nearestOpenHouse(r, claimed)
        if (!next) continue
        const path = findPath(this.state.grid, r.position, next.position, r.clearanceRadius)
        if (path === null) continue
        claimed.add(next.id)
        const moving: any = { ...r, status: 'moving' as const }
        moving._houseSiteId = next.id
        moving._path = path
        this._updateEntity(moving)
        continue
      }

      // (a) En route → step toward the house; arrival flips the unit to 'working'.
      if (r.status === 'moving') {
        this._stepResponder(r, deltaS, site)
        continue
      }

      // (b/c/d) On site → extinguish, then rebuild.
      if (r.status === 'working') {
        this._serviceHouse(r, site)
      }
    }
  }

  // Move a responder one tick along its path (mirrors _advanceUnits' kinematics).
  private _stepResponder(r: RobotEntity, deltaS: number, site: BuildSite): void {
    const path: Vec3[] = ((r as any)._path as Vec3[]) ?? []
    if (path.length === 0) {            // already there → start working, discover the family
      const arrived: any = { ...r, status: 'working' as const }
      arrived._path = []
      this._updateEntity(arrived)
      this._discoverFamily(site.assignedFamilyId)
      return
    }
    const target = path[0]
    const dx = target.x - r.position.x
    const dz = target.z - r.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const stepLen = r.speed * deltaS * this.state.cellSizeM

    if (dist <= stepLen) {
      const remaining = path.slice(1)
      const moved: any = { ...r, position: { x: target.x, y: r.position.y, z: target.z }, status: remaining.length === 0 ? 'working' as const : 'moving' as const }
      moved._path = remaining
      this._updateEntity(moved)
      if (remaining.length === 0) this._discoverFamily(site.assignedFamilyId)
    } else {
      const moved: any = { ...r, position: { x: r.position.x + (dx / dist) * stepLen, y: r.position.y, z: r.position.z + (dz / dist) * stepLen } }
      moved._path = path
      this._updateEntity(moved)
    }
  }

  // On-site work for one tick: firefight while the cell burns, otherwise place a module.
  private _serviceHouse(r: RobotEntity, site: BuildSite): void {
    const gx = Math.round(site.position.x / this.state.cellSizeM)
    const gy = Math.round(site.position.z / this.state.cellSizeM)
    const cell = this.state.grid[gy]?.[gx]
    const fire = cell?.fireIntensity ?? 0

    // (b) House on fire → knock it down 0.2/tick until out; no building yet.
    if (cell && fire > 0) {
      const next = Math.max(0, fire - FIRE_SUPPRESSION_PER_TICK)
      const grid = this.state.grid.map((row, y) =>
        y !== gy ? row : row.map((c, x) =>
          x !== gx ? c : { ...c, fireIntensity: next, fuelLoad: next === 0 ? 0 : c.fuelLoad }
        )
      )
      this.state = { ...this.state, grid }
      if (next === 0) this._narrate('rescue', `${r.id} extinguished the fire at ${site.id} — starting rebuild.`)
      return
    }

    // (c) Fire is out (or there never was one) → place one module this tick.
    const modulesComplete = Math.min(site.modulesRequired, site.modulesComplete + 1)
    const complete = modulesComplete >= site.modulesRequired
    this.state = {
      ...this.state,
      buildSites: this.state.buildSites.map(s =>
        s.id === site.id ? { ...s, modulesComplete, status: complete ? 'complete' as const : 'active' as const } : s
      ),
    }
    // Draw the module from shared stock so timber runs down → triggers the recycled-panel switch.
    this.state = deductMaterial(this.state, site.materialChoice, 1)

    if (complete) {
      // (d) Family housed; responder released to pick up the next home.
      if (site.assignedFamilyId) {
        this.state = {
          ...this.state,
          entities: this.state.entities.map(e =>
            e.id === site.assignedFamilyId && e.kind === 'person'
              ? { ...e, status: 'housed' as const, housedAtTick: this.state.tick }
              : e
          ),
        }
      }
      this._narrate('rebuild', `${site.id} complete — ${site.assignedFamilyId ?? 'family'} housed (${site.materialChoice.replace(/_/g, ' ')}).`)
      this._releaseResponder(r.id)
    } else {
      this._narrate('rebuild', `${site.id}: module ${modulesComplete}/${site.modulesRequired} placed.`)
    }
  }

  // Nearest unfinished, unclaimed home this responder can actually path to.
  private _nearestOpenHouse(r: RobotEntity, claimed: Set<string>): BuildSite | null {
    const open = this.state.buildSites
      .filter(s => s.status !== 'complete' && !claimed.has(s.id))
      .sort((a, b) => dist2(a.position, r.position) - dist2(b.position, r.position))
    for (const s of open) {
      if (findPath(this.state.grid, r.position, s.position, r.clearanceRadius) !== null) return s
    }
    return null
  }

  // Flip a still-undiscovered family to discovered when its responder reaches the house.
  private _discoverFamily(famId: string | null): void {
    if (!famId) return
    this.state = {
      ...this.state,
      entities: this.state.entities.map(e =>
        e.id === famId && e.kind === 'person' && e.status === 'undiscovered'
          ? { ...e, status: 'discovered' as const, discoveredAtTick: this.state.tick }
          : e
      ),
    }
  }

  // Return a responder to idle and clear its assignment/path bookkeeping.
  private _releaseResponder(id: string): void {
    this.state = {
      ...this.state,
      entities: this.state.entities.map(e => {
        if (e.id !== id || e.kind !== 'robot') return e
        const n: any = { ...e, status: 'idle' as const, task: null }
        n._path = undefined
        n._houseSiteId = undefined
        return n
      }),
    }
  }

  // Apply the real-world consequence of a unit reaching its task target.
  private onTaskArrival(robot: RobotEntity, task: Task): void {
    switch (task.type) {
      case 'rescue': {
        const target = this._getEntity(task.targetEntityId)
        if (!target || target.kind !== 'person' || target.status === 'rescued' || target.status === 'housed') break
        this.state = {
          ...this.state,
          entities: this.state.entities.map(e =>
            e.id === target.id && e.kind === 'person'
              ? { ...e, status: 'rescued' as const, rescuedAtTick: this.state.tick }
              : e
          ),
        }
        this._narrate('rescue', `${robot.id} reached ${target.id} — survivor secured (urgency ${Math.round((target as PersonEntity).urgencyScore)}).`)
        break
      }
      case 'sort_debris': {
        const target = this._getEntity(task.targetEntityId)
        if (!target || target.kind !== 'debris' || target.salvaged) break
        const debris = target as DebrisEntity
        this.state = {
          ...this.state,
          entities: this.state.entities.map(e =>
            e.id === debris.id && e.kind === 'debris' ? { ...e, salvaged: true } : e
          ),
        }
        // addSalvage updates inventory + carbon; the salvaged flag above is what scoring counts.
        this.state = addSalvage(this.state, debris.debrisType, debris.massKg, debris.kgCo2eIfSalvaged)
        this._narrate('salvage', `Salvaged ${debris.massKg}kg ${debris.debrisType} (+${debris.kgCo2eIfSalvaged} kgCO2e avoided).`)
        break
      }
      case 'build_module': {
        const site = this.state.buildSites.find(s => s.id === task.targetEntityId)
        if (!site || site.status === 'complete') break
        const modulesComplete = Math.min(site.modulesRequired, site.modulesComplete + 1)
        const complete = modulesComplete >= site.modulesRequired
        this.state = {
          ...this.state,
          buildSites: this.state.buildSites.map(s =>
            s.id === site.id ? { ...s, modulesComplete, status: complete ? 'complete' as const : 'active' as const } : s
          ),
        }
        // Deplete one module's worth of the site's material so stock actually runs down —
        // this is what makes the timber shortage reachable organically (not just via the chaos button).
        this.state = deductMaterial(this.state, site.materialChoice, 1)
        if (complete) {
          if (site.assignedFamilyId) {
            this.state = {
              ...this.state,
              entities: this.state.entities.map(e =>
                e.id === site.assignedFamilyId && e.kind === 'person'
                  ? { ...e, status: 'housed' as const, housedAtTick: this.state.tick }
                  : e
              ),
            }
          }
          this._narrate('rebuild', `${site.id} complete — ${site.assignedFamilyId ?? 'family'} housed (${site.materialChoice}).`)
        } else {
          this._narrate('rebuild', `${site.id}: module ${modulesComplete}/${site.modulesRequired} placed.`)
        }
        break
      }
      // recon / haul_material / restore_land have no completion side-effect yet
      default:
        break
    }
  }

  // Vulnerable-first housing (mission objective #1): pair each discovered, unassigned family with the
  // next planned site and activate it, prioritizing high-vulnerability families. Tie-break by who was
  // discovered first. Kept in one helper so the AI can later override the ordering.
  private _updateHousingAssignments(): void {
    const vulnRank: Record<PersonEntity['vulnerability'], number> = { high: 3, medium: 2, low: 1 }
    const assignedFamilyIds = new Set(
      this.state.buildSites.map(s => s.assignedFamilyId).filter((id): id is string => id !== null)
    )
    const families = (this.state.entities.filter(
      e => e.kind === 'person' && (e as PersonEntity).subtype === 'displaced_family'
    ) as PersonEntity[])
      .filter(f => f.status === 'discovered' && !assignedFamilyIds.has(f.id))
      .sort((a, b) => vulnRank[b.vulnerability] - vulnRank[a.vulnerability] || (a.discoveredAtTick ?? 0) - (b.discoveredAtTick ?? 0))
    if (families.length === 0) return

    let famIdx = 0
    const buildSites = this.state.buildSites.map(site => {
      if (site.status !== 'planned' || site.assignedFamilyId) return site
      const fam = families[famIdx]
      if (!fam) return site
      famIdx++
      return { ...site, assignedFamilyId: fam.id, status: 'active' as const }
    })
    if (famIdx > 0) this.state = { ...this.state, buildSites }
  }

  // Mission state machine: deploying → active (once running) → complete (housing goal met or time up).
  // Only MissionClock reads phase today; setting 'complete' is what will gate the debrief + counterfactual.
  private _updatePhase(): void {
    const { phase, score, elapsedSeconds } = this.state
    if (phase === 'complete') return
    const housingGoalMet = score.familiesTotal > 0 && score.familiesHoused >= score.familiesTotal * 0.8
    if (housingGoalMet || elapsedSeconds > 300) {
      this.state = { ...this.state, phase: 'complete' }
    } else if (phase === 'deploying') {
      this.state = { ...this.state, phase: 'active' }
    }
  }

  private _setUnitIdle(id: string): void {
    this.state = {
      ...this.state,
      entities: this.state.entities.map(e => {
        if (e.id !== id || e.kind !== 'robot') return e
        ;(e as any)._path = undefined
        return { ...e, status: 'idle' as const, task: null }
      }),
    }
  }

  private _narrate(agent: AgentType, message: string): void {
    this.state = {
      ...this.state,
      commsLog: [...this.state.commsLog.slice(-99), { tick: this.state.tick, agent, message }],
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Builds the full 100×100 grid. Hazards (fire/flood/rubble) live ONLY inside the
// central disaster core; outside is the seeded suburb (zones drive terrain +
// base traversal cost). Core hazards are authored in core-local cell coords
// (0..50) so the original demo footprint is preserved, just centered.
function buildGrid(zones: import('@/types').ZoneType[][]): GridCell[][] {
  return Array.from({ length: GRID_H }, (_, y) =>
    Array.from({ length: GRID_W }, (_, x) => {
      const zone = zones[y][x]
      const inCore = isCoreCell(x, y)
      // core-local coords (0-based within the 50×50 core)
      const cx = x - (GRID_W / 2 - 25)
      const cy = y - (GRID_H / 2 - 25)

      const isFireZone = inCore && cx < 18 && cy < 20
      const isFloodZone = inCore && cx > 38

      let terrain: GridCell['terrain']
      let traversalCost: number
      if (isFireZone) { terrain = 'rubble'; traversalCost = 2 }
      else if (isFloodZone) { terrain = 'water'; traversalCost = 5 }
      else { terrain = zoneTerrain(zone); traversalCost = zoneBaseCost(zone) }

      return {
        x, y,
        elevation: 10 + Math.sin(x * 0.3) * 3 + Math.cos(y * 0.2) * 2,
        terrain,
        zone,
        traversalCost,
        fireIntensity: isFireZone && cx < 10 && cy < 10 ? 0.7 : 0,
        floodDepth: isFloodZone ? 0.4 : 0,
        fuelLoad: isFireZone ? 0.8 : 0.3,
        // Reveal the southern spawn strip at start (core-local cy > 40 → south edge of core).
        isRevealed: inCore && cy > 40,
      } satisfies GridCell
    })
  )
}

// Shift a legacy (0–250 m frame) position into the centered disaster core.
function offsetPos(p: Vec3): Vec3 {
  return { x: p.x + CORE_OFFSET_X, y: p.y, z: p.z + CORE_OFFSET_Z }
}
function offsetSite<T extends { position: Vec3 }>(s: T): T {
  return { ...s, position: offsetPos(s.position) }
}

// Squared XZ distance (cheap ordering metric).
function dist2(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dz = a.z - b.z
  return dx * dx + dz * dz
}

// One home in the legacy (pre-offset) 0–250 m frame.
interface HouseSpec {
  famId: string
  position: Vec3
  vulnerability: VulnerabilityLevel
  membersCount: number
  damaged: boolean
}

// Lay out `houseCount` homes on an even grid across the core's discoverable interior,
// marking `damagedCount` of them (spread out, not clustered) as on-fire. Deterministic —
// both buildInitialEntities() and createInitialWorld() call this and must agree on positions.
function houseLayout(houseCount: number, damagedCount: number): HouseSpec[] {
  const n = Math.max(0, Math.floor(houseCount))
  const dmg = Math.max(0, Math.min(n, Math.floor(damagedCount)))
  const vulns: VulnerabilityLevel[] = ['high', 'medium', 'low']

  // Evenly distribute the damaged indices across [0, n) so fires aren't bunched.
  const damagedSet = new Set<number>()
  for (let k = 0; k < dmg; k++) damagedSet.add(Math.floor((k * n) / Math.max(1, dmg)))

  // Even square-ish grid inside a band that avoids the pre-set fire core (legacy z < 50)
  // and the eastern flood zone (legacy x > 190), and stays north of the fleet spawn strip.
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)))
  const rows = Math.max(1, Math.ceil(n / cols))
  const X0 = 40, X1 = 180, Z0 = 55, Z1 = 185

  return Array.from({ length: n }, (_, i) => {
    const gx = i % cols
    const gy = Math.floor(i / cols)
    const x = cols === 1 ? (X0 + X1) / 2 : X0 + (gx / (cols - 1)) * (X1 - X0)
    const z = rows === 1 ? (Z0 + Z1) / 2 : Z0 + (gy / (rows - 1)) * (Z1 - Z0)
    return {
      famId: `fam-${i + 1}`,
      position: { x, y: 0, z },
      vulnerability: vulns[i % vulns.length],
      membersCount: 2 + (i % 4),
      damaged: damagedSet.has(i),
    } satisfies HouseSpec
  })
}

// Set fire on the grid cells under the damaged homes. Positions are legacy-frame, so
// shift into the core before indexing. Returns a fresh grid.
function igniteDamagedHouses(grid: GridCell[][], houses: HouseSpec[]): GridCell[][] {
  const next = grid.map(row => row.map(c => ({ ...c })))
  for (const h of houses) {
    if (!h.damaged) continue
    const gx = Math.round((h.position.x + CORE_OFFSET_X) / CELL_SIZE_M)
    const gy = Math.round((h.position.z + CORE_OFFSET_Z) / CELL_SIZE_M)
    const cell = next[gy]?.[gx]
    if (cell) { cell.fireIntensity = DAMAGED_FIRE_START; cell.fuelLoad = 0.8 }
  }
  return next
}

// `droneCount` recon drones staged at the south edge (legacy frame; offset later).
function makeDrones(n: number): RobotEntity[] {
  return Array.from({ length: Math.max(0, Math.floor(n)) }, (_, i) => ({
    kind: 'robot', id: `drone-${i + 1}`, type: 'recon_drone',
    position: { x: 130 + (i % 8) * 11, y: 3, z: 213 - Math.floor(i / 8) * 7 }, status: 'idle', task: null,
    batteryLevel: 1, speed: 4, clearanceRadius: 0,
  }))
}

// `responderCount` first-responder units (restoration_unit) staged at the south edge.
// They are driven exclusively by _advanceResponders — never by the LLM/fallback.
function makeResponders(n: number): RobotEntity[] {
  return Array.from({ length: Math.max(0, Math.floor(n)) }, (_, i) => ({
    kind: 'robot', id: `responder-${i + 1}`, type: 'restoration_unit',
    position: { x: 130 + (i % 8) * 8, y: 0, z: 222 + Math.floor(i / 8) * 7 }, status: 'idle', task: null,
    batteryLevel: 1, speed: 1.3, clearanceRadius: 1,
  }))
}

// Parameterised initial roster — spawns ONLY what the four setup counts ask for:
// droneCount drones, responderCount responders, and houseCount displaced families
// (damagedCount of them on fire). No hardcoded spawn numbers.
function buildInitialEntities(
  houseCount = 6,
  damagedCount = houseCount,
  droneCount = 2,
  responderCount = 3,
): Entity[] {
  const robots: RobotEntity[] = [
    ...makeDrones(droneCount),
    ...makeResponders(responderCount),
  ]

  const families: PersonEntity[] = houseLayout(houseCount, damagedCount).map(h => ({
    kind: 'person',
    id: h.famId,
    subtype: 'displaced_family',
    position: h.position,
    status: 'undiscovered',
    vulnerability: h.vulnerability,
    urgencyScore: 10,
    discoveredAtTick: null,
    rescuedAtTick: null,
    housedAtTick: null,
    membersCount: h.membersCount,
  } satisfies PersonEntity))

  // Shift every legacy position into the centered disaster core.
  return [...robots, ...families].map(e => ({ ...e, position: offsetPos(e.position) }))
}
