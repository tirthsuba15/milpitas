import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { WorldState, CommsEntry, AgentType } from '@/types'

interface WorldStore {
  world: WorldState | null
  humanCommand: string
  isRunning: boolean
  debrief: string | null   // AI after-action summary, set once the mission completes (read by the debrief overlay)

  setWorld: (world: WorldState) => void
  patchWorld: (patch: Partial<WorldState>) => void
  setHumanCommand: (cmd: string) => void
  clearHumanCommand: () => void
  addCommsEntry: (agent: AgentType, message: string, actionTag?: string) => void
  setRunning: (running: boolean) => void
  setDebrief: (text: string) => void
}

export const useWorldStore = create<WorldStore>()(
  subscribeWithSelector((set, get) => ({
    world: null,
    humanCommand: '',
    isRunning: false,
    debrief: null,

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

    setRunning: (running) => set({ isRunning: running }),
    setDebrief: (debrief) => set({ debrief }),
  }))
)
