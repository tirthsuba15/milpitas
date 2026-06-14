import { useEffect, useRef, useState } from 'react'
import { Scene } from './renderer/Scene'
import { HUD } from './hud/HUD'
import { SetupScreen } from './hud/SetupScreen'
import { World, createInitialWorld } from './simulation/World'
import { useWorldStore } from './store/worldStore'
import { commander } from './agents/Commander'
import { bus } from './events/bus'
import { addNewFamilies } from './scenarios/chaos'
import type { AgentPlanResponse } from './types'

const SIM_TICK_MS = 33  // ~30fps simulation rate

// Map an applied plan into the "Commander's Mind" reasoning feed.
// The plan summary is the conclusion; each action's rationale is a discrete decision.
const TASK_LABEL: Record<string, string> = {
  rescue: 'RESCUE', recon: 'RECON', sort_debris: 'SALVAGE',
  haul_material: 'HAUL', build_module: 'BUILD', restore_land: 'RESTORE',
}
function recordReasoning(plan: AgentPlanResponse) {
  const push = useWorldStore.getState().pushReasoning
  // The deterministic fallback emits a generic summary — keep its concrete per-unit
  // rationales but suppress the boilerplate headline so the feed stays signal-dense.
  if (plan.summary && !plan.summary.startsWith('Fallback:')) push('plan', 'PLAN', plan.summary)
  for (const action of plan.actions) {
    switch (action.type) {
      case 'assign_task':
        // Recon + haul re-issue every tick as drones/haulers cycle, drowning the feed. Keep it
        // to consequential dispatches (rescue / salvage / build) so each line is worth reading.
        if (action.task.type !== 'recon' && action.task.type !== 'haul_material') {
          push('dispatch', TASK_LABEL[action.task.type] ?? 'DISPATCH', action.rationale)
        }
        break
      case 'allocate_material':
        push('material', 'MATERIAL', `${action.materialChoice.replace(/_/g, ' ')} — ${action.rationale}`)
        break
      case 'reprioritize':
        push('reprioritize', 'REPRIORITY', action.rationale)
        break
      case 'reroute':
        push('reroute', 'REROUTE', action.rationale)
        break
    }
  }
}

export default function App() {
  const worldRef = useRef<World | null>(null)
  const lastPlanRef = useRef(0)
  const debriefDoneRef = useRef(false)
  const [deployed, setDeployed] = useState(false)
  const { setWorld, setRunning, isRunning } = useWorldStore()

  // Deploy a fresh mission from the setup screen → start the sim.
  function deploy(houses: number, drones: number, teams: number) {
    const world = new World(createInitialWorld(houses, drones, teams))
    worldRef.current = world
    debriefDoneRef.current = false
    useWorldStore.getState().setDebrief('')
    setWorld({ ...world.state })
    setDeployed(true)
    setRunning(true)
  }

  // Initialize world on mount
  useEffect(() => {
    const world = new World(createInitialWorld())
    worldRef.current = world
    setWorld(world.state)

    // Wire up chaos events from the bus
    const offs = [
      bus.on('chaos:timber_shortage', () => {
        worldRef.current?.triggerTimberShortage()
        useWorldStore.getState().addCommsEntry('logistics', 'WARNING: Timber supply exhausted. Switching build sites to recycled panels.', 'TIMBER_SHORTAGE')
        useWorldStore.getState().pushReasoning('event', 'TRIGGER', 'Timber supply exhausted — replanning rebuild around recycled panels.')
        commander.injectHumanCommand('switch all build sites to recycled panels immediately')
      }),
      bus.on('chaos:second_storm', () => {
        worldRef.current?.triggerSecondStorm()
        useWorldStore.getState().addCommsEntry('commander', 'ALERT: Second storm front detected north of site. Wind shifting south. Rerouting all units.', 'SECOND_STORM')
        useWorldStore.getState().pushReasoning('event', 'TRIGGER', 'Second storm front north — rerouting units, shifting work south.')
        commander.injectHumanCommand('second storm incoming from north, prioritize southern build sites and reroute northern units')
      }),
      bus.on('chaos:new_families', () => {
        if (worldRef.current) {
          addNewFamilies(worldRef.current)
          useWorldStore.getState().addCommsEntry('rescue', 'New families arriving at northern perimeter — 4 high-vulnerability households need housing.', 'NEW_FAMILIES')
          useWorldStore.getState().pushReasoning('event', 'TRIGGER', '4 high-vulnerability families arrived north — reprioritizing housing queue.')
          commander.injectHumanCommand('4 new high-vulnerability families just arrived in the north, reprioritize housing queue')
        }
      }),
    ]
    return () => offs.forEach(off => off())
  }, [])

  // Debrief acknowledged → tear down the run and return to the setup screen
  // with a fresh default backdrop world behind it.
  useEffect(() => {
    const off = bus.on('mission:reset', () => {
      setRunning(false)
      setDeployed(false)
      useWorldStore.getState().setDebrief('')
      const w = new World(createInitialWorld())
      worldRef.current = w
      debriefDoneRef.current = false
      setWorld({ ...w.state })
    })
    return () => off()
  }, [])

  // Main sim + AI loop
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(async () => {
      const world = worldRef.current
      if (!world) return

      world.tick(SIM_TICK_MS)
      setWorld({ ...world.state })

      // Mission complete → produce the after-action debrief once, for the end-of-run overlay.
      // commander.generateDebrief() handles both modes: LLM call when enabled, deterministic
      // assessmentText() fallback otherwise — always specific numbers, never vague.
      if (world.state.phase === 'complete' && !debriefDoneRef.current) {
        debriefDoneRef.current = true
        const s = world.state
        commander.generateDebrief(s).then((text) => useWorldStore.getState().setDebrief(text))
      }

      // AI planning (async, non-blocking)
      const now = Date.now()
      await commander.maybePlan(world.state, now, (plan) => {
        plan.actions.forEach(action => world.applyAction(action))
        if (plan.summary) {
          useWorldStore.getState().addCommsEntry(plan.agent, plan.summary)
        }
        recordReasoning(plan)
        setWorld({ ...world.state })
      })
    }, SIM_TICK_MS)

    return () => clearInterval(interval)
  }, [isRunning])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      <Scene />
      <HUD />
      {!deployed && <SetupScreen onDeploy={deploy} />}
    </div>
  )
}
