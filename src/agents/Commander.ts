import { planningCall } from './client'
import { serializeWorldState } from './serializer'
import { fallbackPlan } from './fallback'
import type { WorldState, AgentPlanResponse } from '@/types'

const PLANNING_INTERVAL_MS = 3000   // LLM called every 3 seconds
const REPLAN_URGENCY_THRESHOLD = 90  // person urgency that triggers immediate replan

export class Commander {
  private lastPlanAt = 0
  private pendingHumanCommand = ''
  private replanPending = false

  injectHumanCommand(cmd: string): void {
    this.pendingHumanCommand = cmd
    this.replanPending = true
  }

  async maybePlan(state: WorldState, nowMs: number, applyFn: (plan: AgentPlanResponse) => void): Promise<void> {
    const shouldPlan =
      nowMs - this.lastPlanAt >= PLANNING_INTERVAL_MS ||
      this.replanPending ||
      this._hasSignificantEvent(state)

    if (!shouldPlan) return
    this.lastPlanAt = nowMs
    this.replanPending = false

    const context = {
      worldSummary: serializeWorldState(state),
      humanCommand: this.pendingHumanCommand || undefined,
      recentEvents: state.activeEvents,
      availableUnitIds: [],
    }
    this.pendingHumanCommand = ''

    const plan = await planningCall(context)
    applyFn(plan ?? fallbackPlan(state))
  }

  async generateDebrief(finalState: WorldState): Promise<string> {
    const { planningCall: call } = await import('./client')
    const summary = serializeWorldState(finalState)
    const result = await call({
      worldSummary: `Generate a 2-3 sentence after-action debrief for this completed mission:\n\n${summary}\n\nFocus on: families housed and in what vulnerability order, carbon avoided vs conventional build, and the one key decision that most changed the outcome. Be specific with numbers.`,
      recentEvents: [],
      availableUnitIds: [],
    })
    return result?.summary ?? 'Mission complete.'
  }

  private _hasSignificantEvent(state: WorldState): boolean {
    const criticalPerson = state.entities.some(
      e => e.kind === 'person' && (e as any).urgencyScore > REPLAN_URGENCY_THRESHOLD && (e as any).status === 'discovered'
    )
    const unitFailed = state.entities.some(e => e.kind === 'robot' && (e as any).status === 'failed')
    return criticalPerson || unitFailed
  }
}

export const commander = new Commander()
