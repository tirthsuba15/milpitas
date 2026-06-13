import { describe, it, expect } from 'vitest'
import { World, createInitialWorld } from './World'
import { addNewFamilies } from '@/scenarios/chaos'
import type { PersonEntity } from '@/types'

// Verifies the three operator chaos controls at the World level (the demo's climax).
// Pure verification — these call existing public methods and assert; no production code changes.
const makeWorld = () => new World(createInitialWorld())

describe('chaos — triggerTimberShortage', () => {
  it('zeroes imported timber + panels and flags the event', () => {
    const world = makeWorld()
    expect(world.state.inventory.importedTimber).toBeGreaterThan(0)

    world.triggerTimberShortage()

    expect(world.state.inventory.importedTimber).toBe(0)
    expect(world.state.inventory.importedPanels).toBe(0)
    expect(world.state.activeEvents).toContain('timber_shortage')
  })
})

describe('chaos — triggerSecondStorm', () => {
  it('shifts wind south and ignites new fire cells in the north', () => {
    const world = makeWorld()
    const fireBefore = world.state.grid.flat().filter((c) => c.fireIntensity > 0.1).length

    world.triggerSecondStorm()

    const fireAfter = world.state.grid.flat().filter((c) => c.fireIntensity > 0.1).length
    expect(world.state.windDirection).toEqual({ dx: 0, dy: 1 })
    expect(fireAfter).toBeGreaterThan(fireBefore)
    expect(world.state.activeEvents).toContain('second_storm')
  })
})

describe('chaos — addNewFamilies', () => {
  it('adds 4 discovered families + 2 build sites and raises familiesTotal', () => {
    const world = makeWorld()
    const countFamilies = () =>
      world.state.entities.filter(
        (e) => e.kind === 'person' && (e as PersonEntity).subtype === 'displaced_family',
      ).length
    const famBefore = countFamilies()
    const sitesBefore = world.state.buildSites.length

    addNewFamilies(world)
    world.tick(33) // let updateScore recompute familiesTotal from entities

    expect(countFamilies()).toBe(famBefore + 4)
    expect(world.state.buildSites.length).toBe(sitesBefore + 2)
    expect(world.state.score.familiesTotal).toBe(famBefore + 4)
  })
})
