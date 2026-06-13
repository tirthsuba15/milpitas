# Phase Cards — Integration / Demo Lead
*Haven Hackathon · 6-hour build · 4 people*

**Your role:** You own the foundation everything else builds on, the wiring that connects all four tracks, and the demo itself. You unblock everyone in Phase 1, disappear to wire in Phase 2, then become the demo director in Phases 3–4. If the demo doesn't play reliably, it doesn't matter how good the other tracks are.

**Your north star:** A 4-minute demo that plays reliably, 3 times in a row, with no crashes.

---

## Phase 1 — Foundation & Frozen Types
**Time budget:** 0:00–0:45 (45 minutes)
**Priority:** CRITICAL — every other track blocks on your output

### Deliverable
`npm run dev` serves a black R3F canvas. All TypeScript types are defined and exported. EventBus works. Zustand store works. Repo is on GitHub (public). README has `npm install && npm run dev` instructions. **Commit and push before moving to Phase 2.**

### Key decisions
- Framework: Vite + React + TypeScript (already decided — see CLAUDE.md)
- Folder structure: as laid out in the project skeleton (do not reorganize)
- `WorldState` and `AgentAction` types in `src/types/` are the contract — once committed, changing them requires a team sync

### Dependencies
None. You go first. Everything blocks on you.

### What to build
1. `npm create vite@latest . -- --template react-ts` (or check if skeleton already exists)
2. `npm install three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing zustand @anthropic-ai/sdk`
3. Verify `src/types/world.ts` has all the types (WorldState, GridCell, Entity variants, BuildSite, MaterialInventory, CarbonLedger, MissionScore, CommsEntry, AgentType). Check against CLAUDE.md section "Critical files".
4. Verify `src/types/agents.ts` has all AgentAction variants.
5. Verify `src/events/bus.ts` has typed emit/on and exports `bus`.
6. Verify `src/store/worldStore.ts` exports `useWorldStore` with setWorld, patchWorld, addCommsEntry.
7. Drop a placeholder `<Canvas>` in `src/App.tsx` that renders a gray sphere — just to confirm R3F works.
8. `git init && git remote add origin <url> && git push -u origin main`

### Context hint
You are starting the Haven hackathon. The project is an AI disaster relief simulation — a 3D scene where Claude commands robots. You own the foundation. The project skeleton may already exist at this directory (check for `package.json`). If it does, verify the types match CLAUDE.md and install dependencies. If not, scaffold with Vite. The most important output is `src/types/world.ts` — it defines WorldState, which every other track's code imports. Read the WorldState type carefully: it has a 50×50 `GridCell[][]` grid, typed Entity variants (RobotEntity, PersonEntity, DebrisEntity), BuildSite[], inventory and carbon ledgers, and a commsLog. AgentAction types in `src/types/agents.ts` are what the AI returns as JSON — read those too. Get the repo public on GitHub and push before you do anything else.

### Update block (paste into Planning Session when done)
```
PHASE 1 COMPLETE
Deliverable: npm run dev works, types committed, repo at <url>
Key decisions: [any type shape changes you made]
Blockers: [anything blocking Phase 2]
Phase 2 needs: working repo URL, confirmed npm run dev
```

---

## Phase 2 — Wiring Simulation → Renderer → AI
**Time budget:** 0:45–2:30 (105 minutes)

### Deliverable
When `World.tick()` runs, entities in the Zustand store update and the R3F renderer shows them as moving colored shapes. When `Commander.maybePlan()` emits actions, `World.applyAction()` processes them and units begin moving. The full loop runs: sim tick → store update → renderer reacts → AI plans → actions applied. **No LLM call needed yet — just confirm the plumbing works with the fallback.**

### Key decisions
- **Sim drives store, renderer reads store reactively.** `World.tick()` calls `useWorldStore.getState().setWorld(world.state)`. Renderer uses `useWorldStore(s => s.world)` — no direct coupling.
- **AI loop runs async inside `setInterval`.** In `App.tsx`, `setInterval` at 33ms calls `world.tick()` then `await commander.maybePlan(...)`. The await is non-blocking for the UI because it's inside the interval, not the render loop.
- **Actions flow: bus or direct?** Direct: `world.applyAction(action)` inside the `maybePlan` callback. No need for bus here.

### Dependencies
- Sim lead's `World.ts` with `tick()` and `applyAction()` working
- Visual lead's `Scene.tsx` with at least a terrain + one entity reading from store
- Brain lead's `Commander.ts` with `maybePlan()` exported

### What to build
1. In `App.tsx`: create `new World(createInitialWorld())` on mount. Store ref with `useRef`. Start `setInterval` at 33ms when `isRunning=true`.
2. Each interval: `world.tick(33)` → `setWorld({...world.state})`.
3. Then: `await commander.maybePlan(world.state, Date.now(), (plan) => { plan.actions.forEach(a => world.applyAction(a)); setWorld({...world.state}); })`.
4. Wire chaos events: `bus.on('chaos:timber_shortage', ...)` etc.
5. Confirm robots appear in Scene.tsx and their positions update as World ticks.
6. Confirm fallback.ts actions (assign_task) result in robot status changing from 'idle' to 'moving'.

### Context hint
The project scaffold is done and on GitHub. The types are frozen. You are wiring the three tracks together. `src/simulation/World.ts` has a `World` class with `tick(deltaMs)` and `applyAction(action)`. `src/agents/Commander.ts` has `commander.maybePlan(state, nowMs, applyFn)`. `src/renderer/Scene.tsx` has a `<Canvas>` that reads from `useWorldStore`. Your job is `src/App.tsx`: create the World on mount, run a `setInterval` that ticks the world and calls maybePlan, wire the chaos bus events, and make sure the Zustand store gets updated so the renderer reacts. Use `useRef` for the World instance (not state, because you don't want re-renders on the World object itself). The fallback plan in `src/agents/fallback.ts` will run immediately since no API key is needed — use it to confirm units start moving.

### Update block
```
PHASE 2 COMPLETE
Deliverable: Full loop running in browser — units moving, AI planning with fallback
Key decisions: [anything about the loop structure]
Blockers: [anything blocking Phase 3]
Phase 3 needs: confirmed working loop, chaos bus events wired
```

---

## Phase 3 — Demo Scenario & Chaos Controls
**Time budget:** 2:30–4:30 (120 minutes)

### Deliverable
The demo scenario auto-plays scripted beats (camera moves, narrated comms) when START is clicked. All three chaos buttons work and trigger the expected world changes + Commander re-plan. The human command input works. Camera preset system works. **The timber shortage → carbon drop moment plays reliably and dramatically.**

### Key decisions
- Chaos buttons live in `OperatorPanel.tsx` — they emit bus events (`chaos:timber_shortage`, etc.)
- App.tsx handles the bus events and calls the appropriate World methods + `commander.injectHumanCommand()`
- The timber shortage event must: (1) zero inventory, (2) inject a human command override, (3) add a comms log entry — in that order, atomically before the next AI tick

### Dependencies
- Brain lead's `commander.injectHumanCommand()` working
- Sim lead's `world.triggerTimberShortage()` and `triggerSecondStorm()` working
- Visual lead's camera preset system (`bus.on('demo:camera', ...)` in Camera.tsx)

### What to build
1. **Timber shortage flow:** In App.tsx `bus.on('chaos:timber_shortage')`: call `world.triggerTimberShortage()`, call `commander.injectHumanCommand("switch all build sites to recycled panels immediately")`, add comms entry. Verify inventory hits zero and AI responds within 3 seconds.
2. **Second storm:** Similar flow with `triggerSecondStorm()` + human command about rerouting.
3. **New families:** Call `addNewFamilies(world)` from `src/scenarios/chaos.ts`.
4. **Camera presets:** In Camera.tsx (or confirm with Visual lead), `bus.on('demo:camera')` sets the camera target. Test `wide`, `buildsite`, `rescue`, `debrief`.
5. **Demo script:** In `startDemoSequence()` — scripted timeouts that fire camera changes and comms entries at T+8s, T+20s, T+35s. Call this from the START button.
6. **Human command input:** Confirm OperatorPanel text input calls `commander.injectHumanCommand()` on Enter.

### Context hint
The wiring is done. The sim runs. The AI plans. Now you make it a *demo*. The key insight: the demo has two kinds of moments — organic (the AI doing smart things in real time) and scripted (camera moves, chaos events). Your job is the scripted layer that orchestrates the scripted moments and ensures chaos events work reliably. The timber shortage is the climax: it should happen at about T+2:30 of the demo, the AI should switch materials within 3 seconds, and the carbon meter should visibly drop. Test this 10 times and make sure it works every time. If the LLM is sometimes slow, the fallback policy should still switch materials (add a rule to `fallback.ts` for when importedTimber === 0: emit allocate_material to recycledPanels for all active sites).

### Update block
```
PHASE 3 COMPLETE
Deliverable: All chaos buttons work, demo script fires correctly
Key decisions: [chaos timing, camera preset positions]
Blockers: [anything blocking Phase 4]
Phase 4 needs: reliable chaos events, confirmed camera presets
```

---

## Phase 4 — Hardening, Counterfactual, Backup
**Time budget:** 4:30–6:00 (90 minutes)

### Deliverable
The full demo plays 3 times in a row without crashing. A counterfactual panel shows AI vs. baseline side-by-side. A screen recording backup exists as an MP4. Code is committed and pushed to the public GitHub repo. The presenter can explain the perceive→reason→act loop.

### Key decisions
- **Counterfactual:** Pre-computed hardcoded numbers (not live simulation). Baseline: 3/6 families housed, 0% vulnerable-first, 45 tCO₂e, 6 hrs. Haven target: 5–6/6 families, 80%+ vulnerable-first, 28 tCO₂e avoided, 4 hrs.
- **Backup recording:** Use QuickTime or OBS. Record one clean 4-minute run. Upload to Google Drive, URL in README.
- **Performance:** If framerate < 45fps, reduce particle count (Hazards.tsx PARTICLES_PER_CELL: 6→3), reduce post-processing (turn off SSAO), cap dpr at 1.

### Dependencies
All tracks complete or very close

### What to build
1. Add `<CounterfactualPanel>` component to HUD — appears at `world.phase === 'complete'`. Shows a table: Haven vs. Baseline for families housed, carbon, waste, time.
2. Wire `world.phase = 'complete'` when `score.familiesHoused >= score.familiesTotal * 0.8` or time > 5min. Trigger the debrief generation.
3. Run the demo 3 times. For each crash: fix root cause (don't suppress with try/catch unless truly safe).
4. Performance audit: Chrome DevTools → record 30s → check for frame drops. Fix top 2 causes.
5. Record backup video.
6. Final `git push` with a clean commit message.
7. Update README with: what Haven is (one line), how to run, backup video URL, what the judges should do.

### Context hint
It's the final stretch. Don't build new features — make what exists bulletproof and impressive. The three most common crash causes: (1) the LLM returns malformed JSON (ensure client.ts has try/catch and falls back); (2) entity IDs in actions don't exist (ensure applyAction validates before acting); (3) the renderer tries to access world state before it's initialized (ensure `if (!world) return null` in every component). The counterfactual panel is cheap to add and high-impact for judges — it proves the AI measurably does better. Pre-compute numbers and hardcode them: baseline is conventional routing with all-imported materials and no triage prioritization. Haven should show 35-40% less carbon and significantly better vulnerable-family ordering.

### Update block
```
PHASE 4 COMPLETE — DEMO READY
Deliverable: 3x clean runs, counterfactual panel, backup video at <url>
Key decisions: [any performance cuts made]
Final repo: <github url>
```
