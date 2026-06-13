import { describe, it, expect } from 'vitest'
import { createInitialWorld } from './World'
import { findPath } from './pathfinding'
import type { PersonEntity, RobotEntity } from '@/types'

describe('initial world — 6 families / 6 sites / 3 builders, all reachable', () => {
  const state = createInitialWorld()

  it('has 6 displaced families and 6 build sites (clean "X/6")', () => {
    const families = state.entities.filter(
      (e) => e.kind === 'person' && (e as PersonEntity).subtype === 'displaced_family',
    )
    expect(families).toHaveLength(6)
    expect(state.buildSites).toHaveLength(6)
  })

  it('has 3 builder robots (so 6 homes are reachable within demo time)', () => {
    const builders = state.entities.filter(
      (e) => e.kind === 'robot' && (e as RobotEntity).type === 'builder_robot',
    )
    expect(builders).toHaveLength(3)
  })

  it('every build site is reachable from the builder spawn — no site walled off by hazards', () => {
    const builder = state.entities.find(
      (e) => e.kind === 'robot' && (e as RobotEntity).type === 'builder_robot',
    ) as RobotEntity
    for (const site of state.buildSites) {
      const path = findPath(state.grid, builder.position, site.position, builder.clearanceRadius)
      expect(path, `site ${site.id} is unreachable from spawn`).not.toBeNull()
    }
  })
})
