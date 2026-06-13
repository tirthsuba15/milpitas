# Phase Cards — Visual / Frontend Lead
*Haven Hackathon · 6-hour build · 4 people*

**Your role:** You make Haven look real. The photorealism is the identity — it's what makes the room lean in before the AI makes its first move. But photorealism in a hackathon is a trap: nobody has time to hand-model assets or write shaders. The strategy is: HDRI lighting + PBR materials + post-processing pass + ready-made assets. These three levers do 95% of the visual work. Your job is to know exactly which buttons to press and in what order.

**Second job, equally important:** Keep the AI's actions legible on top of the beauty. A gorgeous scene where you can't see what the robots are doing is a failure. State-colored glow rings, pulsing urgency markers, progress rings on build sites — these are non-negotiable overlays.

**Your north star:** A judge who knows nothing about Three.js should look at the screen and immediately understand: there's a disaster, there are robots, and those robots are doing things that matter.

---

## Phase 1 — R3F Scaffold + HDRI Environment + Basic Terrain
**Time budget:** 0:00–0:45 (45 minutes)
**Starts when:** Integration lead confirms `npm run dev` works

### Deliverable
The browser shows a 3D scene: a dark, scorched terrain plane (250m × 250m), lit by a real HDRI environment map that makes it look atmospheric and cinematic. Camera can be orbited with mouse. The scene has dramatic lighting — the HDRI should immediately read as a disaster zone (overcast sky, smoke-filtered light). `npm run dev` serves this at localhost:3000 with no console errors.

### Key decisions
- **Canvas settings:** `shadows={true}`, `gl={{ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }}`, `camera={{ fov: 55, near: 0.5, far: 2000 }}`, `dpr={[1, 1.5]}` (cap pixel ratio for performance).
- **HDRI:** Download "kloofendal_48d_partly_cloudy" 2K .hdr from polyhaven.com. Save to `public/hdri/kloofendal_overcast.hdr`. Use `<Environment files="/hdri/kloofendal_overcast.hdr" background backgroundBlurriness={0.05} />`. This single choice is the biggest jump toward "photoreal."
- **Directional light:** One directional light at `position={[80, 120, -60]}`, `intensity={1.4}`, `castShadow` with `shadow-mapSize={[2048, 2048]}`. This gives crisp directional shadows.
- **Terrain:** A `<Plane args={[250, 250, 128, 128]}>` rotated flat. Dark scorched earth color `#3d2b1f`. 128×128 segments for future displacement mapping.

### Dependencies
- Integration lead's Vite+React+TS scaffold + packages installed (`@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`)

### What to build
1. Download the HDRI **first** (polyhaven.com, search "kloofendal partly cloudy", download 2K .hdr). Without it, the scene has no environment light and looks flat.
2. Read `src/renderer/Scene.tsx` — it may already be scaffolded. Verify it has the Canvas with correct settings, Environment, directional light, Terrain, and OrbitControls (temporary, will be replaced by Camera.tsx).
3. In `src/renderer/Terrain.tsx`, verify the ground plane exists with the dark material.
4. Run `npm run dev` and open localhost:3000. The scene should look dark, moody, atmospheric — like a disaster zone at dusk. If it looks flat/bright, the HDRI isn't loading (check browser console for 404 on the .hdr file path).
5. Verify shadow works: add a test box above the terrain, confirm it casts a shadow. Remove after confirming.

### Context hint
You are building the visual layer for Haven, an AI disaster relief simulator in the browser. The project runs React Three Fiber (R3F) — a React wrapper over Three.js. `src/renderer/Scene.tsx` is the root canvas. The most important asset you need RIGHT NOW is the HDRI file — download it from polyhaven.com before doing anything else. Search "kloofendal 48d partly cloudy", download the 2K .HDR format, and put it in `public/hdri/kloofendal_overcast.hdr`. The `<Environment files="...">` component from `@react-three/drei` handles loading and applying it as the scene's ambient light source. Once that's working, the ground plane with a dark PBR material should immediately look 10x more real than with fake lights. OrbitControls is temporary — it lets you verify the scene from any angle. The Camera.tsx component (cinematic drift + presets) will replace it later.

### Update block
```
PHASE 1 COMPLETE
Deliverable: Scene renders with HDRI, dramatic terrain visible, OrbitControls working
HDRI file: [confirm path and which HDRI you used]
Key decisions: [any settings adjustments]
Blockers: [anything blocking Phase 2]
Phase 2 needs: working scene with HDRI confirmed
```

---

## Phase 2 — PBR Materials + Rubble Geometry + Post-Processing Pipeline
**Time budget:** 0:45–1:45 (60 minutes)

### Deliverable
The terrain has a physically-based material with real PBR textures (albedo, normal, roughness — from Poly Haven). 200 rubble instances are scattered across the site using `InstancedMesh`. The post-processing pipeline is active: Bloom makes emissive materials glow, SSAO grounds objects with soft ambient shadows, ACES tone mapping produces cinematic color, and a vignette focuses the eye. The scene now reads as genuinely photoreal — judges see a disaster zone, not a 3D demo.

### Key decisions
- **Textures to download (do this first, parallel with building):** Go to polyhaven.com. Download "Aerial Rocks" (or "Gravel Stones") PBR set, 1K resolution, as JPG: `ground_albedo.jpg`, `ground_normal.jpg`, `ground_roughness.jpg`, `ground_ao.jpg`. Also download "Cracked Mud" for flood areas. Put all in `public/textures/`.
- **Texture repeat:** `repeat(6, 6)` with `wrapS = wrapT = RepeatWrapping` on all maps. This tiles the texture across the 250m terrain so it doesn't look stretched.
- **Rubble InstancedMesh:** 200 instances of `BoxGeometry(3, 1, 2)` with random scale (0.5–2.5×), random rotation (y-axis), scattered across a grid with some clustering around the hazard zone. Use `mesh.setMatrixAt(i, matrix)` in a loop.
- **Post-processing order:** SSAO → Bloom → ToneMapping(ACES) → Vignette. Read `src/renderer/PostProcessing.tsx` — it may already be complete.
- **Bloom settings:** `luminanceThreshold: 0.55`, `intensity: 0.9`, `mipmapBlur: true`. These values make fire particles and emissive markers glow without over-blooming the terrain.

### Dependencies
- Phase 1 scene working with HDRI

### What to build
1. Download PBR textures from polyhaven.com **immediately** (takes a few minutes). Put in `public/textures/`.
2. Update `src/renderer/Terrain.tsx` `GroundPlane()`: load textures with `useTexture([...paths])`, apply with `RepeatWrapping` and `repeat(6,6)`. Apply to `meshStandardMaterial` as `map`, `normalMap`, `roughnessMap`, `aoMap`.
3. Update `Terrain.tsx` `RubbleMounds()`: replace the 10-position array with a proper `InstancedMesh`. Create `new THREE.InstancedMesh(geometry, material, 200)`. Use a loop to place 200 instances with `dummy.position.set(...)`, `dummy.rotation.y = random`, `dummy.scale.setScalar(0.5 + random * 2)`, `dummy.updateMatrix()`, `mesh.setMatrixAt(i, dummy.matrix)`. Call `mesh.instanceMatrix.needsUpdate = true`.
4. Read `src/renderer/PostProcessing.tsx` — verify it has `EffectComposer` with SSAO, Bloom, ToneMapping(ACES_FILMIC), Vignette. Enable it in Scene.tsx. If the scene looks too dark after enabling, reduce SSAO intensity (try `intensity: 8` instead of 14) or vignette darkness.
5. Check performance: should be >60fps with 200 rubble instances and post-processing. If not, reduce rubble count or shadow map size.

### Context hint
The scene loads with HDRI and looks atmospheric. Now add the textures and post-processing that turn "3D demo" into "this looks real." The most impactful additions in order: (1) PBR ground texture with normal map (adds micro-detail and depth), (2) SSAO (every object now sits IN the scene rather than floating on it), (3) Bloom (fire and markers will glow). For the rubble: THREE.InstancedMesh is the key — 200 separately-positioned mesh instances cost almost nothing because they share geometry and material, but they fill the scene with visual complexity. The matrix math: create a dummy `THREE.Object3D`, set its position/rotation/scale, call `dummy.updateMatrix()`, then `instancedMesh.setMatrixAt(i, dummy.matrix)`. After setting all 200, call `instancedMesh.instanceMatrix.needsUpdate = true`. Store the mesh in a `useRef` and call this setup in a `useEffect(() => {...}, [])`.

### Update block
```
PHASE 2 COMPLETE
Deliverable: PBR textures on terrain, 200 rubble instances, post-processing active
Key decisions: [texture files used, rubble count, bloom settings]
Blockers: [anything blocking Phase 3]
Phase 3 needs: confirmed post-processing pipeline active
```

---

## Phase 3 — Robot Fleet + State Markers + Person Beacons + Build Site Progress
**Time budget:** 1:45–3:00 (75 minutes)

### Deliverable
Every `RobotEntity` in the world store renders as a 3D mesh at its current position. Each robot has a glowing status ring on the ground (blue=idle, cyan=moving, green=working, amber=blocked, red=failed). Every discovered `PersonEntity` renders as a pulsing sphere in urgency color (white/amber/red). Build sites show a progress arc that sweeps around as modules are completed. The entire fleet visibly moves and changes state as the AI issues commands.

### Key decisions
- **Robot models:** Start with primitives — drones get a flat `CylinderGeometry(0.8, 0.8, 0.3, 8)`, ground units get a `CapsuleGeometry(0.4, 1.2, 4, 8)`. Each type gets a distinct `MeshStandardMaterial` color (see `ROBOT_COLORS` in `RobotFleet.tsx`). If time allows, swap in GLB models from Quaternius.
- **Glow ring:** A `RingGeometry(0.9, 1.3, 32)` with `MeshBasicMaterial(transparent)` placed just below the robot on the ground plane. The glow is amplified by the Bloom post-processing pass (emissive or bright color → bloom). Use `ring.material.opacity = 0.5 + sin(time) × 0.3` for pulse when working.
- **Person beacon:** A `SphereGeometry(0.6)` with `emissive` matching urgency color. `emissiveIntensity: 0.8` makes it bloom. Scale pulse: `1 + sin(time × pulserate) × 0.15` — faster pulse for more urgent.
- **Build site progress arc:** `TorusGeometry(5, 0.3, 8, 64, Math.PI × 2 × progress)` — the last argument is the arc angle, so it sweeps as progress increases. Blue color, bloom it.
- **Subscribe to store changes:** `useWorldStore(s => s.world)` is already reactive — any tick update causes these components to re-render automatically.

### Dependencies
- Integration lead's worldStore wired to the sim (entities should be updating position each tick)
- Phases 1 and 2 scene working

### What to build
1. Read `src/renderer/RobotFleet.tsx` — it may be scaffolded. Verify each robot renders with correct primitive and glow ring. Test: after starting the sim, do robots appear at their initial positions?
2. Verify robot positions update as the sim ticks. If robots are frozen, the store isn't being updated — check with Integration lead.
3. Read `src/renderer/Markers.tsx` — verify `PersonMarker` renders with urgency-based color and pulse. Test: after drones explore, do discovered people appear as colored spheres?
4. Read `src/renderer/Buildings.tsx` — verify `BuildSiteMesh` shows a building box that grows with `modulesComplete/modulesRequired`. Test: manually set a site to `modulesComplete: 2` in the initial state and verify the building is half-height.
5. Performance check: with 8 robots + 6 people + 3 build sites + post-processing, what's the framerate? Should be >55fps. If not, reduce robot geometry segments (8→4 on capsule).

### Context hint
The scene looks beautiful and the post-processing is active. Now populate it with actors. `src/store/worldStore.ts` exports `useWorldStore(s => s.world)` — this is a reactive Zustand selector that re-renders any component subscribed to it when the world changes. Every component reads the world from this store, not from props. `src/renderer/RobotFleet.tsx` iterates `world.entities.filter(e => e.kind === 'robot')` and renders each one at `entity.position`. The position updates every 33ms as the sim ticks, so robots should visibly move (if the sim+wiring is working). The glow ring is the most important visual element — without it, you can't tell what state each robot is in. The Bloom pass makes emissive materials (emissive color set, emissiveIntensity > 0.4) glow, so you can make the ring genuinely luminous without expensive shaders.

### Update block
```
PHASE 3 COMPLETE
Deliverable: Robots moving with state rings, people pulsing, buildings growing
Key decisions: [primitive choices, any model swaps]
Blockers: [anything blocking Phase 4]
Phase 4 needs: confirmed actors visible and animated
```

---

## Phase 4 — HUD Overlay (Scoreboard, Carbon Meter, Comms Log)
**Time budget:** 3:00–4:15 (75 minutes)

### Deliverable
A glassmorphism HUD overlays the 3D scene. Top center: large families-housed counter (`5/6 families`). Right panel: vertical carbon meter with live %-avoided bar and material inventory breakdown. Bottom right: scrolling comms log with colored agent tags. Top left: mission clock + fleet status. Bottom center: operator panel with chaos buttons and command input. The HUD updates reactively and the carbon meter visibly drops when recycled panels are allocated.

### Key decisions
- **HTML overlay, not 3D UI:** The HUD is a `position: absolute; inset: 0; pointer-events: none` div on top of the Canvas. Individual panels have `pointer-events: auto` only where clicks are needed (OperatorPanel). This is vastly simpler than 3D text sprites and easier to style.
- **Glassmorphism style:** `background: rgba(0,0,0,0.62); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px`. Apply this `.glass` class to every panel.
- **Color palette:** Cyan `#00d4ff` for primary numbers, amber `#ffaa00` for warnings, green `#44ff88` for positive sustainability numbers, red `#ff4444` for critical. Dark background ensures readability over the 3D scene.
- **Carbon meter:** Vertical bar that grows upward as carbon is avoided. Bottom = 0% avoided (baseline), grows toward top. Use CSS `height: ${avoidedPct}%` with `transition: height 0.6s ease`. When timber runs out and recycled panels are used, this should visibly shoot up.
- **Comms log:** Fixed height (`max-height: 200px`), overflow-y: auto. Each entry: `[TAG] message` where TAG is colored by agent (CMD=cyan, RSC=orange, SLV=lime, RBD=sky, LOG=purple).

### Dependencies
- worldStore being updated by sim (need live data to display)
- `src/hud/hud.module.css` with glassmorphism base styles

### What to build
1. Read `src/hud/HUD.tsx` — verify it imports and renders all sub-components in the correct grid layout.
2. Read `src/hud/Scoreboard.tsx` — verify it reads `world.score` and displays families housed as the big number. Add `world.carbon.avoidedKgCo2e` as a secondary number.
3. Read `src/hud/CarbonMeter.tsx` — verify the vertical bar works with `height: ${avoidedPct}%`. The material inventory section should show amber when `importedTimber < 2000` and red when 0 with a "⚠ TIMBER SHORTAGE" warning box.
4. Read `src/hud/CommsLog.tsx` — verify it reads the last 20 entries from `world.commsLog` and renders with colored agent tags. Add auto-scroll to bottom.
5. Read `src/hud/MissionClock.tsx` and `OperatorPanel.tsx` — verify they work.
6. Style pass: open the browser, look at the full HUD. Adjust font sizes, padding, colors until it looks sharp and legible over the 3D scene. The `families housed` number should be the dominant element.

### Context hint
The 3D scene is complete. Now the HUD. All HUD components are in `src/hud/`. They read from `useWorldStore(s => s.world)` — the same Zustand store the renderer reads. The HUD is HTML positioned absolutely over the Canvas (`position: absolute; inset: 0; pointer-events: none` on the root div). Individual interactive elements (OperatorPanel) need `pointer-events: auto`. The CSS is in `src/hud/hud.module.css` — check `.glass` for the panel style and the color variables. The CarbonMeter is the most critical element to get right visually: when the timber shortage hits and the AI switches to recycled panels, this bar should visibly animate. Make sure the `transition: height 0.6s ease` is on the bar element. The comms log needs auto-scroll — use `useEffect` to scroll to a `ref` at the bottom whenever `entries.length` changes.

### Update block
```
PHASE 4 COMPLETE
Deliverable: Full HUD working — scoreboard, carbon meter, comms log all live
Key decisions: [any layout or style adjustments]
Blockers: [anything blocking Phase 5]
Phase 5 needs: HUD confirmed visible and reactive, carbon meter animates
```

---

## Phase 5 — Fire/Smoke/Flood Particles + Fog of War + Cinematic Camera + Performance
**Time budget:** 4:15–6:00 (105 minutes)

### Deliverable
Fire cells render as upward-drifting orange particles amplified by Bloom — looks like real fire without a combustion simulation. Flood areas have a reflective water plane. The fog of war renders as a dark overlay that dissolves cell-by-cell as drones explore (using a DataTexture updated each tick). The cinematic camera does a slow ambient drift in the wide shot and switches to hero angles for key demo beats. The scene runs at >55fps on the demo machine with all effects active.

### Key decisions
- **Fire particles:** `THREE.Points` with a `BufferGeometry` where each fire cell gets 6 particles. Each tick: advance y position by +0.04, reset to 0 when y > 6. Color: orange-red gradient (`col[i]=1, col[i+1]=0.3+rand*0.3, col[i+2]=0`). The Bloom pass makes them glow. Max 500 particles total — cap `PARTICLES_PER_CELL` accordingly based on how many cells are on fire.
- **Water:** A `MeshStandardMaterial` plane with `roughness: 0.05, metalness: 0.1, color: '#1a4a6e', transparent, opacity: 0.65`. For maximum impact, animate `normalMap.offset.x += 0.001` each frame for ripple (if a normal map is loaded). The reflection from the HDRI environment will make it shimmer realistically.
- **Fog of war DataTexture:** `new THREE.DataTexture(Uint8Array, gridW, gridH, THREE.RGBAFormat)`. Each tick: loop the fog array, set `data[i*4+3] = grid[gy][gx].isRevealed ? 0 : 200`. Call `texture.needsUpdate = true`. Apply as `alphaMap` on a plane above the terrain. Update only every 3 ticks (not every tick) for performance.
- **Camera drift:** In `Camera.tsx`, use `useFrame` to slowly vary camera X position with `Math.sin(time * 0.06) * 12`. Lerp camera to target at `delta * 1.2` speed. `bus.on('demo:camera', preset)` switches the lerp target.
- **Performance target:** >55fps on demo machine with everything on. Likely culprits if under: SSAO (reduce radius and samples), fog texture update frequency (batch to every 5 ticks), particle count (reduce to 3/cell).

### Dependencies
- All previous phases working
- Integration lead's chaos events working (second storm = new fire cells → particle system should expand)
- Camera preset events from `bus.emit('demo:camera', { preset })`

### What to build
1. Read `src/renderer/Hazards.tsx` — verify `FireParticles` uses `useFrame` to advance y positions. Test: start the sim, fire should appear as upward-drifting orange points with bloom glow.
2. Update `FloodPlanes` in `Hazards.tsx`: if you have a water normal map texture (download "Water Normal" from polyhaven.com), apply it with UV animation. Without it, the colored transparent plane still works.
3. Read `src/renderer/FogOfWar.tsx` — verify the `DataTexture` approach. Test: at start, the entire north should be dark. As drones fly north, it should reveal in circles.
4. Read `src/renderer/Camera.tsx` — verify the drift and lerp work. Test: emit `bus.emit('demo:camera', { preset: 'buildsite' })` from the console, camera should smoothly move to a closer angle on the build sites.
5. Remove `OrbitControls` from `Scene.tsx` — replace with `<Camera />` for the final demo.
6. Performance audit: open Chrome DevTools → Performance tab → Record 10 seconds → check for consistent 60fps. If frames are dropping: (a) reduce `PARTICLES_PER_CELL` in Hazards.tsx, (b) batch fog texture updates to every 5 ticks, (c) reduce shadow map size to 1024.
7. Final look: full demo from start to finish. Check every visual beat: dusk lighting, fire glow, drone-reveal, robots moving, building rising, carbon meter, comms log, camera moves.

### Context hint
All the features exist. Phase 5 is about the particles, fog, camera, and performance. The fire particles are in `src/renderer/Hazards.tsx` — they need `useFrame` to animate. The key: the particles array is pre-allocated (computed once from fire cells using `useMemo`), but the positions are mutated in `useFrame` (y position advances each frame). This is a rare case where mutation is correct — you don't want to re-create the particle geometry each frame. The fog of war DataTexture is updated in `src/renderer/FogOfWar.tsx` using a `useEffect` on `world.tick` — it reads the current revealed state from the grid and updates the texture. Camera.tsx adds the professional polish: a gentle ambient drift makes the scene feel alive even when nothing else is moving, and the preset angles give the presenter control over what the judges are looking at during key moments. Remove OrbitControls and verify the camera feels cinematic, not chaotic.

### Update block
```
PHASE 5 COMPLETE — VISUAL DONE
Deliverable: Fire particles, fog of war, cinematic camera, 60fps confirmed
Performance: [fps on demo machine with all effects]
Key decisions: [particle count, fog update frequency, camera settings]
Notes for demo: [any camera preset timings the demo director should know]
```
