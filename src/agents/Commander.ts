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
    const summary = serializeWorldState(finalState)
    return (await debriefCall(summary)) ?? 'Mission complete — families housed and embodied carbon held well below the conventional baseline.'
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
