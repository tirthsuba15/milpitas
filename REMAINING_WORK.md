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
