# Phase Cards — Visual / Frontend Lead
*Haven Hackathon · 6-hour build · 4 people*

**Your role:** You make Haven look real. The photorealism is the identity — it's what makes the room lean in before the AI makes its first move. But photorealism in a hackathon is a trap: nobody has time to hand-model assets or write shaders. The strategy is: HDRI lighting + PBR materials + post-processing pass + ready-made assets. These three levers do 95% of the visual work. Your job is to know exactly which buttons to press and in what order.

**Second job, equally important:** Keep the AI's actions legible on top of the beauty. A gorgeous scene where you can't see what the robots are doing is a failure. State-colored glow rings, pulsing urgency markers, progress rings on build sites — these are non-negotiable overlays.

**Your north star:** A judge who knows nothing about Three.js should look at the screen and immediately understand: there's a disaster, there are robots, and those robots are doing things that matter.

> **What changed in this revision (read first):** This card has been reconciled against the actual frozen contract (`src/types/world.ts`), the live scenario (`src/simulation/World.ts`), the other three tracks' phase cards, and the components that already exist in `src/renderer/` and `src/hud/`. The code was scaffolded *from* the original version of this card, so the phase specs below are mostly accurate — but several details had drifted and several judge-facing UI pieces were missing. The new material is: **§0 (the screen)**, **§0.5 (the read-only data contract)**, the **material-switch legibility** addition (Phase 3 + 5), the **debrief / mission-complete overlay** (Phase 5), the **cold-open START state** (Phase 4), and the **Cross-track corrections** section near the end. Where a phase says "verify `X.tsx` — it may be scaffolded," it now *is* scaffolded; your job there is to finish/polish, not recreate.

---

## §0 — What Haven looks like (the screen)

This is the single picture everything else serves. The final composited frame is a **photoreal 3D disaster zone** (full-bleed canvas) with a **glassmorphism HUD floating on top** (HTML, `pointer-events: none` except controls). Nothing about the HUD blocks the 3D; nothing about the 3D hides the AI's decisions.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌────────────┐        ┌──────────────────────────────┐        ┌─────────────┐ │
│ │ MISSION    │        │  3 / 4 FAMILIES   2/2 RESCUED │        │ CARBON      │ │
│ │ 02:14      │        │  CARBON 41%  WASTE 4.3t  …    │        │ LEDGER      │ │
│ │ Fleet 6/8  │        └──────────────────────────────┘        │  ███████ 41%│ │
│ │ ACTIVE     │                                                 │  ▲ vs base  │ │
│ └────────────┘            (photoreal 3D scene fills            │  ─────────  │ │
│                            the entire viewport behind          │  Timber 0.0t│ │
│         🔥  scorched terrain, drifting fire,                   │  ⚠ SHORTAGE │ │
│             floodwater, rubble, robots with                    │  Recyc 9.6t │ │
│             glowing state rings, pulsing                       │             │ │
│             survivor beacons, homes rising                     │             │ │
│             on build sites with progress arcs)                 │             │ │
│                                                                 │             │ │
│      ┌──────────────────────────────────────────────┐         │             │ │
│      │ ▶START  TIMBER  2ND STORM  +FAM  [cmd…] SEND  │         │             │ │
│      └──────────────────────────────────────────────┘         │             │ │
│      ┌──────────────────────────────────────────────┐         │             │ │
│      │ MISSION COMMS                                  │         │             │ │
│      │ [CMD] Assigning rescue to NW fire zone…        │         │             │ │
│      │ [RSC] Medic dispatched to surv-1, ETA 18s      │         │             │ │
│      │ [RBD] Switching site-2 to recycled panels…     │         │             │ │
│      └──────────────────────────────────────────────┘         └─────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
   ↑ top-left          ↑ top-center                                  ↑ right (full height)
   MissionClock        Scoreboard                                    CarbonMeter
   ↑ lower-center: OperatorPanel    ↑ bottom-left: CommsLog
```

This layout already exists in `src/hud/HUD.tsx` + `hud.module.css` (CSS grid: `220px | 1fr | 240px`). Don't rebuild it — fill and polish it.

**The six things a judge MUST be able to read at a glance** (this is your acceptance test, in priority order):

1. **"There's a disaster."** Dusk HDRI gloom, scorched terrain, drifting fire particles, reflective floodwater, scattered rubble. (Phases 1–2, 5)
2. **"There are robots, and I can tell what state each is in."** Every robot wears a state-colored glow ring (idle/moving/working/blocked/failed). (Phase 3)
3. **"I can tell who needs help and how badly."** Discovered survivors/families pulse in urgency colors; critical ones throw a vertical beacon. (Phase 3)
4. **"Homes are going up, and I can see progress."** Build sites grow a volume + sweep a progress arc as modules complete. (Phase 3)
5. **"The AI is thinking out loud."** The comms log scrolls agent-tagged decisions (~1 every 3s, bursts during chaos). (Phase 4)
6. **"The green choice is winning — I can watch it happen."** When timber runs out, the carbon meter shoots up **and the affected homes visibly change material color**. (Phase 3 tint + Phase 4 meter — this is the demo climax; see §0.5 and the Phase 5 debrief)

If any of those six is not instantly legible to a non-technical judge, that's a bug regardless of how pretty the frame is.

---

## §0.5 — Visual data contract (read-only reference)

Every renderer/HUD component reads from one place: `useWorldStore(s => s.world)` (a Zustand selector, reactive — re-renders on every tick). **You never mutate the world.** The shape is frozen in `src/types/world.ts` (owned by Integration). Keep this table next to you so no phase invents a field that doesn't exist.

**The live scenario you are rendering** (from `createInitialWorld()` in `src/simulation/World.ts` — these are the real counts; use them in mockups, don't guess):

| Thing | Count | Detail |
|---|---|---|
| People | **6** | 4 `displaced_family` (fam-1 high/4 members, fam-2 high/5, fam-3 medium/3, fam-4 low/2) + 2 `survivor` (surv-1 high, surv-2 medium). All start `undiscovered`. |
| Robots | **8** | 2 `recon_drone`, 2 `rescue_unit`, 1 `medic`, 1 `sorting_robot`, 1 `hauler`, 1 `builder_robot`. (No `restoration_unit` in the base scenario — leave its color in the map for `+FAMILIES`/stretch.) All spawn at the south edge (z ≈ 225–230). |
| Build sites | **3** | site-1/2/3, each `modulesRequired: 4` (12 modules total), all start `materialChoice: 'imported_timber'`, `status: 'planned'`. East-central (x 120–160, z 80–100). |
| Debris | **6** | 2 timber, 1 steel, 1 aggregate, 1 recycled_plastic, 1 contaminated. Mid-map. |
| Grid | 50×50 | `cellSizeM = 5` → 250 m × 250 m. Access as `grid[y][x]`. World/scene coords are **meters** (cell.x × 5). |

So the Scoreboard's big number is **`familiesHoused / 4`**, and "Rescued" is **`peopleRescued / 2`** (`familiesTotal` = count of `displaced_family`, `peopleTotal` = count of `survivor` — see `scoring.ts`). The `+FAMILIES` chaos event adds 4 families + 2 recycled-panel sites, so these totals can grow — always read them live, never hardcode.

**Enums you render against (exact, from `world.ts`):**

- `RobotStatus = 'idle' | 'moving' | 'working' | 'blocked' | 'failed'` → ring color
- `RobotType = 'recon_drone' | 'rescue_unit' | 'medic' | 'sorting_robot' | 'hauler' | 'builder_robot' | 'restoration_unit'` → body color/shape
- `PersonStatus = 'undiscovered' | 'discovered' | 'rescued' | 'housed'` → render only `discovered` (and optionally a settled look for `housed`); `undiscovered` stays hidden under fog
- `VulnerabilityLevel` + `urgencyScore` (0–100) → beacon color/pulse rate
- `BuildSiteStatus = 'planned' | 'active' | 'complete'` and `MaterialChoice = 'imported_timber' | 'salvaged_timber' | 'recycled_panels'` → footprint color **and home tint**
- `AgentType = 'commander' | 'rescue' | 'salvage' | 'rebuild' | 'logistics'` → comms tag color (note: there is **no** `restoration` agent type)
- `world.phase = 'deploying' | 'active' | 'recovery' | 'complete'` → cold-open vs live vs debrief (⚠ see Cross-track corrections — phase currently never leaves `'deploying'`)

**Color tables (already in code — keep them consistent, don't reinvent per phase):**

| Robot state ring (`RobotFleet.tsx`) | Hex | | Person urgency (`Markers.tsx`) | Hex |
|---|---|---|---|---|
| idle | `#4488ff` | | urgency ≤ 50 (calm) | `#ffffff` |
| moving | `#44aaff` | | urgency 51–80 (amber) | `#ffaa00` |
| working | `#44ff88` | | urgency > 80 (critical, + beacon) | `#ff4444` |
| blocked | `#ffaa00` | | | |
| failed | `#ff4444` | | | |

| Comms tag (`CommsLog.tsx`) | Label | Hex | | HUD palette (`hud.module.css`) | Hex |
|---|---|---|---|---|---|
| commander | CMD | `#00d4ff` | | primary / numbers | `#00d4ff` |
| rescue | RSC | `#ff8844` | | warning | `#ffaa00` |
| salvage | SLV | `#aadd44` | | positive / sustainability | `#44ff88` |
| rebuild | RBD | `#44ddff` | | critical | `#ff4444` |
| logistics | LOG | `#cc88ff` | | text / muted | `#e0e0e0` / `#666` |

**Bus events you listen to** (`src/events/bus.ts`, type-safe — owned by Integration): `'demo:camera'` → `{ preset: 'wide' | 'buildsite' | 'rescue' | 'debrief' }` (Camera.tsx), and the chaos events `'chaos:timber_shortage' | 'chaos:second_storm' | 'chaos:new_families'` + `'demo:start'` if you want a visual cue on any of them. You **emit** nothing except, optionally, camera presets for your own testing.

---

## Phase 1 — R3F Scaffold + HDRI Environment + Basic Terrain
**Time budget:** 0:00–0:45 (45 minutes)
**Starts when:** Integration lead confirms `npm run dev` works

### Deliverable
The browser shows a 3D scene: a dark, scorched terrain plane (250m × 250m), lit by a real HDRI environment map that makes it look atmospheric and cinematic. The scene has dramatic lighting — the HDRI should immediately read as a disaster zone (overcast / smoke-filtered light). `npm run dev` serves this at localhost:3000 with no console errors.

### Key decisions
- **Canvas settings** (already set in `Scene.tsx`): `shadows`, `gl={{ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }}`, `camera={{ fov: 55, near: 0.5, far: 2000, position: [80, 60, 80] }}`, `dpr={[1, 1.5]}`.
- **HDRI:** `Scene.tsx` loads `<Environment files="/hdri/kloofendal_overcast.hdr" background backgroundBlurriness={0.05} />`. ✅ The file now exists at `public/hdri/kloofendal_overcast.hdr` (and a backup `industrial_sunset_02_4k.hdr` is also present). **Verify it's a real 2K .hdr and not a placeholder** — open the scene; if it's flat/bright, check the console for a 404 or a malformed-HDR error and re-download from polyhaven.com ("kloofendal 48d partly cloudy", 2K). This single asset is the biggest jump toward photoreal — guard it.
- **Directional light:** already at `position={[80, 120, -60]}`, `intensity={1.4}`, `castShadow`, `shadow-mapSize={[2048, 2048]}` + a low `ambientLight intensity={0.2}`.
- **Terrain:** `Terrain.tsx` renders a `<Plane args={[250, 250, 128, 128]}>` at `position={[125, 0, 125]}` (so world space is positive, matching entity coords), dark scorched color `#3d2b1f`, `receiveShadow`. 128² segments are for later displacement.

### Camera note (corrected)
`Scene.tsx` already renders `<Camera />` (cinematic drift + presets), **not** `OrbitControls`. If you need to inspect from arbitrary angles while building, temporarily drop in `<OrbitControls />` from drei, but remove it before any demo run — the final camera is `Camera.tsx`. (The old card said "OrbitControls is temporary, remove in Phase 5"; it's already gone — don't add it back permanently.)

### What to build / verify
1. Confirm the HDRI loads and the scene reads as a moody dusk disaster zone (not flat/bright). This is the gate for everything.
2. Confirm the terrain plane sits under the entities (it's centered at 125,0,125 — entities spawn at x 30–170, z 30–230, so they land on it).
3. Confirm shadows: temporarily drop a test box above the terrain, see it cast a shadow, remove it.
4. No console errors at localhost:3000.

### Update block
```
PHASE 1 COMPLETE
Deliverable: Scene renders with HDRI, dramatic terrain visible, camera drift working
HDRI file: [confirm path + that it's a real 2K HDR, not placeholder]
Key decisions: [any settings adjustments]
Blockers / Phase 2 needs: working scene with HDRI confirmed
```

---

## Phase 2 — PBR Materials + Rubble Geometry + Post-Processing Pipeline
**Time budget:** 0:45–1:45 (60 minutes)

### Deliverable
The terrain has a physically-based material with real PBR textures (albedo, normal, roughness, ao — from Poly Haven). ~200 rubble instances are scattered via `InstancedMesh`. The post-processing pipeline is active and the scene reads as genuinely photoreal.

### Key decisions
- **Textures (download first, in parallel):** polyhaven.com → "Aerial Rocks" or "Gravel Stones" PBR set, 1K JPG → `public/textures/ground_albedo.jpg`, `ground_normal.jpg`, `ground_roughness.jpg`, `ground_ao.jpg`. Optionally "Cracked Mud" for flood edges. `Terrain.tsx` already has the load commented out with the exact filenames it expects.
- **Texture repeat:** `repeat(6, 6)` (or 8,8 per the in-file TODO — pick what looks un-stretched) with `wrapS = wrapT = RepeatWrapping` on every map.
- **Rubble InstancedMesh:** `Terrain.tsx > RubbleMounds()` currently hardcodes ~10 boxes. Replace with one `THREE.InstancedMesh(geometry, material, 200)`: loop a dummy `Object3D` (position scattered with clustering toward the NW fire zone, random y-rotation, random scale 0.5–2.5×), `setMatrixAt(i, dummy.matrix)`, then `instanceMatrix.needsUpdate = true`. Do it once in `useEffect([], …)` against a `useRef`.
- **Post-processing — ⚠ correction:** `PostProcessing.tsx` currently runs **Bloom → ACES ToneMapping → Vignette only. SSAO is NOT in the pipeline yet.** Add SSAO (from `@react-three/postprocessing` / the `postprocessing` lib) **first** in the chain (SSAO → Bloom → ToneMapping → Vignette) — it's what grounds objects so they sit *in* the scene instead of floating. Caveat: SSAO is the most expensive effect and the **first thing to drop** if framerate suffers (see Phase 5). Bloom is already tuned: `luminanceThreshold: 0.55, luminanceSmoothing: 0.2, intensity: 0.9, mipmapBlur`.

### What to build
1. Drop textures into `public/textures/`, uncomment + wire the `useTexture([...])` load in `GroundPlane()`, apply `map/normalMap/roughnessMap/aoMap` with RepeatWrapping.
2. Replace `RubbleMounds()` with the 200-instance `InstancedMesh`.
3. Add SSAO to `PostProcessing.tsx` (tune `intensity` down if the scene goes muddy).
4. Perf check: should hold >60fps with rubble + post. If not, drop rubble count or SSAO samples.

### Update block
```
PHASE 2 COMPLETE
Deliverable: PBR terrain, ~200 rubble instances, full post chain (SSAO+Bloom+ACES+Vignette)
Key decisions: [textures used, rubble count, whether SSAO survived perf]
Blockers / Phase 3 needs: post-processing confirmed active
```

---

## Phase 3 — Robot Fleet + State Markers + Person Beacons + Build Sites (with material legibility)
**Time budget:** 1:45–3:00 (75 minutes)

### Deliverable
Every `RobotEntity` renders at its live position with a state-colored glow ring. Every `discovered` `PersonEntity` pulses in its urgency color (critical ones throw a beacon). Build sites grow a volume + sweep a progress arc — **and their home tint reflects `materialChoice`, so a switch to recycled panels is visible in the world itself.** The fleet visibly moves and changes state as the AI issues commands.

### Key decisions
- **Robots** (`RobotFleet.tsx`, scaffolded): drones = `CylinderGeometry(0.8,0.8,0.3,8)`, ground units = `CapsuleGeometry(0.4,1.2,4,8)`, body color from `ROBOT_COLORS[type]`, ring color from `STATUS_COLORS[status]` (`RingGeometry(0.9,1.3,32)` flat on the ground, pulsing opacity when `working`). This works today. **Legibility upgrade (do this):** with 7 robot types and only color to tell them apart, a judge can't distinguish a medic from a hauler. Add a cheap type cue — either a small drei `<Billboard>`+`<Text>` two-letter label (DR/RS/MD/SO/HL/BD) floating above each unit, or two distinct silhouettes (drones already differ; give builders/haulers a small box "payload"). Keep it subtle so it doesn't fight the rings.
- **Optional "doing things that matter" line:** if a robot has `task !== null`, draw a thin faint line from the robot to `task.targetPosition`. This directly serves the north star (you can *see* intent), costs almost nothing, and reads beautifully under bloom. Cut it first if it clutters.
- **Person beacons** (`Markers.tsx`, scaffolded): `SphereGeometry(0.6)`, `emissive` = urgency color, `emissiveIntensity 0.8` (blooms), scale pulse faster with higher urgency, vertical beam when `urgencyScore > 80`. Already correct.
- **Build sites** (`Buildings.tsx`, scaffolded): footprint plane + a box volume that grows with `modulesComplete/modulesRequired` + a `RingGeometry` progress arc (`args=[5,5.6,64,1,0,Math.PI*2*progress]`) + a solar roof past 80%. **⚠ Material legibility (the climax fix):** the home volume currently hardcodes `#c8b89a` and **ignores `site.materialChoice`**. Tint it by material so the timber→recycled switch is visible on the model, not only on the meter:
  - `imported_timber` → warm timber `#c8b89a` (current)
  - `salvaged_timber` → weathered reclaimed `#9caa86`
  - `recycled_panels` → cool grey-green composite `#8fa39b`
  Optionally flash/scale-pop the volume on a material change so the eye catches it. This is the difference between "the number went up" and "I watched the building become greener."

### What to build / verify
1. `RobotFleet.tsx`: confirm robots appear at spawn (south, z≈225) and move once the sim runs; add the type cue.
2. `Markers.tsx`: confirm discovered people pulse in urgency color after drones lift the fog; critical beacon shows.
3. `Buildings.tsx`: add the `materialChoice` tint; verify a site set to `recycled_panels` renders visibly different from `imported_timber`. Confirm the volume grows with `modulesComplete` (set one to 2/4 manually to test half-height).
4. Perf: 8 robots + up to 6 people + 3–5 sites + post should hold >55fps. If not, drop capsule segments 8→4.

### Update block
```
PHASE 3 COMPLETE
Deliverable: robots moving with state rings + type cues, people pulsing, homes growing + material-tinted
Key decisions: [type-cue approach, task-line in or out, material tint hexes]
Blockers / Phase 4 needs: actors visible + animated, material switch visible in-world
```

---

## Phase 4 — HUD Overlay (Scoreboard, Carbon Meter, Comms Log, Cold-Open)
**Time budget:** 3:00–4:15 (75 minutes)

### Deliverable
The glassmorphism HUD (see §0) overlays the scene and updates reactively: families-housed counter top-center, vertical carbon meter + material inventory on the right, agent-tagged comms log bottom-left, mission clock + fleet status top-left, operator panel (START + chaos + command input) lower-center. Plus a **cold-open state** before the operator hits START. The carbon meter visibly jumps when recycled panels are allocated.

### Key decisions
- **HTML overlay, not 3D UI:** root is `position:absolute; inset:0; pointer-events:none` (in `hud.module.css .overlay`); only `OperatorPanel` and `CommsLog` set `pointer-events:auto`. Already wired in `HUD.tsx`.
- **All panels already exist and read live data.** Your job is the polish pass, not the build:
  - `Scoreboard.tsx` — big `familiesHoused/familiesTotal` (= X/4), plus rescued (X/2), carbon-avoided %, waste diverted (t), vuln-first %. **Make carbon-avoided % the visible climax metric:** give it a brief pulse/flash when `carbon.avoidedKgCo2e` increases (it jumps ~36k — roughly +80% of the 45,000 baseline — the moment one site flips to recycled panels). Without a transition the most important beat passes silently.
  - `CarbonMeter.tsx` — vertical bar `height:${avoidedPct}%` with `transition: height 0.6s ease` (present). Inventory shows amber when `importedTimber < 2000`, red + "⚠ TIMBER SHORTAGE" box at 0. Confirm the bar animates on the switch.
  - `CommsLog.tsx` — last 20 of `world.commsLog`, agent-colored `[TAG]`, auto-scroll on new entry. Cadence is ~1 entry / 3s with bursts during chaos; the 20-line window + scroll is correct. Confirm tags/colors match §0.5.
  - `MissionClock.tsx` — `mm:ss` from `elapsedSeconds`, fleet active/idle/failed counts, `world.phase`.
  - `OperatorPanel.tsx` — START/STOP, three chaos buttons (TIMBER / 2ND STORM / +FAM), command input → `commander.injectHumanCommand()`. Already functional.
- **NEW — cold-open / pre-START state:** before `isRunning` (world is loaded, `phase === 'deploying'`), the screen should read as "armed and waiting," not as a half-dead HUD with zeros. Add a lightweight title/brief card (centered, glass): **"HAVEN — AI Disaster Relief Commander"** + one line of context + a prominent START affordance. It dismisses when the operator hits START. This gives the demo its "the room leans in before the first move" opening (Project_Details §10 beat 1) and hides the all-zeros scoreboard until there's something to show.
- **Palette:** cyan `#00d4ff` (primary), amber `#ffaa00` (warn), green `#44ff88` (sustainability), red `#ff4444` (critical) — already in `hud.module.css`.

### What to build / verify
1. Style pass on every panel against the real running sim — fonts, padding, legibility over the 3D. The families number must dominate.
2. Add the carbon-% pulse to `Scoreboard.tsx`; confirm `CarbonMeter` animates on the timber switch.
3. Build the cold-open card; confirm it shows pre-START and clears on START.
4. Confirm comms auto-scroll and tag colors.

### Update block
```
PHASE 4 COMPLETE
Deliverable: full HUD live + cold-open state; carbon meter + scoreboard % animate on the switch
Key decisions: [cold-open copy, pulse treatment]
Blockers / Phase 5 needs: HUD reactive, carbon climax legible
```

---

## Phase 5 — Particles + Fog of War + Cinematic Camera + Debrief + Performance
**Time budget:** 4:15–6:00 (105 minutes)

### Deliverable
Fire cells render as upward-drifting orange particles (bloom-amplified). Flood areas read as reflective water. Fog of war dissolves cell-by-cell as drones explore (DataTexture `alphaMap`). The cinematic camera drifts in the wide shot and snaps to hero presets on demo beats. A **mission-complete debrief overlay** delivers the closing line + Haven-vs-baseline proof. The scene holds >55fps on the demo machine.

### Key decisions
- **Fire particles** (`Hazards.tsx > FireParticles`, scaffolded): `THREE.Points`, 6 particles/cell, advance y by +0.04/frame, reset at y>6, orange→red vertex colors, bloom does the glow. Positions are pre-allocated with `useMemo` and mutated in `useFrame` (correct). **Cap total at 500** (CLAUDE.md hard rule) — drop `PARTICLES_PER_CELL` if many cells ignite (the 2nd-storm chaos event adds fire cells, so test that path).
- **Water** (`Hazards.tsx > FloodPlanes`, TODO in file): currently per-cell transparent planes (`#1a4a6e`, roughness 0.05). Upgrade to one merged plane or a drei `<Reflector>`/normal-map ripple (`normalMap.offset.x += 0.001/frame`) for shimmer off the HDRI. The flat version is an acceptable fallback.
- **Fog of war** (`FogOfWar.tsx`, scaffolded): `DataTexture` (Uint8 RGBA, alpha 200=dark / 0=clear) updated from `grid[y][x].isRevealed` on `world.tick`, applied as a dark plane above terrain. **Perf:** it currently updates every tick — batch to **every ~3–5 ticks** if it costs frames.
- **Camera** (`Camera.tsx`, scaffolded): ambient drift (`sin(t·0.06)·12` on x) + lerp to preset on `bus.on('demo:camera', {preset})`. Presets already defined: `wide [125,90,230]`, `buildsite [140,35,145]`, `rescue [60,30,100]`, `debrief [125,60,200]`. These are driven by `startDemoSequence()` (`src/scenarios/initial.ts`) — see the beat map below. Verify each preset frames something worth looking at against the real entity positions.
- **NEW — debrief / mission-complete overlay (Visual owns the rendering):** Project_Details §10 beat 7 and `commander.generateDebrief()` both exist, but **no UI renders them.** Build a full-screen glass overlay shown on mission end that displays: (1) the AI's one-line debrief string (from `generateDebrief`, surfaced via store/comms by Brain/Integration), and (2) a **Haven-vs-baseline** comparison (families housed, carbon avoided %, waste diverted, time-to-house) as side-by-side bars.
  - **Ownership seam (don't collide with Integration):** the **counterfactual data/logic is Integration's** (their Phase 4 lists the counterfactual panel). You render the overlay and the bars; Integration supplies the baseline numbers (or they're constants: baseline 45,000 kgCO₂e, 100%-to-landfill, slower time). Coordinate before building — claim the *debrief presentation*, not the data model.
  - **⚠ Hard dependency:** this overlay is gated on `world.phase === 'complete'` (or a `'mission:complete'` signal), but **`world.phase` currently never transitions out of `'deploying'`** — there is no transition logic in `World.ts`. Until Sim/Integration implement deploying→active→recovery→complete, build and test the overlay behind a manual/dev trigger and flag the dependency loudly in STATUS. Don't let your end-screen silently never appear.
- **Performance target:** >55fps with everything on. If under, in order: (a) reduce `PARTICLES_PER_CELL`, (b) batch fog texture to every 5 ticks, (c) shadow map 2048→1024, (d) drop SSAO.

### What to build / verify
1. `Hazards.tsx`: confirm fire drifts + blooms; cap at 500; upgrade water if time.
2. `FogOfWar.tsx`: confirm north starts dark and reveals in circles as drones fly; batch updates if needed.
3. `Camera.tsx`: confirm drift + each preset; trigger presets from console to test.
4. Build the debrief overlay (behind a dev trigger until phase transitions land); wire the Haven-vs-baseline bars to Integration's data.
5. Full perf audit (Chrome DevTools → Performance, 10s record). Hit >55fps.
6. Full dress run start→finish; walk the six judge-legibility checks from §0.

### Update block
```
PHASE 5 COMPLETE — VISUAL DONE
Deliverable: fire/fog/water, cinematic camera, debrief overlay (dev-gated if phase still stuck), 55fps+
Performance: [fps on demo machine, all effects on]
Key decisions: [particle cap, fog cadence, water approach, debrief data source]
Open dependencies: [phase-transition status, counterfactual data handoff]
```

---

## Cross-track corrections & current state (read before each phase)

These are deltas between the original card and what's actually in the repo / other tracks. They exist so you don't waste time rebuilding done work or block on a no-op you didn't surface.

- **HDRI 404 is resolved.** `public/hdri/kloofendal_overcast.hdr` now exists (Scene.tsx points at it). Just verify it's a real 2K HDR.
- **Camera, not OrbitControls.** `Scene.tsx` already uses `<Camera />`. The "remove OrbitControls in Phase 5" instruction is obsolete.
- **SSAO is missing** from `PostProcessing.tsx` (only Bloom/ACES/Vignette). Add it in Phase 2 (and it's first to drop for perf).
- **Build-home material tint is the climax fix.** `Buildings.tsx` ignores `materialChoice`; tinting it (Phase 3) is what makes the sustainability win *visible in the world*, reinforcing the carbon meter.
- **Two judge-facing UIs were missing from the original card and from the code:** the **cold-open START state** (Phase 4) and the **debrief / mission-complete overlay** (Phase 5). Both are demanded by Project_Details §10.
- **`world.phase` never transitions** (no logic in `World.ts`) — owned by **Sim/Integration**. Your debrief/end-screen depends on it reaching `'complete'`. Build behind a dev trigger; raise it in STATUS so it gets implemented.
- **Counterfactual panel is Integration's** (their Phase 4). You render the debrief overlay; they own the baseline data. Coordinate the seam.
- **Real scoreboard denominators are /4 families and /2 survivors** (not 5/6 or 6/8). Read them live from `world.score`.
- **No `restoration` agent type** and no `restoration_unit` in the base scenario — the restoration agent is stretch (Project_Details §11.2). Keep its color/handling but don't build UI for it as core.
- **Minor (flag to Brain/Integration):** `startDemoSequence()` narrates "Three survivors located…" but the scenario has 2 survivors — cosmetic, not yours to fix, but worth a one-line note.

---

## Demo camera beat map

`startDemoSequence()` (`src/scenarios/initial.ts`) already scripts the opening; this is the full intended arc (Project_Details §10). Your job is to make each preset frame something worth seeing and to confirm timings with the demo director (Integration).

| Beat (§10) | ~Time | Camera preset | What's on screen |
|---|---|---|---|
| 1 First sight | 0:00 | `wide` | Dusk HDRI gloom, smoke, floodwater, rubble — cold-open card up, then START |
| 2 Deploy & discover | ~0:08 | `rescue` | Drones fan out, fog lifts, survivor/family beacons appear |
| 3 Agents take over | ~0:20–0:35 | `buildsite` | Rescue/salvage/build in parallel; comms log scrolling; first home rises |
| 4 Human command | ~ live | (stay) | Operator types/speaks; units re-route |
| 5 **Recovery (climax)** | ~ mid | `buildsite` → cut to scoreboard | Timber→0, homes flip to recycled tint, carbon meter + % shoot up |
| 6 Resilience | ~ late | `wide` | Pull back over rebuilt homes + restored hillside (stretch visuals) |
| 7 Debrief | end | `debrief` | Mission-complete overlay: AI one-liner + Haven-vs-baseline bars |

(Consider adding a `demo:camera` → `debrief` emit + the overlay trigger at mission end, once phase transitions exist.)

---

## Final verification checklist (run before the demo)

The acceptance test is the six judge-legibility checks in §0. Concretely, before presenting:

1. ☐ Scene reads as a real dusk disaster zone (HDRI + PBR + post all on).
2. ☐ Every robot's state is readable by ring color; you can tell types apart.
3. ☐ Discovered people pulse by urgency; critical throws a beacon.
4. ☐ Homes grow with progress arcs; material tint distinguishes timber vs recycled.
5. ☐ Comms log scrolls agent-tagged decisions, auto-scrolling, correct colors.
6. ☐ On TIMBER SHORTAGE: homes re-tint green-grey **and** carbon meter + scoreboard % jump (with the pulse).
7. ☐ Cold-open shows pre-START; debrief overlay shows at end (or via dev trigger if phase still stuck).
8. ☐ Camera drifts in wide and hits each preset cleanly; no OrbitControls in the final build.
9. ☐ >55fps on the demo machine with all effects; particles capped at 500.
10. ☐ No sim debug UI visible (CLAUDE.md rule); record a clean backup run.

Update `STATUS_visual.md` after each phase and flag the two open cross-track dependencies (phase transitions, counterfactual data) in `TEAM_STATUS.md`.
