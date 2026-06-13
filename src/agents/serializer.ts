import type { WorldState, PersonEntity, RobotEntity, DebrisEntity } from '@/types'

// Produces a compact ~500-token world summary for the LLM planning context.
export function serializeWorldState(state: WorldState): string {
  const people = state.entities.filter(e => e.kind === 'person') as PersonEntity[]
  const robots = state.entities.filter(e => e.kind === 'robot') as RobotEntity[]
  const debris = state.entities.filter(e => e.kind === 'debris' && !(e as DebrisEntity).salvaged) as DebrisEntity[]

  const discovered = people.filter(p => p.status === 'discovered')
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
    .slice(0, 6)
    .map(p => `  ${p.id}(${p.subtype},vuln=${p.vulnerability},urgency=${p.urgencyScore.toFixed(0)},pos=${fmtPos(p.position)})`)
    .join('\n')

  const idleUnits = robots
    .filter(r => r.status === 'idle')
    .map(r => `  ${r.id}(${r.type})`)
    .join('\n')

  const activeUnits = robots
    .filter(r => r.status !== 'idle' && r.status !== 'failed')
    .map(r => `  ${r.id}(${r.type},${r.status},task=${r.task?.type ?? 'none'})`)
    .join('\n')

  const failedUnits = robots.filter(r => r.status === 'failed').map(r => r.id).join(', ')

  const topDebris = debris
    .sort((a, b) => b.kgCo2eIfSalvaged - a.kgCo2eIfSalvaged)
    .slice(0, 4)
    .map(d => `  ${d.id}(${d.debrisType},${d.massKg}kg,saves ${d.kgCo2eIfSalvaged}kgCO2)`)
    .join('\n')

  const sites = state.buildSites
    .map(s => `  ${s.id}(${s.status},${s.modulesComplete}/${s.modulesRequired} modules,mat=${s.materialChoice},family=${s.assignedFamilyId ?? 'unassigned'})`)
    .join('\n')

  const inv = state.inventory
  const invStr = `timber: ${inv.importedTimber}kg imported / ${inv.salvagedTimber.toFixed(0)}kg salvaged | panels: ${inv.importedPanels}kg imported / ${inv.recycledPanels.toFixed(0)}kg recycled`

  const carbonPct = state.carbon.baselineKgCo2e > 0
    ? ((state.carbon.avoidedKgCo2e / state.carbon.baselineKgCo2e) * 100).toFixed(1)
    : '0'

  const activeEvents = state.activeEvents.length ? `ACTIVE EVENTS: ${state.activeEvents.join(', ')}` : ''

  return `=== HAVEN WORLD STATE — tick ${state.tick} (${state.elapsedSeconds.toFixed(0)}s) ===
${activeEvents ? activeEvents + '\n' : ''}
MISSION SCORE: ${state.score.familiesHoused}/${state.score.familiesTotal} families housed | ${state.score.peopleRescued}/${state.score.peopleTotal} rescued | carbon avoided: ${carbonPct}% of baseline

DISCOVERED PEOPLE (sorted by urgency):
${discovered || '  (none discovered yet)'}

IDLE UNITS:
${idleUnits || '  (none)'}

ACTIVE UNITS:
${activeUnits || '  (none)'}
${failedUnits ? `FAILED UNITS: ${failedUnits}` : ''}

UNSALVAGED HIGH-VALUE DEBRIS:
${topDebris || '  (none remaining)'}

BUILD SITES:
${sites}

INVENTORY: ${invStr}
CARBON LEDGER: ${state.carbon.avoidedKgCo2e.toFixed(0)} kgCO2e avoided vs ${state.carbon.spentKgCo2e.toFixed(0)} spent

INSTRUCTIONS: Issue actions to advance the mission. Prioritize high-vulnerability families. If imported timber is low, switch build sites to recycled_panels.`
}

const fmtPos = (v: { x: number; z: number }) => `(${v.x.toFixed(0)},${v.z.toFixed(0)})`
