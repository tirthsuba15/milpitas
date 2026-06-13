# Haven Hackathon — Team Handover Document
*Last updated: Visual Phase 3 in progress*

---

## Team Structure & Ownership

| Person | Role | Phase cards to finish |
|---|---|---|
| **You (Harshith)** | Visual / 3D scene | PHASE_CARDS_VISUAL — Phases 3, 5 |
| **Teammate A** | UI / HUD | PHASE_CARDS_VISUAL — Phase 4 |
| **Teammate B** | AI Brain | PHASE_CARDS_BRAIN — Phases 1–5 |
| **Teammate C** | Simulation + Integration | PHASE_CARDS_SIM + PHASE_CARDS_INTEGRATION — all phases |

---

## What Is Already Done (Do Not Redo)

### Visual (Harshith + Claude)
- Phase 1 complete: 3D scene renders with sky, sun, OrbitControls (scroll to zoom, drag to orbit, right-drag to pan)
- Phase 2 complete: Green grass terrain, rubble zone in northwest disaster area, 120 instanced rubble pieces
- `src/renderer/Scene.tsx` — Canvas with Sky, hemisphere light, directional sun, OrbitControls
- `src/renderer/Terrain.tsx` — Grass ground plane + rubble cluster
- `src/renderer/RobotFleet.tsx` — Quadcopter drone model (spinning props), ground robot with visor + wheels, glow ring per robot
- `src/renderer/Buildings.tsx` — Houses that grow in 5 stages: foundation → walls → windows → door → pyramid roof
- `src/renderer/PostProcessing.tsx` — Bloom + ACES tone mapping + vignette (already active)
- `src/renderer/Markers.tsx` — Person beacon spheres with urgency pulse
- `src/renderer/FogOfWar.tsx` — Fog overlay (needs sim wiring to work, see Teammate C)
- `src/renderer/Hazards.tsx` — Fire particles + flood planes (needs sim to be running)

### Simulation (already scaffolded)
- `src/simulation/World.ts` — World class, tick(), applyAction(), createInitialWorld() — ALL COMPLETE
- `src/simulation/pathfinding.ts` — A* pathfinding — scaffolded, needs verification
- `src/simulation/hazards.ts` — Fire/flood spread — scaffolded
- `src/simulation/entities.ts` — Fog of war, urgency decay — scaffolded
- `src/simulation/ledger.ts` — Carbon accounting — scaffolded
- `src/simulation/scoring.ts` — Score tracking — scaffolded

### Brain (already scaffolded)
- `src/agents/client.ts` — Anthropic SDK wrapper — scaffolded
- `src/agents/serializer.ts` — WorldState → compact text — scaffolded
- `src/agents/fallback.ts` — Deterministic fallback plan — scaffolded
- `src/agents/Commander.ts` — Commander orchestrator — scaffolded

### App wiring
- `src/App.tsx` — Sim loop, chaos events, AI planning loop — COMPLETE
- `src/store/worldStore.ts` — Zustand store — complete
- `src/events/bus.ts` — Event bus — complete
- `src/hud/HUD.tsx` — Layout (carbon removed, families focused) — complete

---

## Teammate B: AI Brain — What To Do Right Now

Read `docs/PHASE_CARDS_BRAIN.md` in full before touching any code.

### Phase 1 (do first, ~45 min)
1. Open `src/agents/client.ts`. The Anthropic SDK is installed. Fill in the `SYSTEM_PROMPT` — it must describe every `AgentAction` type precisely (assign_task, allocate_material, narrate). Look at `src/types/agents.ts` for the exact field names.
2. Open `src/agents/serializer.ts`. Complete `serializeWorldState()` — it should output discovered people sorted by urgency, idle robots, top debris by carbon value, build site progress, material inventory warnings. Target: under 600 tokens for the initial world state.
3. Open `src/agents/fallback.ts`. Complete the fallback: idle drones → explore; idle rescue → highest urgency person; idle builders → active build site.
4. Test: add a `console.log` at the bottom of serializer.ts, import it in `src/main.tsx` temporarily, and check the output in the browser console.

### Phase 2 (~75 min)
1. Open `src/agents/Commander.ts`. The `maybePlan()` method is the core. It checks if 3000ms have passed since last plan, calls the LLM (or fallback), then calls `applyFn(plan)`.
2. Make sure `injectHumanCommand()` sets `replanPending = true` — this fires a new plan within 1 tick (33ms) instead of waiting 3 seconds.
3. Test: start `npm run dev`, open the console, confirm you see planning logs.

### Phases 3–5
Follow `docs/PHASE_CARDS_BRAIN.md` exactly. The key milestone is Phase 4 — the timber shortage recovery moment. The AI must switch all build sites to recycled_panels within one planning tick of `importedTimber` hitting 0. The fallback.ts must also handle this (for when the LLM is slow).

### API Key
`.env` already has `VITE_ANTHROPIC_API_KEY=` — fill in the actual key. Do not commit it.

---

## Teammate C: Simulation + Integration — What To Do Right Now

Read `docs/PHASE_CARDS_SIM.md` and `docs/PHASE_CARDS_INTEGRATION.md` before touching code.

### Sim Phase 1 (verify, ~30 min)
`src/simulation/World.ts` is essentially complete. Your job is to verify:
1. `createInitialWorld()` returns valid state — check `grid[0][0].fireIntensity > 0` (NW fire zone)
2. `world.tick(33)` increments `tick` and `elapsedSeconds` without errors
3. `triggerTimberShortage()` sets `importedTimber = 0`
4. `triggerSecondStorm()` adds fire cells in the north

If these all pass, mark Sim Phase 1 done and move on.

### Sim Phase 2 (pathfinding, ~90 min)
1. Open `src/simulation/pathfinding.ts`. Implement A* if not already done. 4-directional movement on the 50×50 grid.
2. Traversal costs: clear=1, rubble=2, shallow_flood=5, fire>0.5=impassable(10), deep_flood>1.5=impassable(10). Drones cost=1 everywhere.
3. Test: `findPath(grid, {x:125,y:0,z:225}, {x:40,y:0,z:60}, 1)` on the initial world should return a path that avoids the NW fire zone.
4. In `World.ts`, `_advanceUnits(deltaS)` moves robots along their `_path` each tick. This is already written — verify it works by starting the sim and watching robots move in the browser.

### Sim Phase 3 (~90 min)
1. `src/simulation/hazards.ts` — verify `spreadHazards()` is complete. Fire should spread from the NW corner. After 100 ticks, it should cover ~15×15 cells.
2. `src/simulation/entities.ts` — verify `decayPersonUrgency()` and `updateFogOfWar()`. Drones should reveal a 7-cell radius circle as they fly.
3. In `World.tick()` (already wired): order matters — hazards first, then entity decay, then fog update, then score.
4. Test: run for 60 seconds in browser. Fire should spread. People should get discovered as drones move north. Urgency scores should increase.

### Sim Phase 4 (economy, ~120 min)
1. In `World.ts`, add `onTaskArrival(entity, task)`: when a robot arrives at its target, execute the task consequence:
   - `rescue` → set person.status = 'rescued'
   - `sort_debris` → call `addSalvage()` from ledger.ts
   - `build_module` → increment `buildSite.modulesComplete`; when complete set site.status='complete', family status='housed'
2. Verify `updateCarbonLedger()` in ledger.ts correctly computes avoided CO2 when material switches to recycled_panels.
3. Wire `updateScore(state)` into `World.tick()` — call it last.

### Integration Phase 2 (wiring, ~105 min) — do after Sim Phase 1
`src/App.tsx` is already complete. Your job is to verify it connects correctly:
1. Start `npm run dev`. Hit the Start button. Confirm robots appear and their positions update.
2. Confirm the fallback.ts produces assign_task actions that make robots move.
3. If robots aren't moving, check `useWorldStore.getState().setWorld(world.state)` is being called inside the interval.

### Integration Phase 3 (chaos buttons)
The chaos buttons in `src/hud/OperatorPanel.tsx` emit bus events. In `src/App.tsx` those events call `world.triggerTimberShortage()` etc. Verify all three buttons work:
1. Timber shortage → inventory hits 0, AI responds within 3 seconds
2. Second storm → wind shifts, new fire cells appear in north
3. New families → 4 new PersonEntity objects added to world.entities

---

## Teammate A: UI / HUD — What To Do Right Now

Read `docs/PHASE_CARDS_VISUAL.md` Phase 4 before touching code.

### Current HUD state
- `src/hud/HUD.tsx` — renders 4 panels: MissionClock (top left), Scoreboard (top center), CommsLog (bottom right), OperatorPanel (bottom center)
- Carbon meter has been removed — we are focusing on families housed
- Glass style is dark semi-transparent (`rgba(0,0,0,0.60)`) with white text

### What to build (Phase 4, ~75 min)
1. Open `src/hud/MissionClock.tsx`. It should show elapsed time (from `world.elapsedSeconds`) and fleet status (how many robots are idle/working/failed). Verify it reads from `useWorldStore(s => s.world)`.
2. Open `src/hud/CommsLog.tsx`. It should show the last 20 entries from `world.commsLog`. Each entry needs the agent tag colored: CMD=white, RSC=light blue, SLV=light green, RBD=light yellow, LOG=grey. Auto-scroll to bottom when new entries appear (use `useEffect` on `entries.length`).
3. Open `src/hud/OperatorPanel.tsx`. The chaos buttons (Timber Shortage, Second Storm, New Families) emit bus events. There should also be a text input for human commands that calls `commander.injectHumanCommand()`. Verify all buttons work and have `pointer-events: auto`.
4. Style pass: the Scoreboard big number "Families Housed X/6" should be the dominant visual element. Make it at least 56px, white, centered. "People Rescued" and "Vulnerable First %" are secondary stats at 28px.
5. No colors — keep everything white/grey. No cyan, amber, or green highlights. Clean and legible.

### Key constraint
The right-side carbon panel has been intentionally removed. Do not add it back. Focus: families housed is the only metric that matters visually.

---

## How To Run The Project

```bash
cd /Users/harshith/Downloads/milpitas
npm run dev
# opens at localhost:5173
```

1. You should see a green grass field with a blue sky and sun
2. Rubble in the northwest corner (disaster zone)
3. 3 house foundations visible in the center (build sites)
4. 8 robots at the south edge (spawn area)
5. HUD panels at corners — dark glass, white text
6. Scroll to zoom, left-drag to orbit, right-drag to pan
7. Hit **Start** in the operator panel to begin the simulation

---

## Current Blockers & Dependencies

| Blocker | Who unblocks it | Who is waiting |
|---|---|---|
| `findPath()` A* complete | Teammate C (Sim Phase 2) | Robots need this to navigate |
| `Commander.maybePlan()` working | Teammate B (Brain Phase 2) | Robots need this to receive tasks |
| `onTaskArrival()` in World.ts | Teammate C (Sim Phase 4) | Buildings can't grow without it |
| `spreadHazards()` verified | Teammate C (Sim Phase 3) | Fire particles won't appear |

**Critical path:** Sim Phase 1 → Sim Phase 2 → Brain Phase 1 → Brain Phase 2 → everything connects.

---

## Phase 3 Visual (Harshith — in progress with Claude)

**Already in the scene, needs sim running to activate:**
- Drones fly at y=2 (above ground), ground units at y=0
- Buildings grow as `site.modulesComplete` increases
- Person beacons appear when `entity.status === 'discovered'`
- Fire particles appear when `cell.fireIntensity > 0.1 && cell.isRevealed`
- Fog of war lifts as drones move north

**Still to do (Phase 3 remaining):**
- Verify drones actually move and update position in browser once Sim+Brain are wired
- Verify houses grow visibly as build modules complete
- Verify person beacons (orange/red spheres) appear as drones discover families
- Fine-tune drone height so they visibly fly above terrain

**Phase 5 Visual (after everything else works):**
- Fire particles animation tuning (already coded in Hazards.tsx, needs fire cells from sim)
- Fog of war DataTexture (already coded in FogOfWar.tsx)
- Camera preset system via `bus.emit('demo:camera', { preset: 'buildsite' })` — currently removed, add back after OrbitControls verified
- Performance pass: target 55fps with all features on

---

## Git Workflow

```bash
# Before starting work
git pull

# After each phase
git add src/[your files]
git commit -m "Brain Phase 1: client, serializer, fallback complete"
git push

# Do NOT commit .env (it's in .gitignore)
```

One person pushes at a time. Coordinate on Slack/Discord before pushing to avoid conflicts. If you get a merge conflict, call Harshith — he has context on what changed and why.
