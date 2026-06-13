import { describe, it, expect } from 'vitest'
import { World, createInitialWorld } from './World'
import type { RobotEntity, PersonEntity, DebrisEntity, BuildSite, Vec3 } from '@/types'

const SITE1_POS = { x: 120, y: 0, z: 80 } // site-1 and fam-3 live here

function makeWorld(): World {
  return new World(createInitialWorld())
}

/** Move a robot onto a position so we can test arrival without simulating long travel. */
function placeRobot(world: World, id: string, pos: Vec3): void {
  world.state = {
    ...world.state,
    entities: world.state.entities.map((e) =>
      e.id === id && e.kind === 'robot' ? ({ ...e, position: { ...pos } } as RobotEntity) : e,
    ),
  }
}

function assign(world: World, unitId: string, type: string, targetEntityId: string, targetPosition: Vec3): void {
  world.applyAction({
    type: 'assign_task',
    unitId,
    task: { type, targetEntityId, targetPosition, priority: 80 } as never,
    rationale: 'test',
  })
}

describe('onTaskArrival — build_module completes a home and houses its family', () => {
  it('completing all required modules of an active site marks it complete and houses the assigned family', () => {
    const world = makeWorld()
    placeRobot(world, 'build-1', SITE1_POS)
    world.state = {
      ...world.state,
      entities: world.state.entities.map((e) =>
        e.id === 'fam-3' ? ({ ...e, status: 'discovered' } as PersonEntity) : e,
      ),
      buildSites: world.state.buildSites.map((s) =>
        s.id === 'site-1' ? ({ ...s, status: 'active', assignedFamilyId: 'fam-3' } as BuildSite) : s,
      ),
    }

    // Each completed module releases the builder to idle, so re-issue the task per module.
    for (let i = 0; i < 4; i++) {
      assign(world, 'build-1', 'build_module', 'site-1', SITE1_POS)
      world.tick(33)
    }

    const site = world.state.buildSites.find((s) => s.id === 'site-1')!
    const fam = world.state.entities.find((e) => e.id === 'fam-3') as PersonEntity
    expect(site.modulesComplete).toBe(4)
    expect(site.status).toBe('complete')
    expect(fam.status).toBe('housed')
    expect(fam.housedAtTick).not.toBeNull()
  })
})

describe('housing assignment — a discovered family activates a planned site', () => {
  it('assigns a discovered displaced_family to a planned site and flips it to active', () => {
    const world = makeWorld()
    world.state = {
      ...world.state,
      entities: world.state.entities.map((e) =>
        e.id === 'fam-3' ? ({ ...e, status: 'discovered' } as PersonEntity) : e,
      ),
    }

    world.tick(33)

    const assigned = world.state.buildSites.find((s) => s.assignedFamilyId === 'fam-3')
    expect(assigned).toBeDefined()
    expect(assigned!.status).toBe('active')
  })
})

describe('onTaskArrival — unreachable target does not falsely complete (advisor regression guard)', () => {
  it('a rescue assigned to a survivor walled off by fire never moves the unit or marks the survivor rescued', () => {
    const world = makeWorld()
    const surv = world.state.entities.find((e) => e.id === 'surv-1') as PersonEntity // grid (6,6), inside fire seed
    assign(world, 'rescue-1', 'rescue', 'surv-1', { ...surv.position })

    for (let i = 0; i < 5; i++) world.tick(33)

    const rescuer = world.state.entities.find((e) => e.id === 'rescue-1') as RobotEntity
    const survivor = world.state.entities.find((e) => e.id === 'surv-1') as PersonEntity
    expect(rescuer.status).not.toBe('working')
    expect(survivor.status).not.toBe('rescued')
  })
})

describe('onTaskArrival — rescue secures a reachable survivor', () => {
  it('marks the survivor rescued when the rescue unit arrives', () => {
    const world = makeWorld()
    const surv2 = world.state.entities.find((e) => e.id === 'surv-2') as PersonEntity // grid (20,10), reachable
    placeRobot(world, 'rescue-1', surv2.position)
    assign(world, 'rescue-1', 'rescue', 'surv-2', { ...surv2.position })

    world.tick(33)

    const survivor = world.state.entities.find((e) => e.id === 'surv-2') as PersonEntity
    expect(survivor.status).toBe('rescued')
    expect(survivor.rescuedAtTick).not.toBeNull()
  })
})

describe('onTaskArrival — sort_debris salvages material and updates the ledger', () => {
  it('marks debris salvaged and adds its mass + avoided carbon to the ledger', () => {
    const world = makeWorld()
    const deb = world.state.entities.find((e) => e.id === 'deb-1') as DebrisEntity // timber, 2000kg, reachable
    placeRobot(world, 'sort-1', deb.position)
    const carbonBefore = world.state.carbon.avoidedKgCo2e
    assign(world, 'sort-1', 'sort_debris', 'deb-1', { ...deb.position })

    world.tick(33)

    const after = world.state.entities.find((e) => e.id === 'deb-1') as DebrisEntity
    expect(after.salvaged).toBe(true)
    expect(world.state.inventory.salvagedTimber).toBe(2000)
    expect(world.state.carbon.avoidedKgCo2e).toBeGreaterThan(carbonBefore)
  })
})
