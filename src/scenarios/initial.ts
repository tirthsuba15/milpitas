import { bus } from '@/events/bus'
import { commander } from '@/agents/Commander'

// Scripted opening sequence for the demo.
// Call startDemoSequence() when the operator hits START.
export function startDemoSequence(): void {
  bus.emit('demo:camera', { preset: 'wide' })
  useWorldStoreAddComms('commander', 'Haven operational. Deploying recon drones. Mapping disaster zone.')

  // T+8s: Switch to rescue angle as first survivors appear
  setTimeout(() => {
    bus.emit('demo:camera', { preset: 'rescue' })
    commander.injectHumanCommand('fan out all drones to reveal the map as fast as possible')
  }, 8_000)

  // T+20s: Agents take over narration
  setTimeout(() => {
    useWorldStoreAddComms('rescue', 'Three survivors located in the NW fire zone. Urgency critical. Dispatching rescue units.')
    useWorldStoreAddComms('salvage', 'High-value timber debris cluster at grid E7. Initiating salvage to build stock.')
  }, 20_000)

  // T+35s: First build starts
  setTimeout(() => {
    bus.emit('demo:camera', { preset: 'buildsite' })
    useWorldStoreAddComms('rebuild', 'Site-1 activated. Prioritizing family fam-1 — 4 members, high vulnerability. Builder assigned.')
  }, 35_000)
}

// Imported lazily to avoid circular dep
function useWorldStoreAddComms(agent: any, message: string) {
  // Dynamic import to avoid circular dependency at module load time
  import('@/store/worldStore').then(({ useWorldStore }) => {
    useWorldStore.getState().addCommsEntry(agent, message)
  })
}
