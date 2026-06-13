# Haven — Remaining Work to Match the Project Vision
*Updated: 2026-06-13 (post visual + HUD overhaul)*

**Owners:**
- **B (You)** — AI Brain — ✅ track complete & pushed (commit `2711f34`)
- **C** — Simulation + Integration/Demo
- **Harshith** — Visual / 3D scene (renderer)
- **A** — UI / HUD

**Priority key:** 🔴 P0 = blocks the demo · 🟠 P1 = needed for a signature beat · 🟡 P2 = polish/correctness · ⚪ P3 = stretch

---

## At-a-glance status

| Track | Owner | State |
|---|---|---|
| Brain | B | ✅ Done (5/5 phases, pushed) |
| Simulation | C | ✅ Done — `onTaskArrival()` + `deductMaterial()` wired, phase transitions |
| Integration / Demo | C | 🟡 Phase 4 mostly done; camera sequence + debrief wire need final QA |
| Visual / 3D scene | Harshith | ✅ Done — HDRI sky, PBR terrain, city grid, trees, rubble ruins, material tints, robot colors, SSAO, particle cap, fog batch |
| HUD panels | A/Harshith | ✅ Done — CarbonMeter live, cold-open card, debrief overlay, color classes, layout fixed |

> **Current linchpin:** do 3 clean 4-min runs end-to-end. Fix any crash at root cause. Record backup video. Raise API quota before demo.

---

## 🔎 Spec cross-check gaps (2026-06-13 audit vs Project_Details.md)
*Core spec (§11.1) is MET — app is demo-ready on the must-haves. These are the deltas, triaged by "will a judge notice," not by count. Only the first two actually matter.*

| ID | Gap | Owner | Priority | Why it matters / what to do |
|---|---|---|---|---|
| X-1 | **Debrief shows canned text, not the AI summary** | A (HUD) | 🔴 **HIGHEST LEVERAGE** | `commander.generateDebrief()` runs and the text is saved to `store.debrief`, but `DebriefOverlay` (HUD.tsx:64) renders a **hardcoded template** (lines 131–135) and never reads `store.debrief`. The closing beat — the last thing judges see, and the project's "compelling after-action debrief" north star — silently shows filler. **Fix is ~3 lines:** overlay reads `useWorldStore(s => s.debrief)` and renders it (template as fallback). See the handoff note below. |
| X-2 | **`reroute` / `reprioritize` actions silently ignored** | C (Sim) | 🟠 P1 | `World.applyAction()` only handles `assign_task`/`allocate_material`/`narrate`. If the LLM emits a `reroute` during the second-storm beat (run-of-show §10 implies it), nothing happens — the "AI dodges the hazard" narrative no-ops. Add cases for `reroute` (re-path the unit avoiding given cells) and `reprioritize` (bump a task's priority). |
| X-3 | HDRI is a drei `preset="sunset"`, not the real `.hdr` on disk | Harshith | 🟡 P2 | Looks fine; not true image-based lighting per §6.3. The 25 MB HDR files in the repo are unused. Cosmetic — nobody loses on this. |
| X-4 | No normal maps; floodwater is a static plane | Harshith | 🟡 P2 | §6.4/§6.7 want full PBR + a rippling `Reflector`. Cosmetic; leave unless time is free. |
| X-5 | "Build progress" missing from scoreboard | A | 🟡 P2 | §8 lists it as a primary metric; not in `MissionScore`. Minor missing number. |

> **⚠️ NOT a spec gap but a silent killer — the vite-8 break is still on `main`.** `package.json` on origin still pins `vite@^8.0.16`, which breaks `@vitejs/plugin-react`'s peer dep → a **fresh clone / judge `npm install` dies on ERESOLVE.** It only runs for those of us whose `node_modules` predates the bump. **Harshith must actually push the pin to `vite@^7` — confirm it lands on `main`.** Workaround until then: `npm install --legacy-peer-deps`.
>
> **Cut-line (§11.3):** Restoration / Sentinel / Logistics agents, voice command, drone-camera vision are explicitly stretch — do NOT spend the last hours here.

---

## 🔴 P0 — Critical path (must be done before demo)

| ID | Item | Owner | Status | Description |
|---|---|---|---|---|
| P0-3 | **3 clean end-to-end runs** | C | ⬜ TODO | Run full demo three times; fix root-cause of any crash. The demo must run reliably before the room. |
| P0-4 | **API quota / key** | C / team | ⬜ TODO | Shared key resets 2026-07-01. Raise cap or swap key so LLM narration works on demo day. Fallback covers a no-LLM run but it shouldn't happen. |
| P0-5 | **Backup recording** | C | ⬜ TODO | Record one clean run (QuickTime/OBS). Upload and link in README as insurance against hardware failure. |

---

## 🟠 P1 — Signature demo beats

| ID | Item | Owner | Status | Description |
|---|---|---|---|---|
| P1-4b | **Wire AI debrief text** | C | ⬜ TODO | `commander.generateDebrief()` is async; call it on `phase==='complete'`, store result in worldStore or local state, and pass it to the `DebriefOverlay` in HUD.tsx (the overlay shell is already built — just needs the AI-written text slot filled). |
| P1-5 | **Counterfactual chart** | C / A | 🟡 Partial | The DebriefOverlay now shows a static side-by-side (Haven vs baseline). For full polish: feed real AI vs baseline numbers through. Low risk to leave as static for demo. |
| P1-6b | **Demo-sequence QA** | C | ⬜ TODO | `startDemoSequence()` is wired to START button. Verify the T+8s / T+20s / T+35s camera cuts and comms log narration actually fire and look good. Adjust timing if needed. |

---

## 🟡 P2 — Polish & correctness

| ID | Item | Owner | Status | Description |
|---|---|---|---|---|
| P2-6b | **SSAO performance check** | Harshith | ⬜ TODO | SSAO added with `enableNormalPass`. Test on the demo machine at 60fps. Remove `<SSAO>` from PostProcessing.tsx if it drops frames — the scene looks great without it. |
| P2-8 | **Camera preset tuning** | Harshith | ⬜ TODO | With new build-site positions (x=145–185, z=58/90), the `buildsite` camera preset at `pos:[140,35,145] target:[140,0,90]` may be slightly off-center. Tweak in Camera.tsx if the T+35s cut doesn't frame the homes cleanly. |
| P2-9 | **README + public repo** | C | ⬜ TODO | One-line description, run instructions, backup-video URL, "what judges should do." Keep repo public for the code-review rubric. |

---

## ⚪ P3 — Stretch (safe to cut, all in §11.3)

| ID | Item | Owner | Description |
|---|---|---|---|
| P3-1 | Voice command | A | Web Speech API. High demo impact. Typed input already covers the requirement. |
| P3-2 | Restoration agent | B | 4 sub-missions as narrated + lightweight visual. Represents breadth without full sim. |
| P3-3 | Sentinel foresight layer | B | Simple "next storm in zone X" forecast that changes siting. |
| P3-4 | Drone-camera AI vision | B / Harshith | First on the cut list per §11.3. |
| P3-5 | Animated floodwater | Harshith | Normal-map ripple Reflector. `Hazards.tsx` has the TODO. |

---

## ✅ Done (no further action needed)

### Brain (B)
- Commander loop, specialist agent voices, serializer, deterministic fallback (incl. timber-shortage rule), plain-prose debrief, API-spam fix. Pushed commit `2711f34`.

### Simulation (C)
- Grid/world, A* pathfinding + movement, hazard spread, fog of war, urgency decay, unit failure, scoring + carbon ledger.
- `onTaskArrival()` — rescue/sort/build consequences, housing completion, family housing.
- `deductMaterial()` — called on each `build_module`, stock depletes organically.
- Phase transitions: `deploying → active → complete` (gates debrief).

### Integration (C)
- App scaffold, frozen types, bus, store, full sim→store→renderer→AI loop.
- All 3 chaos events wired (timber shortage, second storm, new families).
- Human command input + `startDemoSequence()` wired to START button.

### Visual / 3D (Harshith)
- **Scene:** HDRI environment background (`kloofendal_overcast.hdr`) replaces white Sky; cinematic overcast lighting.
- **Terrain:** PBR ground texture (albedo + roughness), asphalt road grid through housing zone, dense rubble mounds with texture in disaster zone, collapsed building ruins, 160 instanced pine trees in eastern belt + south border + north corridor.
- **Layout:** Build sites reorganised into clean 2×3 neighbourhood grid (x=145/165/185, z=58/90) with roads at z=47/76/105 and N-S street at x=133. Robot staging rows at z=215/222/229.
- **Buildings:** Wall colour tinted by `materialChoice` (imported_timber=#c8b89a, salvaged_timber=#9caa86, recycled_panels=#8fa39b) — timber→recycled switch is visible in 3D.
- **RobotFleet:** Status-ring colours updated to spec (idle=blue, moving=light-blue, working=green, blocked=amber, failed=red).
- **PostProcessing:** SSAO added (`enableNormalPass`), Bloom, ACES tone mapping, Vignette.
- **Hazards:** Fire particles capped at ≤500 total.
- **FogOfWar:** DataTexture rebuild batched to every 5 ticks.
- **Camera:** Scripted `<Camera/>` used during demo (cinematic drift + preset cuts); `<OrbitControls>` used before START for free exploration.

### HUD (A / Harshith)
- **Layout:** CSS grid now has 4 corners — `topLeft` (clock), `topCenter` (scoreboard), `topRight` (CarbonMeter spanning 2 rows), `bottomRight` (comms), `bottomCenter` (operator).
- **CarbonMeter:** Imported and rendered in `topRight` — shows avoided %, timber stock, shortage warning.
- **Color classes:** `.green`, `.red`, `.cyan`, `.amber`, `.white`, `.muted` now defined in `hud.module.css`.
- **Cold-open card:** Glass splash card centred on screen before START — shows "HAVEN / AI Disaster Relief Commander / Press START."
- **Debrief overlay:** Full-screen glass overlay on `phase==='complete'` — shows families housed, carbon avoided, people rescued, vulnerable-first %, and a static AI vs baseline counterfactual panel.
- **CommsLog:** Width fixed to `100%` (was hardcoded 420px, overflowing the 270px column).

---

## How to verify "done" once P0 items land

```
npm run dev  →  open http://localhost:3000
```
1. **Before START:** HDRI sky visible (overcast/dusk), road grid + trees + rubble + ruins in scene; HAVEN title card centred.
2. **START:** Scripted camera kicks in; comms log starts narrating; drones fan out.
3. **Running:** CarbonMeter in top-right ticks up as salvage completes; robot rings glow per status colour.
4. **TIMBER SHORTAGE:** Houses re-tint from warm beige to recycled-panel blue-grey; carbon meter drops visibly.
5. **Mission complete:** Debrief overlay appears with final stats + counterfactual.
6. Keep `npx tsc --noEmit` and `npx vite build` clean throughout.
