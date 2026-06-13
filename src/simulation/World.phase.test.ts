import { describe, it, expect } from 'vitest'
import { World, createInitialWorld } from './World'
import type { RobotEntity, PersonEntity, BuildSite } from '@/types'

const SITE1 = { x: 120, y: 0, z: 80 }

describe('P0-2 — build_module depletes inventory (organic timber shortage reachable)', () => {
  it('deducts one module of the site material per module placed', () => {
    const world = new World(createInitialWorld())
    const before = world.state.inventory.importedTimber
    world.state = {
      ...world.state,
      entities: world.state.entities.map((e) =>
        e.id === 'build-1' ? ({ ...e, position: { ...SITE1 } } as RobotEntity) : e,
      ),
      buildSites: world.state.buildSites.map((s) =>
        s.id === 'site-1' ? ({ ...s, status: 'active', assignedFamilyId: 'fam-3' } as BuildSite) : s,
      ),
    }
    world.applyAction({
      type: 'assign_task',
      unitId: 'build-1',
      task: { type: 'build_module', targetEntityId: 'site-1', targetPosition: SITE1, priority: 70 },
      rationale: 'test',
    })
    world.tick(33) // arrival → one module placed

    expect(world.state.inventory.importedTimber).toBe(before - 800)
  })
})

describe('P1-3 — mission phase transitions', () => {
  it('moves deploying → active on the first tick', () => {
    const world = new World(createInitialWorld())
    expect(world.state.phase).toBe('deploying')
    world.tick(33)
    expect(world.state.phase).toBe('active')
  })

  it('moves → complete once ≥80% of families are housed', () => {
    const world = new World(createInitialWorld())
    const families = world.state.entities.filter(
      (e) => e.kind === 'person' && (e as PersonEntity).subtype === 'displaced_family',
    ) as PersonEntity[]
    const houseFive = new Set(families.slice(0, 5).map((f) => f.id))
    world.state = {
      ...world.state,
      entities: world.state.entities.map((e) =>
        houseFive.has(e.id) ? ({ ...e, status: 'housed' } as PersonEntity) : e,
      ),
    }
    world.tick(33)

    expect(world.state.score.familiesHoused).toBeGreaterThanOrEqual(5)
    expect(world.state.phase).toBe('complete')
  })
})
