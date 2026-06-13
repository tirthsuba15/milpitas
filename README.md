# Haven — AI Disaster Relief Commander

**An AI commander directs a robot fleet through disaster relief and sustainable rebuilding — and adapts, out loud, when everything goes wrong.** The intelligence (multi-agent triage, carbon-optimized rebuilding, live re-planning) is the product; the photorealistic 3D world makes it visible.

The simulation is real: fire spreads by fuel load and wind, flood seeps downhill, families grow more urgent the longer they wait, and every rebuild is accounted in real embodied-carbon numbers. Every number the AI narrates comes from that sim.

---

## Quick start

```bash
npm install
npm run dev          # serves on http://localhost:3000
# open the URL, click START
```

That's it — **no API key needed.** With no key, the app runs a deterministic rule-based commander (the "fallback") that drives the full mission end to end at **$0**.

### Optional: enable the live LLM commander

For LLM-narrated planning (specialist agent voices, adaptive re-planning), create a `.env` (gitignored — never commit it):

```bash
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_USE_LLM=true          # opt-in; omit/false = fallback only, $0
VITE_LLM_BUDGET_USD=5      # per-session auto-stop (best-effort, resets on reload)
```

> **Cost note:** the LLM is **off by default.** It only runs when `VITE_USE_LLM=true`, and a per-session budget auto-stops it. For a real spend ceiling, set an Anthropic Console limit + use a dedicated low-balance key — the in-app guard is best-effort (the key ships in the browser bundle).

---

## What judges should do

1. Click **START** — the fleet deploys, recon drones fan out, and fog of war lifts to reveal families.
2. Watch the **comms log** (bottom-right): rescues, salvage, and homes completing, narrated live.
3. Watch **Families Housed** climb on the scoreboard — vulnerable families are prioritized first.
4. Hit the **operator chaos buttons** to see the AI adapt in real time:
   - **Timber Shortage** → imported timber hits 0 → the build switches to recycled panels.
   - **Second Storm** → wind shifts, fire reignites in the north, units reroute.
   - **New Families** → a surge of high-vulnerability households re-prioritizes the housing queue.
5. The mission reaches **COMPLETE** once ~80% of families are housed.

---

## How it works (30 seconds)

```
WorldState (src/types/world.ts)        ← single source of truth (the blackboard)
   ↑ writes              ↓ reads
World.ts (deterministic sim)     Commander.ts (LLM + rule-based fallback)
   ↓ emits              ↑ applies AgentActions
Zustand store          ←→     React renderer (Scene.tsx + HUD)
```

The loop (`App.tsx`): `World.tick()` every 33 ms → `Commander.maybePlan()` → JSON actions → `World.applyAction()` → store updates → renderer reacts. The fallback always runs, so the demo never stalls.

## Develop

```bash
npm test                 # Vitest — sim correctness (task completion, housing, chaos, phases)
npx tsc --noEmit         # type-check
npm run build            # production build
```

---

## Backup recording

A clean ~4-minute run is recorded here: **_[backup video URL — TODO]_**

Public repo — code is open for review.
