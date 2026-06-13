# Haven — Remaining Work to Match the Project Vision
*Generated from a full codebase audit against `Project_Details.md` + the four phase-card docs. Last updated: 2026-06-13.*

This is the master to-do list to take the project from its current state (~75% built, core loop not yet closing) to the demo described in `Project_Details.md §10`. Each item has an **owner**, a **description**, a **priority**, and the **phase card** it traces to.

**Owners** (per handover / `TEAM_STATUS.md`):
- **B (You)** — AI Brain — ✅ track complete & pushed (commit `2711f34`)
- **C** — Simulation + Integration/Demo
- **Harshith** — Visual / 3D scene (renderer)
- **A** — UI / HUD

**Priority key:** 🔴 P0 = blocks the demo · 🟠 P1 = needed for a signature beat · 🟡 P2 = polish/correctness · ⚪ P3 = stretch (from the vision, optional)

---

## At-a-glance status

| Track | Owner | State |
|---|---|---|
| Brain | B | ✅ Done (5/5 phases, pushed) |
| Simulation | C | 🟡 3.5 / 4 — `onTaskArrival()` missing |
| Integration / Demo | C | 🟡 Phases 1–3 done; Phase 4 missing |
| Visual / HUD renderer | Harshith | 🟡 Renders & reactive; climax not visible; camera not wired |
| HUD panels | A | 🟡 All exist; CarbonMeter orphaned; color classes undefined; no cold-open |

> **The linchpin:** nothing completes until **C builds `onTaskArrival()`**. Until then the scoreboard stays 0, no house finishes, and the debrief/counterfactual have no data. Do this first.

---

## 🔴 P0 — Critical path (blocks the whole demo)

| ID | Item | Owner | Description | Phase card |
|---|---|---|---|---|
| P0-1 | **`onTaskArrival(entity, task)`** | C | Add to `src/simulation/World.ts`; call it from `_advanceUnits()` when a robot's path empties. Branch on `task.type`: `rescue` → person `status='rescued'` (+ `rescuedAtTick`); `sort_debris` → mark debris `salvaged=true` and call `addSalvage()`; `build_module` → `modulesComplete++`, and on completion set site `status='complete'`, assigned family `status='housed'` (+ `housedAtTick`). Keep the immutable `this.state = {...}` style. | SIM Phase 4 |
| P0-2 | **Wire `deductMaterial()`** | C | Implemented in `ledger.ts` but never called. Deduct inventory when a `build_module` completes (inside `onTaskArrival`) so stock actually depletes and the timber shortage is reachable organically. | SIM Phase 4 |

---

## 🟠 P1 — Signature demo beats (the climax + the close)

| ID | Item | Owner | Description | Phase card |
|---|---|---|---|---|
| P1-1 | **Tint buildings by material** | Harshith | `src/renderer/Buildings.tsx` hardcodes wall color and ignores `site.materialChoice`. Tint per material (`imported_timber`→`#c8b89a`, `salvaged_timber`→`#9caa86`, `recycled_panels`→`#8fa39b`) so the **timber→recycled switch is visible on the 3D homes**. Right now the sustainability climax is invisible in the world. | VISUAL Phase 3 |
| P1-2 | **Render CarbonMeter in the HUD** | A | `src/hud/CarbonMeter.tsx` is fully built but never imported into `HUD.tsx`; `hud.module.css` has no `topRight` grid area. Add it so the carbon drop during the timber shortage is visible. | VISUAL Phase 4 |
| P1-3 | **Mission-complete transition** | C | `world.phase` is `'deploying'` and never changes. Set `phase='active'` on START, and `phase='complete'` when `score.familiesHoused >= familiesTotal*0.8` (or time > 5 min). Gates the debrief + counterfactual + end camera. | INTEGRATION Phase 4 |
| P1-4 | **Call + display the debrief** | C (wire) / A (UI) | `commander.generateDebrief()` works but is never called and has no UI. On `phase==='complete'`, call it, store the text, and render a full-screen glass overlay with the result. | INTEGRATION Phase 4 / VISUAL Phase 5 |
| P1-5 | **CounterfactualPanel (AI vs baseline)** | C (data) / A (UI) | Build the proof panel from the run-of-show. Pre-computed baseline (e.g. 3/6 housed, 0% vulnerable-first, 45 tCO₂e) vs Haven's live numbers. Show at mission end. | INTEGRATION Phase 4 |
| P1-6 | **Wire camera + demo script** | Harshith (Scene) / C (sequence) | `Camera.tsx` (presets + `bus.on('demo:camera')`) and `scenarios/initial.ts:startDemoSequence()` both exist but are unused: Scene still uses `<OrbitControls>` and `startDemoSequence()` is never called. Decide OrbitControls vs scripted camera; render `<Camera/>` in `Scene.tsx` and call `startDemoSequence()` from START. | INTEGRATION Phase 3 / VISUAL Phase 5 |

---

## 🟡 P2 — Polish & correctness

| ID | Item | Owner | Description | Phase card |
|---|---|---|---|---|
| P2-1 | **Robot status-ring colors** | Harshith | `RobotFleet.tsx:7–13` uses grayscale/pastels; spec is idle `#4488ff` → moving `#44aaff` → working `#44ff88` → blocked `#ffaa00` → failed `#ff4444`. Fixes the "state-colored fleet" legibility check. | VISUAL Phase 3 |
| P2-2 | **Define HUD color classes** | A | `green/red/cyan/amber/white` are referenced in `MissionClock.tsx` / `CarbonMeter.tsx` but undefined in `hud.module.css`, so metrics all render white. Add the class definitions. | VISUAL Phase 4 |
| P2-3 | **Add SSAO to post-processing** | Harshith | `PostProcessing.tsx` has Bloom/ACES/Vignette only; add SSAO first in the chain to ground objects. (First thing to cut if FPS drops.) | VISUAL Phase 2 |
| P2-4 | **Cold-open / pre-START card** | A | Before `isRunning`, the HUD shows an all-zeros scoreboard. Add a centered glass title card ("HAVEN — AI Disaster Relief Commander" + one line + prominent START) so the opening reads as "armed and waiting." | VISUAL Phase 4 |
| P2-5 | **Scoreboard: carbon % + pulse** | A | Add embodied-carbon-avoided % as a secondary stat and a pulse animation when `familiesHoused` changes. | VISUAL Phase 4 |
| P2-6 | **Cap fire particles (≤500)** | Harshith | `Hazards.tsx` uses `PARTICLES_PER_CELL=6` with no max; during the second storm this can blow past 500 and drop frames. Cap total and scale per-cell down. | VISUAL Phase 5 |
| P2-7 | **Batch fog-of-war updates** | Harshith | `FogOfWar.tsx` rebuilds the DataTexture every tick; batch to every ~5 ticks if it costs frames. | VISUAL Phase 5 |

---

## ⚪ P3 — Stretch (in the vision, cut-first per `Project_Details §11.3`)

| ID | Item | Owner | Description | Source |
|---|---|---|---|---|
| P3-1 | Voice command (Web Speech API) | A / Harshith | Spoken human commands to the Commander. High demo impact, but typed input already covers the requirement. | Project_Details §9, D |
| P3-2 | Restoration & Resilience agent | B | 4 restoration sub-missions as *narrated + lightweight visual* (planting drones, clearing unit, skimmer). Represent breadth, don't fully simulate. | Project_Details §4.2, §11.2 |
| P3-3 | Sentinel (Foresight) agent | B | Simple "next storm in zone X" forecast that influences siting. Reads as intelligence. | Project_Details §4.2, §11.2 |
| P3-4 | Drone-camera AI vision | B / Harshith | Identify people/debris from the rendered drone view. First on the cut list. | Project_Details §7.G, §11.3 |
| P3-5 | Animated floodwater | Harshith | Replace flat flood planes with normal-map ripple (`Reflector`). `Hazards.tsx` has the TODO. | VISUAL Phase 5 |

---

## ⚙️ Demo hardening (owned by C, after P0–P1)

| ID | Item | Owner | Description | Phase card |
|---|---|---|---|---|
| H-1 | 3× clean runs | C | Run the full 4-min demo three times; fix each crash at root cause. | INTEGRATION Phase 4 |
| H-2 | Backup recording | C | Record one clean run (QuickTime/OBS), upload, link in README. | INTEGRATION Phase 4 |
| H-3 | README + public repo | C | One-line description, run instructions, backup-video URL, "what judges should do." Keep repo public (code-review rubric). | INTEGRATION Phase 4 |
| H-4 | API quota / key | C / team | Shared key hit its usage cap (resets **2026-07-01**). Raise the cap or swap to a key with quota before the demo, or the LLM narration won't run (the hardened fallback covers a no-LLM run). | — |

---

## ✅ Done (no action)
- **Brain (B):** Commander loop, specialist agent voices, serializer, deterministic fallback (incl. timber-shortage rule), plain-prose debrief, API-spam fix. Pushed.
- **Sim (C):** Phases 1–3 — grid/world, A* pathfinding + movement, hazard spread, fog of war, urgency decay, unit failure, scoring + carbon ledger functions.
- **Integration (C):** Phases 1–2 — scaffold, frozen types, bus, store, full sim→store→renderer→AI loop, all 3 chaos events wired, human-command input.
- **Visual (Harshith/A):** Scene/HDRI/terrain/rubble, reactive RobotFleet/Markers/Buildings/Hazards/FogOfWar, post-processing (minus SSAO), all HUD panels render from store, CommsLog agent coloring + auto-scroll.

---

## How to verify "done" once P0–P1 land
`npm run dev` (port 3000) → **Start** →
1. A builder completing 4 modules flips a site `complete` and `score.familiesHoused` ticks up.
2. A rescue unit reaching a person flips them `rescued`.
3. Trigger **Timber Shortage** → houses re-tint to recycled + the carbon meter drops.
4. Mission crosses the housing threshold → `phase='complete'` → debrief overlay + counterfactual render.
Keep `npx tsc --noEmit` and `npx vite build` clean throughout.
