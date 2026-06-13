import { useEffect, useRef } from 'react'
import { Scene } from './renderer/Scene'
import { HUD } from './hud/HUD'
import { World, createInitialWorld } from './simulation/World'
import { useWorldStore } from './store/worldStore'
import { commander } from './agents/Commander'
import { bus } from './events/bus'
import { addNewFamilies } from './scenarios/chaos'

const SIM_TICK_MS = 33  // ~30fps simulation rate

export default function App() {
  const worldRef = useRef<World | null>(null)
  const lastPlanRef = useRef(0)
  const debriefDoneRef = useRef(false)
  const { setWorld, setRunning, isRunning } = useWorldStore()

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
        commander.injectHumanCommand('switch all build sites to recycled panels immediately')
      }),
      bus.on('chaos:second_storm', () => {
        worldRef.current?.triggerSecondStorm()
        useWorldStore.getState().addCommsEntry('commander', 'ALERT: Second storm front detected north of site. Wind shifting south. Rerouting all units.', 'SECOND_STORM')
        commander.injectHumanCommand('second storm incoming from north, prioritize southern build sites and reroute northern units')
      }),
      bus.on('chaos:new_families', () => {
        if (worldRef.current) {
          addNewFamilies(worldRef.current)
          useWorldStore.getState().addCommsEntry('rescue', 'New families arriving at northern perimeter — 4 high-vulnerability households need housing.', 'NEW_FAMILIES')
          commander.injectHumanCommand('4 new high-vulnerability families just arrived in the north, reprioritize housing queue')
        }
      }),
    ]
    return () => offs.forEach(off => off())
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
      if (world.state.phase === 'complete' && !debriefDoneRef.current) {
        debriefDoneRef.current = true
        const s = world.state
        if (import.meta.env.VITE_USE_LLM === 'true') {
          // LLM-written debrief (only when the operator opted in — keeps it $0 by default).
          commander.generateDebrief(s).then((text) => useWorldStore.getState().setDebrief(text))
        } else {
          // Deterministic templated debrief — no spend.
          useWorldStore.getState().setDebrief(
            `Mission complete — ${s.score.familiesHoused}/${s.score.familiesTotal} families housed ` +
              `(${s.score.vulnerableHousedPct}% vulnerable-first), ${s.carbon.avoidedKgCo2e.toFixed(0)} kgCO2e avoided ` +
              `vs the conventional baseline.`,
          )
        }
      }

      // AI planning (async, non-blocking)
      const now = Date.now()
      await commander.maybePlan(world.state, now, (plan) => {
        plan.actions.forEach(action => world.applyAction(action))
        if (plan.summary) {
          useWorldStore.getState().addCommsEntry(plan.agent, plan.summary)
        }
        setWorld({ ...world.state })
      })
    }, SIM_TICK_MS)

    return () => clearInterval(interval)
  }, [isRunning])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      <Scene />
      <HUD />
    </div>
  )
}
