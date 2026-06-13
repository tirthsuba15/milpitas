# Haven — AI Disaster Relief Commander
## CLAUDE.md — read this before touching any code

**What Haven is:** A photorealistic 3D simulation where an AI commander directs a robot fleet through disaster relief and sustainable rebuilding. The intelligence (multi-agent reasoning, triage, carbon-optimized rebuilding, live re-planning) is the real product. The 3D world makes it visible and unforgettable.

**One line:** We're not building robots that move — we're building an AI that runs a relief mission and adapts when everything goes wrong, out loud, in a world that looks real.

---

## Architecture in 30 seconds

```
WorldState (src/types/world.ts)          ← single source of truth, the blackboard
     ↑ writes                  ↓ reads
World.ts (deterministic sim)      Commander.ts (LLM + fallback)
     ↓ emits                  ↑ applies AgentActions
Zustand worldStore           ←→  React renderer (Scene.tsx + HUD)
```

The loop (App.tsx): World.tick() every 33ms → Commander.maybePlan() every 3s → LLM returns JSON actions → World.applyAction() → store updates → renderer reacts.

---

## Critical files

| File | Owner | Purpose |
|---|---|---|
| `src/types/world.ts` | Integration | **Frozen contract** — all tracks build against this |
| `src/types/agents.ts` | Integration | AgentAction schema the LLM must output |
| `src/simulation/World.ts` | Sim | Deterministic physics host |
| `src/agents/Commander.ts` | Brain | LLM planning loop |
| `src/agents/serializer.ts` | Brain | WorldState → compact LLM context |
| `src/agents/fallback.ts` | Brain | Rule-based fallback — never let demo stall |
| `src/renderer/Scene.tsx` | Visual | R3F canvas root |
| `src/renderer/PostProcessing.tsx` | Visual | The cinematic pass — Bloom, SSAO, ACES |
| `src/store/worldStore.ts` | Integration | Zustand reactive bridge |
| `src/events/bus.ts` | Integration | Type-safe event bus |

---

## Physics simulation (hidden, real-world grounded)

The sim runs under the hood — **never expose debug panels in the demo**.

- **Fire spread:** cellular automaton, rate = `0.018 × fuelLoad × windFactor / s`. Full cell in ~25s light wind.
- **Flood seep:** elevation-based, `0.006 m/s` to lower neighbors.
- **Pathfinding:** A* on 50×50 grid, cell costs: clear=1, rubble=2, flood=5, fire>0.5=impassable.
- **Urgency decay:** `+0.5/s` undiscovered, `+2.0/s` near hazard.
- **Carbon coefficients (kgCO₂e/kg):** imported_timber=12, recycled_panels=0.8, salvaged_timber=0.2
- **Baseline for counterfactual:** 45,000 kgCO₂e for a 6-home conventional rebuild.

---

## Demo run-of-show (~4 min)

1. Camera opens on smoke-lit disaster zone at dusk
2. Fleet deploys, drones fan out, fog of war lifts revealing survivors
3. Agents take over — rescue, salvage, build happening in parallel, comms log narrating
4. Operator speaks: "get the families with kids in the north housed first"
5. **THE MOMENT:** Timber runs out → Commander switches to recycled panels → carbon meter drops → most vulnerable families still housed on time
6. Debrief: AI writes its own one-sentence mission summary with numbers

---

## Rules

- **Fallback always runs** — if Claude API times out, fallback.ts keeps units moving
- **Never show sim debug UI** in demo mode
- **Keep per-tick LLM context under 600 tokens** — serializer.ts handles this
- Cap particle count at 500 total; test on demo machine at 60fps before presenting
- Public repo, commented agent loop, every presenter must be able to explain perceive→reason→act→re-plan

---

## Quick start

```bash
cp .env.example .env
# add your VITE_ANTHROPIC_API_KEY to .env
# download HDRI from polyhaven.com → public/hdri/kloofendal_overcast.hdr
npm install
npm run dev
# open http://localhost:3000
# click START
```
