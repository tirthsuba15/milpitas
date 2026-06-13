import type { AgentType, MaterialChoice, Vec3 } from './world'

// ─── Actions the LLM can emit ────────────────────────────────────────────────

export interface AssignTaskAction {
  type: 'assign_task'
  unitId: string
  task: {
    type: 'rescue' | 'recon' | 'sort_debris' | 'haul_material' | 'build_module' | 'restore_land'
    targetEntityId: string
    targetPosition: Vec3
    priority: number
  }
  rationale: string
}

export interface ReprioritizeAction {
  type: 'reprioritize'
  targetEntityId: string
  newPriority: number
  rationale: string
}

export interface AllocateMaterialAction {
  type: 'allocate_material'
  siteId: string
  materialChoice: MaterialChoice
  rationale: string
}

export interface RerouteAction {
  type: 'reroute'
  unitId: string
  avoidCells: { x: number; y: number }[]
  rationale: string
}

export interface NarrateAction {
  type: 'narrate'
  agent: AgentType
  message: string
}

export type AgentAction =
  | AssignTaskAction
  | ReprioritizeAction
  | AllocateMaterialAction
  | RerouteAction
  | NarrateAction

// ─── Full planning response the LLM returns ──────────────────────────────────

export interface AgentPlanResponse {
  agent: AgentType
  actions: AgentAction[]
  summary: string   // one line → comms log
}

// ─── Planning context sent to the LLM ────────────────────────────────────────

export interface PlanningContext {
  worldSummary: string        // serialized compact world state
  humanCommand?: string       // operator override, if any
  recentEvents: string[]      // events since last tick worth flagging
  availableUnitIds: string[]  // only idle/re-assignable units
}
