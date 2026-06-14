import type { AgentAction, WorldState } from '@/types'

type EventMap = {
  'world:tick': WorldState
  'agent:action': AgentAction
  'chaos:timber_shortage': void
  'chaos:second_storm': void
  'chaos:new_families': void
  'demo:start': void
  'demo:camera': { preset: 'wide' | 'buildsite' | 'rescue' | 'debrief' }
  'mission:reset': void
}

type Listener<T> = T extends void ? () => void : (payload: T) => void

class EventBus {
  private listeners = new Map<string, Set<Function>>()

  on<K extends keyof EventMap>(event: K, fn: Listener<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(fn)
    return () => this.listeners.get(event)?.delete(fn)
  }

  emit<K extends keyof EventMap>(
    event: K,
    ...args: EventMap[K] extends void ? [] : [EventMap[K]]
  ): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args))
  }

  off<K extends keyof EventMap>(event: K, fn: Function): void {
    this.listeners.get(event)?.delete(fn)
  }
}

export const bus = new EventBus()
