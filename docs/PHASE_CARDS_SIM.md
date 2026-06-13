# Phase Cards — World / Simulation Lead
*Haven Hackathon · 6-hour build · 4 people*

**Your role:** You are the physics engine. Your simulation runs invisibly under everything else — it makes the AI's decisions credible because they're grounded in real physics (fire that actually spreads based on wind and fuel, flood that seeps downhill, entity urgency that increases over time near hazards, material accounting with real carbon coefficients). None of this is displayed as simulation debug UI. It shows up as robots navigating around fire, families appearing critical when ignored too long, and the carbon ledger dropping when salvaged material is used. The simulation must be accurate and performant (60fps) — a stuttering demo is worse than a visually simple one.

**Your north star:** Every AI decision in the comms log should be based on real numbers. When the Rescue agent says "urgency 87, dispatching medic" — that number came from your code.

---

## Phase 1 — Grid World + Entity Registry
**Time budget:** 0:00–1:00 (60 minutes)
**Starts when:** Integration lead confirms WorldState types are frozen

### Deliverable
`src/simulation/World.ts` exports a `World` class with `tick(deltaMs)`, `applyAction(action)`, `triggerTimberShortage()`, and `triggerSecondStorm()`. `createInitialWorld()` returns a fully initialized `WorldState` with a valid 50×50 grid, 6 people, 8 robots, 6 debris piles, 3 build sites, one fire cluster (NW), one flood edge (E). The TypeScript types all pass. The Integration lead can import `World` and call `world.tick(33)` without errors.

### Key decisions
- **Grid:** 50×50 cells, `cellSizeM = 5` → 250m × 250m site. Fire zone in NW quadrant (x<18, y<20). Flood zone on east edge (x>38). Spawn area in south (y>40).
- **Fog of war:** Initialize all cells `isRevealed = false` except `y > 40` (spawn area). Drones reveal as they move (Phase 3).
- **Initial hazards:** Fire cluster at x<10, y<10 with `fireIntensity = 0.7`. East edge cells with `floodDepth = 0.4`. This gives the AI immediate urgency from tick 1.
- **Entity positions:** People in the north half (z < 150m) where fire/flood risk is higher. Robots at spawn (south). Debris scattered across mid-map.

### Dependencies
- Integration lead's `WorldState` types in `src/types/world.ts` (must be frozen)

### What to build
1. Read `src/simulation/World.ts` — it may already be scaffolded. Verify `createInitialWorld()` returns a valid WorldState. Check all required fields match the type in `src/types/world.ts`.
2. Verify the grid builder produces correct cells: fire zone, flood zone, and `isRevealed: y > 40`. Test: `createInitialWorld().grid[0][0].fireIntensity > 0` should be true.
3. Verify entity positions make physical sense — people are in the north (position.z < 150), robots are in the south (position.z > 220).
4. Implement basic entity CRUD helpers internally (not public API) — `_getEntity(id)`, `_updateEntity(entity)`. The World uses these in `applyAction`.
5. Verify `world.tick(33)` runs without errors (even if hazards/movement aren't implemented yet). It should increment `tick` and `elapsedSeconds`.
6. Verify `triggerTimberShortage()` sets `importedTimber = 0` and `triggerSecondStorm()` adds fire cells in the north.

### Context hint
You are building the simulation engine for Haven, a disaster relief AI. The project skeleton likely already exists — check `src/simulation/World.ts`. The `WorldState` type is defined in `src/types/world.ts`. Your job: make `createInitialWorld()` return a valid, physically plausible world. The 50×50 grid uses `GridCell` objects with x, y, elevation, terrain, traversalCost, fireIntensity, floodDepth, fuelLoad, isRevealed. The initial state has: (1) a fire cluster in the NW corner (x<10, y<10, fireIntensity=0.7, fuelLoad=0.8), (2) a flood edge in the east (x>38, floodDepth=0.4), (3) 4 recon drones + 4 ground units at spawn (south), (4) 6 displaced families scattered in the north, (5) 6 debris piles of mixed types. The `World` class wraps this state and provides `tick(deltaMs)` which will eventually call all the sub-systems (pathfinding, hazards, entities, scoring) — for now just increment the counters.

### Update block
```
PHASE 1 COMPLETE
Deliverable: World class works, createInitialWorld() returns valid state, tick() runs
Key decisions: [any grid or entity position adjustments]
Blockers: [anything blocking Phase 2]
Phase 2 needs: confirmed World class importable, tick() runs without errors
```

---

## Phase 2 — A* Pathfinding + Unit Movement
**Time budget:** 1:00–2:30 (90 minutes)

### Deliverable
`src/simulation/pathfinding.ts` exports `findPath(grid, from, to, clearanceRadius)` that returns a `Vec3[]` path or `null` if blocked. Ground units navigate around fire and flood cells. When `world.applyAction({ type: 'assign_task', unitId, task })` is called, the unit starts moving toward the target position, advancing each tick. After many ticks, the unit arrives and its status becomes `'working'`. Drones move faster and ignore ground obstacles. The render shows units smoothly moving across the terrain.

### Key decisions
- **A\* variant:** Grid-based with Manhattan heuristic. Diagonal movement: no (4-directional only — simpler and fast enough for 50×50).
- **Traversal costs:** clear=1, rubble=2, shallow_flood=5, fire>0.5=10(impassable), deep_flood>1.5=10(impassable). Drones use cost=1 everywhere (they fly).
- **Path storage:** Stored as `(robot as any)._path = Vec3[]`. This is NOT in the WorldState type (avoids bloating the serialized state). It's transient, lives only on the entity object in the World instance.
- **Movement speed:** Recon drone: 4 cells/s. Rescue/medic: 1.5 cells/s. Hauler: 1.2 cells/s. Builder/sorter: 1 cell/s. Multiply by `cellSizeM=5` to get world-space speed.
- **Arrival:** When path is empty, status → `'working'` and task remains set (so the AI knows what it was doing).

### Dependencies
- Phase 1 World class with entity CRUD

### What to build
1. Read `src/simulation/pathfinding.ts` — it may be scaffolded. Complete `findPath()`: standard A* with open/closed sets, heuristic = Manhattan distance, cost = `traversalCost(cell, clearanceRadius)`.
2. Test pathfinding: call `findPath(grid, {x:125,y:0,z:225}, {x:40,y:0,z:60}, 1)` on the initial world. It should return a path that routes around the fire zone (NW). If it goes through fire cells, the cost function is wrong.
3. In `World.ts`, add `_advanceUnits(deltaS)` — for each robot with status='moving', advance it along `_path` by `robot.speed × deltaS × cellSizeM` world units. When the path is empty, set status='working'.
4. Wire `applyAction('assign_task')`: find the unit, call `findPath()`, store result as `(unit as any)._path`, set status='moving'.
5. Verify in the browser: robots should visibly move from spawn area toward target positions after the AI emits assign_task actions.

### Context hint
Phase 1 is done — the World class exists with a valid initial state. Now add movement. The pathfinding algorithm (`src/simulation/pathfinding.ts`) needs to navigate a 50×50 grid where some cells are expensive or impassable. The key function: `findPath(grid, from, to, clearanceRadius)` takes world-space Vec3 positions, converts them to grid coordinates (divide by cellSizeM=5), runs A*, and returns world-space waypoints. In `World.ts`, units store their path as a private property `(entity as any)._path` — this is intentional: we don't want the pathfinding data in the WorldState type (it bloats the LLM context and isn't needed by the renderer). Each `tick()`, `_advanceUnits(deltaS)` advances each moving robot along its path by `speed × deltaS × 5` meters. When the path runs out, the robot is 'working'. The most common bug: forgetting to convert between grid coordinates and world coordinates (grid[y][x] vs position.x/z).

### Update block
```
PHASE 2 COMPLETE
Deliverable: A* pathfinding works, units navigate around hazards, visible in browser
Key decisions: [any pathfinding cost adjustments, speed values]
Blockers: [anything blocking Phase 3]
Phase 3 needs: confirmed units move and avoid hazards
```

---

## Phase 3 — Hazard Spread + Fog of War + Entity Decay
**Time budget:** 2:30–4:00 (90 minutes)

### Deliverable
Fire spreads to neighboring cells over time based on fuel load and wind direction. Flood seeps to lower-elevation neighbors. `PersonEntity.urgencyScore` increases over time and faster near hazards. Recon drones reveal cells as they fly (fog of war lifts). People become 'discovered' when their cell is revealed. Units that enter cells with high fire intensity have a chance to fail. The simulation is physically plausible — fire takes ~25 seconds to spread to a neighbor in calm wind, not instantaneous.

### Key decisions
- **Fire constants (real-world grounded):** `FIRE_SPREAD_BASE = 0.018` intensity/s at full fuel load, calm wind. `FIRE_BURNOUT_RATE = 0.004` fuel/s while burning. This means a fully fueled cell ignites a neighbor in ~55 ticks (at 30fps = ~1.8s — feels fast but visually dramatic). Tune `FIRE_SPREAD_BASE` down to 0.008 if fire spreads too aggressively in testing.
- **Wind amplifier:** Wind direction is `{dx, dy}` normalized. Downwind cells get `WIND_AMPLIFIER=2.4×` the base spread rate. The second storm event changes wind to `{dx:0, dy:1}` (south), redirecting fire toward build sites — this is the drama.
- **Fog of war:** Drones reveal a 7-cell-radius circle around their current position each tick. Once revealed, a cell stays revealed.
- **Person discovery:** When a cell is revealed (fog lifted), check if any undiscovered person is at that cell — set their status to 'discovered'.
- **Unit failure:** Each tick, robots at cells with `fireIntensity > 0.5` have a 5% chance of status → 'failed'. This is what triggers Commander re-planning.

### Dependencies
- Phase 1 World class, Phase 2 movement
- Fire/flood systems in `src/simulation/hazards.ts`
- Fog/entity systems in `src/simulation/entities.ts`

### What to build
1. Read `src/simulation/hazards.ts` — verify `spreadHazards()` is complete with correct fire spread formula. Test: after 100 ticks on the initial world, fire should have spread from the 10×10 seed to ~15×15 cells (rough). If it's too slow or too fast, adjust `FIRE_SPREAD_BASE`.
2. Read `src/simulation/entities.ts` — verify `decayPersonUrgency()` correctly increases urgency by `0.5/s` normally and `2.0/s` near hazards. Verify `updateFogOfWar()` reveals cells in a 7-cell radius around drones.
3. Wire both into `World.tick()`: call `spreadHazards(state, deltaS)` to get new grid, call `decayPersonUrgency(state, deltaS)`, call `updateFogOfWar(state)`. Check these are being called in the right order in `World.ts`.
4. Test the full loop: start the sim, let it run for 60 seconds. Check: (a) fire has spread; (b) people show increasing urgency scores; (c) as drones move north, people get discovered; (d) any unit that enters the fire zone has a chance to fail.
5. Verify `triggerSecondStorm()` changes `windDirection` to `{dx:0, dy:1}` and adds new fire cells in the north — fire should start spreading south toward build sites.

### Context hint
Movement works. Now add the physics that makes the world alive. Two files handle this: `src/simulation/hazards.ts` (fire and flood spread) and `src/simulation/entities.ts` (fog of war and person urgency). Both should already be scaffolded. Your main job is: (1) verify the constants are tuned correctly, (2) wire both into `World.tick()`. The tricky part: both functions return new WorldState or new grid arrays — they're pure functions (no mutation). So in `World.tick()`, you do: `this.state = { ...this.state, grid: spreadHazards(this.state, deltaS) }`, then `this.state = decayPersonUrgency(this.state, deltaS)`, then `this.state = updateFogOfWar(this.state)`. Check the order: hazard spread first (so decay uses updated hazard data), then fog, then scoring. Test in the browser: you should see fire cells expanding over time in the renderer, and as drones fly north, people appearing as colored markers.

### Update block
```
PHASE 3 COMPLETE
Deliverable: Fire spreads, fog lifts, urgency decays, units fail in fire
Key decisions: [tuned fire spread constants, fog radius]
Blockers: [anything blocking Phase 4]
Phase 4 needs: confirmed fire/flood visible, person discovery working
```

---

## Phase 4 — Material Ledgers + Scoring + Chaos Hooks + Performance
**Time budget:** 4:00–6:00 (120 minutes)

### Deliverable
When a sorting robot completes a `sort_debris` task, salvaged material is added to inventory (via `addSalvage()`) and the carbon ledger updates. When a builder completes a `build_module` task, a module is added to the build site. When `allocate_material` is applied, `updateCarbonLedger()` correctly computes avoided carbon. The scoring system correctly counts families housed and waste diverted. All three chaos hooks (`triggerTimberShortage`, `triggerSecondStorm`, `addNewFamilies`) work correctly. The simulation runs at 60fps in Chrome on the demo machine.

### Key decisions
- **Carbon coefficients (real IPCC values, kgCO2e/kg):** `imported_timber: 12.0`, `imported_panels: 18.0`, `salvaged_timber: 0.2`, `recycled_panels: 0.8`. Baseline for 6 homes = 45,000 kgCO2e. Switching 3 sites to recycled_panels saves ~(12.0-0.8) × 800 kg × 4 modules × 3 sites = 107,520 kgCO2e avoided → the carbon meter should visibly jump.
- **Task completion:** When a unit's status goes to 'working' and it has a task, call `onTaskArrival()`. For sort_debris tasks, call `addSalvage()`. For build_module tasks, increment `buildSite.modulesComplete`. For rescue tasks, set person status to 'rescued'. When `modulesComplete >= modulesRequired`, set buildSite.status to 'complete' and family status to 'housed'.
- **Performance:** Profile after all features are on. Top likely issues: fog-of-war DataTexture update every tick (batch to every 5 ticks), fire particle positions array (pre-allocate, mutate in place). Target: 60fps on demo machine with all features.

### Dependencies
- All previous sim phases
- `src/simulation/ledger.ts` with `updateCarbonLedger()`, `addSalvage()`, `deductMaterial()`
- `src/simulation/scoring.ts` with `updateScore()`
- `src/scenarios/chaos.ts` with `addNewFamilies()`

### What to build
1. In `World.ts`, add `onTaskArrival(entity, task)`: called when a unit arrives at its target. Switch on `task.type`: 'rescue' → person.status='rescued', 'sort_debris' → `this.state = addSalvage(state, debris.debrisType, debris.massKg, debris.kgCo2eIfSalvaged)`, 'build_module' → increment site.modulesComplete (if complete, set site.status='complete', person.status='housed').
2. Wire `applyAction('allocate_material')` to call `updateCarbonLedger()` and update site.materialChoice.
3. Wire `updateScore(state)` into `World.tick()` — call it last, after all other updates.
4. Verify: trigger the timber shortage, have the AI switch to recycledPanels, complete a build site — check `carbon.avoidedKgCo2e` increases by the expected amount.
5. Verify: families housed in the final `score.familiesHoused` counter matches actual completed sites with assigned families.
6. Profile: open Chrome DevTools → Performance → record 10s of simulation → find top frame-time spenders. Likely: fog texture update (batch it), entity array spreading (use mutation instead). Get to >45fps minimum on demo machine.

### Context hint
The physics and movement are working. Now add the economic layer — this is what makes the AI's sustainability decisions measurable. `src/simulation/ledger.ts` has the carbon coefficient constants and `addSalvage()`, `updateCarbonLedger()` functions. `src/simulation/scoring.ts` has `updateScore()`. Your main job: wire these into `World.tick()` and into `onTaskArrival()`. The critical connection: when a builder completes `build_module`, the carbon cost is already committed (via `updateCarbonLedger` when `allocate_material` was applied). So completing the build just increments `modulesComplete`. When `modulesComplete >= modulesRequired`, the site is done, the assigned family is housed, and `score.familiesHoused` goes up. Test this full chain: AI assigns builder → builder arrives → module complete → site completes → family housed → score updates → HUD shows new count. This is the money shot of the demo and it must be reliable.

### Update block
```
PHASE 4 COMPLETE — SIM DONE
Deliverable: Full economy working — salvage fills inventory, builds consume it, carbon tracks correctly
Key decisions: [any coefficient adjustments, performance fixes]
Performance: [fps on demo machine]
What integration needs to know: [any World API changes]
```
