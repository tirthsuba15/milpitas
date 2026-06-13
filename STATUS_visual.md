# STATUS — Visual / Frontend Lead
*Written by Planning Agent after each phase. Read by Execution Agent at start of each phase.*

## Phases Completed
_(none yet)_

## Key Architectural Decisions
- Framework: React Three Fiber (@react-three/fiber) + Drei + @react-three/postprocessing
- HDRI from Poly Haven (download manually → public/hdri/kloofendal_overcast.hdr)
- PBR textures from Poly Haven (download manually → public/textures/)
- Post pass order: SSAO → Bloom → ACES ToneMapping → Vignette
- Robot bodies: capsule/cylinder primitives initially, swap for GLBs if time allows
- HUD: HTML absolute overlay (not 3D text) — pointerEvents:none except OperatorPanel
- Fog of war: DataTexture updated each tick (alphaMap on overlay plane)
- Particle budget: max 500 particles total across all fire cells

## Files Created / Modified
_(none yet)_

## Asset downloads needed (do in Phase 1)
- HDRI: polyhaven.com → "kloofendal_48d_partly_cloudy" → 2K .hdr → public/hdri/kloofendal_overcast.hdr
- Textures (do in Phase 2): ground_albedo/normal/roughness, rubble_albedo/normal/roughness

## What Phase 2 Execution Agent Should Know
- Phase 1 output: Scene.tsx rendering with HDRI + terrain + OrbitControls, looks atmospheric
- Phase 2 adds PBR textures to terrain and 200-instance rubble mounds, adds post-processing pass
- Bloom intensity 0.9, luminanceThreshold 0.55 — tune these if fire doesn't glow enough
