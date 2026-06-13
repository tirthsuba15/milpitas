import type { WorldState, PersonEntity } from '@/types'

export function updateScore(state: WorldState): WorldState {
  const people = state.entities.filter(e => e.kind === 'person') as PersonEntity[]

  const familiesTotal = people.filter(p => p.subtype === 'displaced_family').length
  const familiesHoused = people.filter(p => p.subtype === 'displaced_family' && p.status === 'housed').length
  const peopleTotal = people.filter(p => p.subtype === 'survivor').length
  const peopleRescued = people.filter(p => p.subtype === 'survivor' && (p.status === 'rescued' || p.status === 'housed')).length

  // Vulnerable-first %: of housed families, what % were higher vulnerability than unhoused ones?
  const housedFamilies = people.filter(p => p.subtype === 'displaced_family' && p.status === 'housed')
  const vulnerableHousedPct = familiesHoused === 0 ? 0 : calcVulnerablePct(housedFamilies)

  const wasteDivertedKg = state.entities
    .filter(e => e.kind === 'debris' && (e as any).salvaged)
    .reduce((sum, e) => sum + (e as any).massKg, 0)

  return {
    ...state,
    score: {
      familiesHoused,
      familiesTotal,
      vulnerableHousedPct,
      peopleRescued,
      peopleTotal,
      wasteDivertedKg,
    },
  }
}

function calcVulnerablePct(housed: PersonEntity[]): number {
  if (housed.length === 0) return 0
  const scores = { high: 3, medium: 2, low: 1 } as const
  const avgVuln = housed.reduce((s, p) => s + scores[p.vulnerability], 0) / housed.length
  return Math.round((avgVuln / 3) * 100)
}
