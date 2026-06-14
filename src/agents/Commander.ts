import { planningCall, debriefCall } from './client'
import { serializeWorldState } from './serializer'
import { fallbackPlan } from './fallback'
import type { WorldState, AgentPlanResponse } from '@/types'

const PLANNING_INTERVAL_MS = 3000   // LLM called every 3 seconds
const REPLAN_URGENCY_THRESHOLD = 90  // person urgency that triggers immediate replan

export class Commander {
  private lastPlanAt = 0
  private pendingHumanCommand = ''
  private replanPending = false
  private inFlight = false
  // Track crises we've already reacted to, so a person sitting above the urgency
  // threshold (or a unit staying failed) triggers ONE immediate replan — not a new
  // LLM call every 33ms tick while the condition persists.
  private reactedCriticalIds = new Set<string>()
  private reactedFailedIds = new Set<string>()

  injectHumanCommand(cmd: string): void {
    this.pendingHumanCommand = cmd
    this.replanPending = true
  }

  async maybePlan(state: WorldState, nowMs: number, applyFn: (plan: AgentPlanResponse) => void): Promise<void> {
    if (this.inFlight) return   // never overlap LLM calls

    const newEvent = this._hasNewSignificantEvent(state)   // call unconditionally so the reacted-sets stay fresh
    const shouldPlan =
      nowMs - this.lastPlanAt >= PLANNING_INTERVAL_MS ||
      this.replanPending ||
      newEvent

    if (!shouldPlan) return
    this.lastPlanAt = nowMs
    this.replanPending = false
    this.inFlight = true

    const context = {
      worldSummary: serializeWorldState(state),
      humanCommand: this.pendingHumanCommand || undefined,
      recentEvents: state.activeEvents,
      availableUnitIds: [],
    }
    this.pendingHumanCommand = ''

    try {
      const plan = await planningCall(context)
      applyFn(plan ?? fallbackPlan(state))
    } catch (err) {
      console.warn('[AI] maybePlan failed, applying fallback', err)
      applyFn(fallbackPlan(state))
    } finally {
      this.inFlight = false
    }
  }

  async generateDebrief(finalState: WorldState): Promise<string> {
    const m = this.computeFleetMetrics(finalState)
    const r = this.recommendation(m)

    const fleetBlock = [
      'FLEET EFFICIENCY',
      `totalDronesDeployed=${m.totalDronesDeployed}`,
      `totalTeamsDeployed=${m.totalTeamsDeployed}`,
      `housesTotal=${m.housesTotal}`,
      `housesCompleted=${m.housesCompleted}`,
      `survivorsTotal=${m.survivorsTotal}`,
      `survivorsRescued=${m.survivorsRescued}`,
      `totalCompletionTimeSeconds=${m.totalCompletionTimeSeconds}`,
      `sitesWithMultipleBuilders=${m.sitesWithMultipleBuilders}`,
      `averageTeamIdlePercent=${m.averageTeamIdlePercent}`,
    ].join('\n')

    const instructions =
      "Write a 3-sentence coordinator after-action assessment in plain prose. " +
      "It MUST follow this structure and always include specific numbers: " +
      "'You deployed X teams for Y houses. [efficient / too many / too few]. " +
      "Deploy N teams next time. Time could be cut by Z% with more drones.' " +
      "Never be vague; always give a concrete number to change. " +
      `Use the recommended values: recommendedTeams=${r.recommendedTeams}, ` +
      `droneTimeCut=${r.droneTimeCutPercent}%, judgment=${r.judgment}.`

    const userContent = `${serializeWorldState(finalState)}\n\n${fleetBlock}\n\n${instructions}`

    const text = await debriefCall(userContent)
    // deterministic specific-numbers fallback when the LLM is off/fails — never a vague string.
    return text ?? this.assessmentText(m, r)
  }

  private computeFleetMetrics(state: WorldState) {
    const robots = state.entities.filter((e) => e.kind === 'robot')
    const persons = state.entities.filter((e) => e.kind === 'person')

    const totalDronesDeployed = robots.filter((e) => (e as any).type === 'recon_drone').length
    // Count responders (restoration_unit) as "teams"; fall back to builder_robot for legacy worlds.
    const responders = robots.filter((e) => (e as any).type === 'restoration_unit')
    const builders  = robots.filter((e) => (e as any).type === 'builder_robot')
    const totalTeamsDeployed = responders.length || builders.length

    const housesTotal = state.buildSites.length
    const housesCompleted = state.buildSites.filter((s) => s.status === 'complete').length

    // Displaced families are the "people" in the new world — housed = mission success.
    // Legacy worlds may also have survivor subtype; count both.
    const families = persons.filter((e) =>
      (e as any).subtype === 'displaced_family' || (e as any).subtype === 'survivor'
    )
    const survivorsTotal = families.length
    const survivorsRescued = families.filter((e) => {
      const status = (e as any).status
      return status === 'rescued' || status === 'housed'
    }).length

    const totalCompletionTimeSeconds = Math.round(state.elapsedSeconds)

    // Snapshot congestion: distinct build-site ids targeted by >1 active building builder.
    const builderTargetCounts = new Map<string, number>()
    for (const b of builders) {
      const task = (b as any).task
      if ((b as any).status !== 'idle' && task?.type === 'build_module' && task.targetEntityId) {
        builderTargetCounts.set(task.targetEntityId, (builderTargetCounts.get(task.targetEntityId) ?? 0) + 1)
      }
    }
    let sitesWithMultipleBuilders = 0
    for (const count of builderTargetCounts.values()) {
      if (count > 1) sitesWithMultipleBuilders++
    }

    // Estimate: per-tick idle isn't tracked, so over-capacity is proxied by excess teams.
    const averageTeamIdlePercent =
      totalTeamsDeployed > housesTotal
        ? Math.min(95, Math.round(((totalTeamsDeployed - housesTotal) / totalTeamsDeployed) * 100))
        : 0

    return {
      totalDronesDeployed,
      totalTeamsDeployed,
      housesTotal,
      housesCompleted,
      survivorsTotal,
      survivorsRescued,
      totalCompletionTimeSeconds,
      sitesWithMultipleBuilders,
      averageTeamIdlePercent,
    }
  }

  private recommendation(m: ReturnType<Commander['computeFleetMetrics']>) {
    const recommendedTeams = Math.max(2, Math.min(m.housesTotal, Math.round(m.housesTotal / 1.5)))
    const judgment =
      m.totalTeamsDeployed > recommendedTeams
        ? 'too many teams'
        : m.totalTeamsDeployed < recommendedTeams
          ? 'too few teams'
          : 'an efficient deployment'
    const idealDrones = Math.max(2, Math.ceil(m.housesTotal / 3))
    const droneTimeCutPercent = Math.max(
      0,
      Math.min(50, Math.round(((idealDrones - m.totalDronesDeployed) / idealDrones) * 35)),
    )
    return { recommendedTeams, judgment, droneTimeCutPercent }
  }

  private assessmentText(
    m: ReturnType<Commander['computeFleetMetrics']>,
    r: ReturnType<Commander['recommendation']>,
  ): string {
    return `You deployed ${m.totalTeamsDeployed} teams for ${m.housesTotal} houses — ${r.judgment}. Housed ${m.housesCompleted}/${m.housesTotal}, rescued ${m.survivorsRescued}/${m.survivorsTotal}, in ${m.totalCompletionTimeSeconds}s. Deploy ${r.recommendedTeams} teams next time. Time could be cut by ${r.droneTimeCutPercent}% with more drones.`
  }

  // Returns true only when a NEW crisis appears: a person crossing the urgency
  // threshold for the first time, or a unit newly failing. Resolved/cleared entities
  // drop out of the reacted-sets so a future recurrence can trigger again.
  private _hasNewSignificantEvent(state: WorldState): boolean {
    let isNew = false
    for (const e of state.entities) {
      if (e.kind === 'person') {
        const critical = (e as any).status === 'discovered' && (e as any).urgencyScore > REPLAN_URGENCY_THRESHOLD
        if (critical) {
          if (!this.reactedCriticalIds.has(e.id)) { this.reactedCriticalIds.add(e.id); isNew = true }
        } else {
          this.reactedCriticalIds.delete(e.id)
        }
      } else if (e.kind === 'robot') {
        if ((e as any).status === 'failed') {
          if (!this.reactedFailedIds.has(e.id)) { this.reactedFailedIds.add(e.id); isNew = true }
        } else {
          this.reactedFailedIds.delete(e.id)
        }
      }
    }
    return isNew
  }
}

export const commander = new Commander()
