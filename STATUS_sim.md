# STATUS — World / Simulation Lead
*Written by Planning Agent after each phase. Read by Execution Agent at start of each phase.*

## Phases Completed
_(none yet)_

## Key Architectural Decisions
- Grid: 50×50, cellSizeM=5 → 250m×250m site
- Pathfinding: A* with Manhattan heuristic on grid (not navmesh) — fast enough for 50×50
- Hazard spread: cellular automaton at 30fps, NOT displayed, powers AI's world state
- Fire constants: FIRE_SPREAD_BASE=0.018 intensity/s at full fuel+calm wind → ~25s to ignite neighbor
- Carbon coefficients: imported_timber=12, recycled_panels=0.8, salvaged_timber=0.2 kgCO2e/kg
- Baseline counterfactual: 45,000 kgCO2e for 6-home conventional rebuild (hardcoded)

## Files Created / Modified
_(none yet)_

## Unresolved Questions
- Coordinate with Integration lead on how World.tick() is called (they own the main loop in App.tsx)

## What Phase 2 Execution Agent Should Know
- Phase 1 output: World class with tick(), applyAction(), createInitialWorld() returning valid WorldState
- Phase 2 adds pathfinding.ts (A*) and unit movement within World._advanceUnits()
- The path is stored on the entity as a hidden _path field (not in WorldState type — avoid type pollution)
