# TEAM_STATUS.md — Haven Hackathon
*Updated after each phase by each track's Planning Agent. Push to GitHub immediately. Paste current version into every Execution Session.*

---

## [INTEGRATION — @integration]
**Role:** Repo scaffold, shared types, event bus wiring, chaos controls, demo scenarios  
**Current phase:** Phase 1  
**Last completed:** —  
**Working on now:** Vite+React+TS project setup + WorldState/AgentAction types  
**Next:** Wire sim→renderer, wire AI actions→sim  
**Blockers for others:** WorldState types must be frozen before Sim/Brain/Visual can build  
**Outputs others depend on:**
- `src/types/world.ts` — WorldState, Entity, Task, BuildSite, all enums
- `src/types/agents.ts` — AgentAction, PlanningContext
- `src/events/bus.ts` — EventBus with typed emit/on
- `src/store/worldStore.ts` — Zustand store
- GitHub repo URL: _TBD_

---

## [BRAIN — @brain]
**Role:** Commander orchestrator, specialist agents, LLM planning loop, narration, debrief  
**Current phase:** Phase 1  
**Last completed:** —  
**Working on now:** Anthropic SDK setup, serializer, action schema  
**Next:** Commander planning loop  
**Blockers for others:** None yet  
**Outputs others depend on:**
- `src/agents/Commander.ts` — `commander.maybePlan()`, `commander.injectHumanCommand()`
- `src/agents/client.ts` — `planningCall()`
- LLM output: AgentPlanResponse JSON

---

## [SIM — @sim]
**Role:** A* pathfinding, fire/flood hazards, entity decay, material ledgers, scoring  
**Current phase:** Phase 1  
**Last completed:** —  
**Working on now:** World class + createInitialWorld()  
**Next:** A* pathfinding + unit movement  
**Blockers for others:** Needs WorldState types from Integration first  
**Outputs others depend on:**
- `src/simulation/World.ts` — `World` class, `world.tick()`, `world.applyAction()`
- `src/simulation/hazards.ts` — `spreadHazards()`
- Grid dimensions: 50×50, cellSizeM=5

---

## [VISUAL — @visual]
**Role:** R3F scene, HDRI, PBR materials, post-processing, robot renders, HUD, fog of war  
**Current phase:** Phase 1  
**Last completed:** —  
**Working on now:** Scene.tsx + HDRI + basic terrain  
**Next:** PBR materials + post-processing pipeline  
**Blockers for others:** None (visual is downstream)  
**Outputs others depend on:**
- `src/renderer/Scene.tsx` — R3F Canvas root
- Camera presets: bus.emit('demo:camera', { preset })

---
*Last updated: Start of hackathon*
