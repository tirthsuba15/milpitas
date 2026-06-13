import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { WorldState, CommsEntry, AgentType } from '@/types'

// ─── AI reasoning feed ("Commander's Mind") ──────────────────────────────────
// Not part of the frozen world contract — purely a UI-facing record of the
// commander's plan summaries, per-action rationales, and adaptation triggers.
export type ReasoningKind =
  | 'plan' | 'dispatch' | 'material' | 'reprioritize' | 'reroute' | 'event' | 'human'

export interface ReasoningEntry {
  id: number
  tick: number
  kind: ReasoningKind
  label: string   // short tag, e.g. DISPATCH / MATERIAL
  text: string
}

let reasoningSeq = 0

interface WorldStore {
  world: WorldState | null
  humanCommand: string
  isRunning: boolean
  reasoning: ReasoningEntry[]

  setWorld: (world: WorldState) => void
  patchWorld: (patch: Partial<WorldState>) => void
  setHumanCommand: (cmd: string) => void
  clearHumanCommand: () => void
  addCommsEntry: (agent: AgentType, message: string, actionTag?: string) => void
  pushReasoning: (kind: ReasoningKind, label: string, text: string) => void
  setRunning: (running: boolean) => void
}

export const useWorldStore = create<WorldStore>()(
  subscribeWithSelector((set, get) => ({
    world: null,
    humanCommand: '',
    isRunning: false,
    reasoning: [],

    setWorld: (world) => set({ world }),

    patchWorld: (patch) => {
      const current = get().world
      if (!current) return
      set({ world: { ...current, ...patch } })
    },

    setHumanCommand: (cmd) => set({ humanCommand: cmd }),
    clearHumanCommand: () => set({ humanCommand: '' }),

    addCommsEntry: (agent, message, actionTag) => {
      const current = get().world
      if (!current) return
      const entry: CommsEntry = {
        tick: current.tick,
        agent,
        message,
        actionTag,
      }
      set({
        world: {
          ...current,
          commsLog: [...current.commsLog.slice(-99), entry],
        },
      })
    },

    pushReasoning: (kind, label, text) => {
      const current = get().world
      const tick = current?.tick ?? 0
      const log = get().reasoning
      const last = log[log.length - 1]
      // Collapse consecutive duplicates (e.g. repeated fallback rationales)
      if (last && last.kind === kind && last.text === text) return
      const entry: ReasoningEntry = { id: ++reasoningSeq, tick, kind, label, text }
      set({ reasoning: [...log.slice(-49), entry] })
    },

    setRunning: (running) => set({ isRunning: running }),
  }))
)
