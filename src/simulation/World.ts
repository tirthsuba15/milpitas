import type { WorldState, Entity, GridCell, AgentAction, RobotEntity, PersonEntity, DebrisEntity, Task, AgentType, Vec3 } from '@/types'
import { findPath } from './pathfinding'
import { spreadHazards } from './hazards'
import { decayPersonUrgency, updateFogOfWar } from './entities'
import { updateCarbonLedger, addSalvage } from './ledger'
import { updateScore } from './scoring'
import { bus } from '@/events/bus'

const GRID_W = 50
const GRID_H = 50
const CELL_SIZE_M = 5

export function createInitialWorld(): WorldState {
  const grid = buildGrid()
  const entities = buildInitialEntities()

  return {
    tick: 0,
    elapsedSeconds: 0,
    phase: 'deploying',
    entities,
    grid,
    gridWidth: GRID_W,
    gridHeight: GRID_H,
    cellSizeM: CELL_SIZE_M,
    buildSites: [
      { id: 'site-1', position: { x: 120, y: 0, z: 80 },  modulesRequired: 4, modulesComplete: 0, status: 'planned', assignedFamilyId: null, materialChoice: 'imported_timber', kgCo2eSpent: 0 },
      { id: 'site-2', position: { x: 140, y: 0, z: 100 }, modulesRequired: 4, modulesComplete: 0, status: 'planned', assignedFamilyId: null, materialChoice: 'imported_timber', kgCo2eSpent: 0 },
      { id: 'site-3', position: { x: 160, y: 0, z: 80 },  modulesRequired: 4, modulesComplete: 0, status: 'planned', assignedFamilyId: null, materialChoice: 'imported_timber', kgCo2eSpent: 0 },
      { id: 'site-4', position: { x: 120, y: 0, z: 110 }, modulesRequired: 4, modulesComplete: 0, status: 'planned', assignedFamilyId: null, materialChoice: 'imported_timber', kgCo2eSpent: 0 },
      { id: 'site-5', position: { x: 150, y: 0, z: 120 }, modulesRequired: 4, modulesComplete: 0, status: 'planned', assignedFamilyId: null, materialChoice: 'imported_timber', kgCo2eSpent: 0 },
      { id: 'site-6', position: { x: 170, y: 0, z: 100 }, modulesRequired: 4, modulesComplete: 0, status: 'planned', assignedFamilyId: null, materialChoice: 'imported_timber', kgCo2eSpent: 0 },
    ],
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
    score: { familiesHoused: 0, familiesTotal: 6, vulnerableHousedPct: 0, peopleRescued: 0, peopleTotal: 8, wasteDivertedKg: 0 },
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
    this.state = { ...this.state, grid: spreadHazards(this.state, deltaS) }
    this.state = decayPersonUrgency(this.state, deltaS)
    this.state = updateFogOfWar(this.state)
    this._updateHousingAssignments()   // after discovery is set in updateFogOfWar
    this.state = updateScore(this.state)
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
    const grid = this.state.grid.map(row => row.map(cell => {
      if (cell.y < 15 && cell.x > 20 && cell.x < 35) return { ...cell, fireIntensity: Math.min(1, cell.fireIntensity + 0.8), fuelLoad: 1 }
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
      if (e.kind !== 'robot' || e.status !== 'moving') return e
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

function buildGrid(): GridCell[][] {
  return Array.from({ length: GRID_H }, (_, y) =>
    Array.from({ length: GRID_W }, (_, x) => {
      const isFireZone = x < 18 && y < 20
      const isFloodZone = x > 38
      return {
        x, y,
        elevation: 10 + Math.sin(x * 0.3) * 3 + Math.cos(y * 0.2) * 2,
        terrain: isFireZone ? 'rubble' : isFloodZone ? 'water' : 'clear',
        traversalCost: isFireZone ? 2 : isFloodZone ? 5 : 1,
        fireIntensity: isFireZone && x < 10 && y < 10 ? 0.7 : 0,
        floodDepth: isFloodZone ? 0.4 : 0,
        fuelLoad: isFireZone ? 0.8 : 0.3,
        isRevealed: y > 40,   // only spawn area revealed at start
      } satisfies GridCell
    })
  )
}

function buildInitialEntities(): Entity[] {
  const robots: RobotEntity[] = [
    { kind: 'robot', id: 'drone-1', type: 'recon_drone',   position: {x:125,y:2,z:225}, status: 'idle', task: null, batteryLevel: 1, speed: 4, clearanceRadius: 0 },
    { kind: 'robot', id: 'drone-2', type: 'recon_drone',   position: {x:135,y:2,z:225}, status: 'idle', task: null, batteryLevel: 1, speed: 4, clearanceRadius: 0 },
    { kind: 'robot', id: 'rescue-1', type: 'rescue_unit',  position: {x:120,y:0,z:230}, status: 'idle', task: null, batteryLevel: 1, speed: 1.5, clearanceRadius: 1 },
    { kind: 'robot', id: 'rescue-2', type: 'rescue_unit',  position: {x:130,y:0,z:230}, status: 'idle', task: null, batteryLevel: 1, speed: 1.5, clearanceRadius: 1 },
    { kind: 'robot', id: 'medic-1',  type: 'medic',        position: {x:140,y:0,z:230}, status: 'idle', task: null, batteryLevel: 1, speed: 1.2, clearanceRadius: 1 },
    { kind: 'robot', id: 'sort-1',   type: 'sorting_robot',position: {x:150,y:0,z:230}, status: 'idle', task: null, batteryLevel: 1, speed: 1,   clearanceRadius: 1 },
    { kind: 'robot', id: 'haul-1',   type: 'hauler',       position: {x:160,y:0,z:230}, status: 'idle', task: null, batteryLevel: 1, speed: 1.2, clearanceRadius: 1 },
    { kind: 'robot', id: 'build-1',  type: 'builder_robot',position: {x:170,y:0,z:230}, status: 'idle', task: null, batteryLevel: 1, speed: 0.8, clearanceRadius: 1 },
    { kind: 'robot', id: 'build-2',  type: 'builder_robot',position: {x:180,y:0,z:230}, status: 'idle', task: null, batteryLevel: 1, speed: 0.8, clearanceRadius: 1 },
    { kind: 'robot', id: 'build-3',  type: 'builder_robot',position: {x:110,y:0,z:230}, status: 'idle', task: null, batteryLevel: 1, speed: 0.8, clearanceRadius: 1 },
  ]

  const people: PersonEntity[] = [
    { kind: 'person', id: 'fam-1', subtype: 'displaced_family', position: {x:40,y:0,z:60},  status: 'undiscovered', vulnerability: 'high',   urgencyScore: 20, discoveredAtTick: null, rescuedAtTick: null, housedAtTick: null, membersCount: 4 },
    { kind: 'person', id: 'fam-2', subtype: 'displaced_family', position: {x:80,y:0,z:40},  status: 'undiscovered', vulnerability: 'high',   urgencyScore: 25, discoveredAtTick: null, rescuedAtTick: null, housedAtTick: null, membersCount: 5 },
    { kind: 'person', id: 'fam-3', subtype: 'displaced_family', position: {x:120,y:0,z:80}, status: 'undiscovered', vulnerability: 'medium', urgencyScore: 10, discoveredAtTick: null, rescuedAtTick: null, housedAtTick: null, membersCount: 3 },
    { kind: 'person', id: 'fam-4', subtype: 'displaced_family', position: {x:60,y:0,z:120}, status: 'undiscovered', vulnerability: 'low',    urgencyScore: 5,  discoveredAtTick: null, rescuedAtTick: null, housedAtTick: null, membersCount: 2 },
    { kind: 'person', id: 'fam-5', subtype: 'displaced_family', position: {x:100,y:0,z:100},status: 'undiscovered', vulnerability: 'medium', urgencyScore: 15, discoveredAtTick: null, rescuedAtTick: null, housedAtTick: null, membersCount: 4 },
    { kind: 'person', id: 'fam-6', subtype: 'displaced_family', position: {x:140,y:0,z:60}, status: 'undiscovered', vulnerability: 'high',   urgencyScore: 30, discoveredAtTick: null, rescuedAtTick: null, housedAtTick: null, membersCount: 5 },
    { kind: 'person', id: 'surv-1', subtype: 'survivor',        position: {x:30,y:0,z:30},  status: 'undiscovered', vulnerability: 'high',   urgencyScore: 50, discoveredAtTick: null, rescuedAtTick: null, housedAtTick: null, membersCount: 1 },
    { kind: 'person', id: 'surv-2', subtype: 'survivor',        position: {x:100,y:0,z:50}, status: 'undiscovered', vulnerability: 'medium', urgencyScore: 30, discoveredAtTick: null, rescuedAtTick: null, housedAtTick: null, membersCount: 1 },
  ]

  const debris: DebrisEntity[] = [
    { kind: 'debris', id: 'deb-1', position: {x:50,y:0,z:80},  debrisType: 'timber',           massKg: 2000, kgCo2eIfSalvaged: 2400, salvaged: false },
    { kind: 'debris', id: 'deb-2', position: {x:70,y:0,z:60},  debrisType: 'steel',            massKg: 1500, kgCo2eIfSalvaged: 2800, salvaged: false },
    { kind: 'debris', id: 'deb-3', position: {x:90,y:0,z:100}, debrisType: 'aggregate',        massKg: 3000, kgCo2eIfSalvaged: 900,  salvaged: false },
    { kind: 'debris', id: 'deb-4', position: {x:40,y:0,z:110}, debrisType: 'recycled_plastic', massKg: 500,  kgCo2eIfSalvaged: 600,  salvaged: false },
    { kind: 'debris', id: 'deb-5', position: {x:110,y:0,z:70}, debrisType: 'timber',           massKg: 1800, kgCo2eIfSalvaged: 2160, salvaged: false },
    { kind: 'debris', id: 'deb-6', position: {x:60,y:0,z:140}, debrisType: 'contaminated',     massKg: 800,  kgCo2eIfSalvaged: 0,    salvaged: false },
  ]

  return [...robots, ...people, ...debris]
}
