import { describe, it, expect } from 'vitest'
import { COUNTERFACTUAL_BASELINE } from './counterfactual'
import { createInitialWorld } from '@/simulation/World'

describe('counterfactual baseline', () => {
  it('carbon baseline stays in sync with the sim world baseline (catches drift)', () => {
    expect(COUNTERFACTUAL_BASELINE.carbonKgCo2e).toBe(createInitialWorld().carbon.baselineKgCo2e)
  })

  it('family total matches the initial world (6 homes)', () => {
    const initialFamilies = createInitialWorld().entities.filter(
      (e) => e.kind === 'person' && e.subtype === 'displaced_family',
    ).length
    expect(COUNTERFACTUAL_BASELINE.familiesTotal).toBe(initialFamilies)
  })
})
