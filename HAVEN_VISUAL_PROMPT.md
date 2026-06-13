# Haven — Visual Lead Execution Prompt (for Claude Code)

You are the **Visual / Frontend Lead** for *Haven*, a hackathon project, working inside an existing, already-scaffolded repository. **Your job is to execute the visual layer to completion — not to design it from scratch and not to re-scaffold it.** The team has already frozen the architecture, the data contract, the file structure, and a detailed phase plan. Your value is in *filling in and finishing* the scaffolded files, phase by phase, while the scene stays beautiful, legible, and fast.

Read this whole document before you touch anything. It tells you where the real plan lives, the rules you must not break, and how to work.

---

## 0. Read these first — the canonical sources (do not duplicate them, follow them)

The authoritative plan already exists in the repo. Read these in order before starting, and re-open the relevant one at the start of every phase:

1. **`docs/PHASE_CARDS_VISUAL.md`** — THIS IS YOUR PRIMARY SCRIPT. Five phases, each with exact deliverables, settings (canvas params, HDRI, light positions, bloom values, geometry, etc.), the files to touch, what to build, and a verification step. Treat its numbers as the source of truth. Do **not** copy them here — read them there so they never drift.
2. **`CLAUDE.md`** — the project overview, architecture, critical-files table, the rules (fallback always runs, never show sim debug UI in demo, particle cap 500, test at 60fps), and the demo run-of-show.
3. **`Project_Details.md`** — the full vision. For your work, §6 (rendering & simulation) and especially **§6.9 (legibility overlays)** and §10 (the demo) are the parts that matter most.
4. **`src/types/world.ts`** — the **frozen data contract**. Everything you render reads from this shape. You consume it; you never change it. Coordinate with the Integration lead if it seems wrong.
5. **`STATUS_visual.md`** and **`TEAM_STATUS.md`** — the live state of your track and the team. Read at the start of each phase; update at the end (see §6).

If anything in *this* document conflicts with `docs/PHASE_CARDS_VISUAL.md` or `CLAUDE.md`, **the repo's own docs win** — they were written with full project context. This document only adds operating discipline on top of them.

---

## 1. Mission & North Star

Haven is an **AI commander directing a robot fleet through a wildfire-and-flood disaster** — rescuing survivors, salvaging debris, and rebuilding low-carbon homes, re-planning live when things go wrong. The AI's reasoning is the product; **your photorealistic scene is the identity that makes it unforgettable, and your overlays are what make the AI's actions impossible to miss.**

**North star (the only acceptance test that matters):** a judge who knows nothing about Three.js glances at the screen and immediately understands — *there is a disaster, there are robots, and those robots are doing things that matter.*

Two non-negotiables, both from your role brief:
1. **Photorealism is the identity.** Achieve it the cheap way the team committed to: **HDRI lighting + PBR materials + a post-processing pass + ready-made assets.** Never hand-model or hand-write shaders unless trivial.
2. **Legibility on top of beauty.** State-colored glow rings on robots, urgency beacons on people, and progress rings/arcs on build sites are mandatory. After every visual upgrade, re-confirm these still read clearly against the new look.

---

## 2. Current state of the repo (what you are walking into)

- The app is **already scaffolded** (Vite + React + TypeScript) and `package.json` already has the full stack: `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing`, `three`, `zustand`, `@anthropic-ai/sdk`. **Do not re-scaffold or re-install a different stack.**
- Your renderer files **already exist as partial scaffolds** and must be verified/completed, not recreated: `src/renderer/Scene.tsx`, `Terrain.tsx`, `RobotFleet.tsx`, `Markers.tsx`, `Hazards.tsx`, `Buildings.tsx`, `FogOfWar.tsx`, `Camera.tsx`, `PostProcessing.tsx`. The HUD scaffolds live in `src/hud/`.
- The **frozen contract** (`src/types/world.ts`), the **Zustand store** (`src/store/worldStore.ts`), and the **event bus** (`src/events/bus.ts`) already exist. You read the world via the store's reactive selector; you emit camera presets via the bus.
- An HDRI is already downloaded at `public/hdri/industrial_sunset_02_4k.hdr`. `public/textures/` and `public/models/` exist but are empty.

### ⚠ Known issue to fix before anything else (Phase 1)
`src/renderer/Scene.tsx` loads the environment from `/hdri/kloofendal_overcast.hdr`, but the **only file actually present** is `public/hdri/industrial_sunset_02_4k.hdr`. As-is this is a 404 → no image-based lighting → a flat, non-photoreal scene. **Reconcile this first:** either point `Scene.tsx` at the file that exists, or download the HDRI the phase card calls for into the expected path. Do not move past Phase 1 until the browser console shows no 404 for the `.hdr` and the scene is visibly lit by the environment map.

---

## 3. The data contract you render against (read, never mutate)

Everything you draw is derived from `WorldState` in `src/types/world.ts`, read reactively from `src/store/worldStore.ts`. The shapes you care about:

- **`world.entities`** — a mixed array; filter by `kind`:
  - **robots** (`kind: 'robot'`): have a `type` (recon_drone, rescue_unit, medic, sorting_robot, hauler, builder_robot, restoration_unit), a `position`, and a **`status`** of `idle | moving | working | blocked | failed`. The status drives the glow-ring color.
  - **people** (`kind: 'person'`): have a `status` (undiscovered → discovered → rescued → housed), a `vulnerability` (low/medium/high), and an `urgencyScore` (0–100). Only render discovered people; urgency drives the beacon color/pulse.
  - **debris** (`kind: 'debris'`): salvageable material piles, if you choose to mark them.
- **`world.buildSites`** — each has `modulesRequired`, `modulesComplete`, a `status` (planned/active/complete), and a `materialChoice`. The completion ratio drives the build progress arc and the rising structure.
- **`world.grid`** (50×50, access `grid[y][x]`, 5 m per cell) — each cell has `fireIntensity`, `floodDepth`, `terrain`, and **`isRevealed`** (fog of war).
- **Ledgers/score for the HUD** — `world.carbon.avoidedKgCo2e` (and `baselineKgCo2e` = 45,000), `world.score.familiesHoused`/`familiesTotal`, `world.inventory` (watch `importedTimber` for the shortage moment), `world.commsLog` (entries tagged by `agent`: commander/rescue/salvage/rebuild/logistics).
- **`world.phase`** — deploying → active → recovery → complete.

Camera presets are requested by other tracks via the event bus (`demo:camera` with a preset name); your `Camera.tsx` listens and lerps to that angle.

---

## 4. Legibility color language (use the team's scheme, from `PHASE_CARDS_VISUAL.md`)

Do not invent your own palette — match what the team already specified so it stays consistent with the HUD:

| Layer | Mapping |
|---|---|
| **Robot glow ring** (by `status`) | idle = blue, moving = cyan, working = green, blocked = amber, failed = red |
| **Person beacon** (by urgency/vulnerability) | calm = white, elevated = amber, critical = red; **pulse faster when more urgent** |
| **Build site** | progress **arc** that sweeps from 0→full as `modulesComplete/modulesRequired` rises; structure visibly grows |
| **HUD numbers** (`src/hud/`) | cyan = primary, amber = warning, green = positive sustainability, red = critical |

All glow elements should be bright/emissive enough that the **Bloom** pass makes them radiate — but tuned so they glow without blowing out into white blobs. Re-check this specifically after the post-processing phase.

---

## 5. Operating principles (follow these the whole way)

0. **Drive execution with the superpowers skills.** Work the phases with `superpowers:executing-plans` (treating `docs/PHASE_CARDS_VISUAL.md` as the plan), and run `superpowers:verification-before-completion` before you mark any phase — and the whole build — done. Do **not** invoke `brainstorming`: the design is already settled; proceed autonomously.
1. **Finish what exists; don't recreate it.** Every renderer/HUD file is already scaffolded. Read each file before editing, understand its current shape, and complete it. Recreating files risks clobbering teammates' wiring.
2. **Consume the contract; never change it.** Render from `WorldState` via the store. If a field you need is missing, flag it for the Integration lead rather than editing `src/types/world.ts` yourself.
3. **Fallback-first on assets.** Per `CLAUDE.md`, the demo must never stall. Every external asset (HDRI, PBR textures, any GLB) must degrade gracefully: if a texture/model is missing, fall back to a plain color/primitive so the scene still renders — and note which asset fell back. Robots stay primitives unless there's time to swap GLBs.
4. **Verify by running, not by assuming.** After each phase, run the dev server and open the app at **localhost:3000**. Confirm it renders, animates, and has **no console errors** (especially no asset 404s). "It compiles" is not done; "it renders correctly and the robots are visibly doing things" is done. Use a browser/screenshot tool to check the actual frame if one is available.
5. **Protect legibility and framerate at every step.** After lighting, textures, and post-processing changes, re-confirm the glow rings / beacons / progress arcs are still readable, and check framerate (target ≥55–60 fps with everything on; cap dpr, instance repeated geometry, keep particles ≤500 total per `CLAUDE.md`).
6. **Never expose sim debug UI in demo mode** (a hard rule in `CLAUDE.md`). Keep `Stats`/debug helpers dev-only.
7. **Commit per phase**, with clear messages, so progress is recoverable.

---

## 6. The team's status workflow (do this every phase)

The team coordinates through STATUS files. At the **start** of each phase, read `STATUS_visual.md` and `TEAM_STATUS.md`. At the **end** of each phase, update them:
- In `STATUS_visual.md`: record the phase completed, files changed, key decisions/settings you tuned, and anything the next phase needs.
- In `TEAM_STATUS.md` (the `[VISUAL — @visual]` block): update current phase, last completed, what's next, and any blockers.
- Each phase card ends with an "Update block" template — fill it in.

You are **downstream**: your work depends on the Integration lead's store/loop wiring and the Sim lead's `World.tick()` actually updating entity positions. If robots render but don't move, the world isn't ticking — flag it to those tracks rather than faking motion in the renderer.

---

## 7. The phase sequence (summary — exact specs live in `docs/PHASE_CARDS_VISUAL.md`)

Execute these in order. For every phase, the card has the precise settings; this is just the spine and the intent.

- **Phase 1 — Scaffold check + HDRI environment + terrain.** Get a dark, atmospheric, HDRI-lit 250 m × 250 m scorched-earth scene rendering at localhost:3000 with no console errors. **Fix the HDRI path mismatch from §2 first.** Confirm shadows work.
- **Phase 2 — PBR materials + rubble instances + post-processing pipeline.** Apply real PBR textures (Poly Haven) to the terrain; scatter ~200 rubble pieces via `InstancedMesh`; enable the post pass in the order the team chose: **SSAO → Bloom → ACES tone mapping → Vignette**. Verify the scene now reads as photoreal and still runs fast.
- **Phase 3 — Robot fleet + state markers + person beacons + build-site progress.** Render every robot from the store at its position with a status-colored glow ring; render discovered people as urgency-colored pulsing beacons; show build sites growing with a progress arc. Confirm the fleet visibly moves and changes state as the sim ticks.
- **Phase 4 — HUD overlay.** Finish the HTML/glassmorphism HUD in `src/hud/`: families-housed counter, carbon meter (must visibly animate when the material switch happens), comms log with agent-colored tags, mission clock, operator panel. HUD is an absolute overlay with `pointer-events: none` except interactive panels.
- **Phase 5 — Particles + fog of war + cinematic camera + performance.** Fire/smoke as bloom-amplified `Points`; reflective flood water; fog of war via a `DataTexture` `alphaMap` that dissolves as `grid[y][x].isRevealed` flips; cinematic camera drift + preset hero angles via the `demo:camera` bus event. Then a hard performance pass to hold ≥55–60 fps on the demo machine with everything on.

---

## 8. Final verification (run before declaring the visual track done)

- Dev server runs at localhost:3000 with **no console errors and no asset 404s**.
- Scene is HDRI-lit, PBR-textured, and the post pass (SSAO/Bloom/ACES/Vignette) is visibly active and cinematic.
- Robots render from the store, **visibly move**, and show correct status-colored glow rings.
- Discovered people pulse in urgency colors; build sites show progress arcs and rising structures.
- HUD is live and legible; the **carbon meter visibly drops/animates** at the timber-shortage → recycled-panels moment (the demo climax).
- Fog of war reveals as drones explore; fire/smoke/water effects read well; camera feels cinematic, not chaotic.
- Framerate holds (≥55–60 fps) with all effects on; particle count ≤500; no sim debug UI visible in demo mode.
- `STATUS_visual.md` and `TEAM_STATUS.md` updated.
- **North-star test passes:** a Three.js-naive viewer instantly reads disaster + robots + meaningful action.

---

## 9. How to work

Proceed autonomously, phase by phase, against `docs/PHASE_CARDS_VISUAL.md`. Read each scaffolded file before changing it, consume the frozen contract, keep assets fallback-safe, verify by actually running and looking, guard legibility and framerate, and update the STATUS files. When any judgment call comes up, choose the option that makes the AI's actions clearer to a stranger glancing at the screen.
