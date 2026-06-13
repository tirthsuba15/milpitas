import { describe, it, expect } from 'vitest'
import { World, createInitialWorld } from './World'
import { fallbackPlan } from '@/agents/fallback'
import { addNewFamilies } from '@/scenarios/chaos'

// End-to-end check of the exact loop App.tsx runs offline: World.tick + fallbackPlan + applyAction.
// Fast-forwarded (no real-time gate) so we can watch a full house get built and a family housed.
describe('integration — the autonomous fallback loop houses a family end-to-end', () => {
  it('drives drones + builder via the rule-based fallback until at least one family is housed', () => {
    const world = new World(createInitialWorld())
    addNewFamilies(world) // same effect as the "New Families" chaos button: discovered families + surge sites

    const TICK_MS = 33
    const PLAN_EVERY = 90 // ~3s, mirrors the Commander planning cadence
    const MAX_TICKS = 8000

    let housedAtTick = -1
    for (let t = 1; t <= MAX_TICKS; t++) {
      world.tick(TICK_MS)
      if (t % PLAN_EVERY === 0) {
        for (const action of fallbackPlan(world.state).actions) world.applyAction(action)
      }
      if (world.state.score.familiesHoused > 0) {
        housedAtTick = t
        break
      }
    }

    // Surface the mission narration so a human can read what actually happened.
    const comms = world.state.commsLog
      .slice(-14)
      .map((c) => `  [t${c.tick}] ${c.agent.toUpperCase()}: ${c.message}`)
      .join('\n')
    const completed = world.state.buildSites.filter((s) => s.status === 'complete').map((s) => s.id)
    /* eslint-disable no-console */
    console.log('\n=== Autonomous mission result ===')
    console.log(`First family housed at tick ${housedAtTick} (~${(housedAtTick * TICK_MS) / 1000}s sim time)`)
    console.log(
      `Score: ${world.state.score.familiesHoused}/${world.state.score.familiesTotal} families housed | ` +
        `${world.state.score.peopleRescued}/${world.state.score.peopleTotal} rescued | ` +
        `${world.state.carbon.avoidedKgCo2e.toFixed(0)} kgCO2e avoided`,
    )
    console.log(`Completed sites: ${completed.join(', ') || 'none'}`)
    console.log(`Recent comms log:\n${comms}`)
    /* eslint-enable no-console */

    expect(housedAtTick).toBeGreaterThan(0)
    expect(world.state.score.familiesHoused).toBeGreaterThanOrEqual(1)
    expect(completed.length).toBeGreaterThanOrEqual(1)
  }, 30000)
})
