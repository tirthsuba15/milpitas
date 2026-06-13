# Haven — Map Overhaul + Integration Plan (2026-06-13)

## Status
- ✅ Merge of `origin/main` + local map work + rich HUD committed (`integration/map-and-merge`).
- ✅ Best-of-both: local rich HUD kept; origin sim phases / counterfactual / debrief / cinematic renderer pulled in.
- ✅ `tsc` green, app renders, 0 console errors. vite pinned to ^5.4.11 (origin's v8 bump breaks plugin-react@4).
- Backups: branch `backup/pre-merge-main`, `origin/main` on remote.

## Shared decisions (ALL agents must follow)
- **Grid:** expand the live sim grid to **100×100 cells @ 5 m = 500 m square**. Center at world (250,250) stays the disaster/work zone (~original 50×50 region); the rest is an existing suburban neighborhood the sim can traverse.
- **Suburb style:** balanced suburb + nature — low-rise homes on a loose street grid, yards, scattered trees/bushes, a few small civic blocks, greenery between houses. Keep noticeable nature. Not tall buildings.
- **The central plot must BLEND**, not stand out as a slab (soft edges, matching ground).
- **Sky:** daytime blue sky (local `WorldEnvironment`), not the foggy/overcast HDRI.
- **Models:** CC0 / CC-BY low-poly from poly.pizza / Quaternius / Kenney. Record every asset in `public/models/manifest.json` (name, category, file, source, license, sizeKB, notes). CC-BY requires attribution note.
- **Coords:** cell (c,r) → world (c*5, r*5) on the XZ plane, y up. Keep this mapping consistent across sim + renderer.
- Each agent: keep `npx tsc --noEmit` green; do NOT git commit (orchestrator integrates); do NOT restart the dev server.

## Waves
1. (parallel) Models fetch · HUD tweaks (clock dropdown + remove dashboard comms) · Grid+sim expansion (+ suburban layout DATA).
2. (after 1) Visual suburban render pass: render houses/roads/fences/props/cars from models on the grid layout; realistic grass; blend the plot; blue-sky polish; ensure the entire 500m map is populated.
3. Orchestrator: integrate, fix errors, verify in browser, commit.
