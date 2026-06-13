# Haven HUD Redesign — "FIELD COMMAND" Design System
*Single source of truth. Every component must obey this. Read fully before writing code.*

We are scrapping the old cyan-glassmorphism HUD and rebuilding it. The old look (glowing
cyan `#00d4ff`, frosted blur cards, Roboto Mono, evenly-distributed neon) is exactly the
generic "AI-generated dashboard" aesthetic. We are replacing it with something deliberately
designed for *this* world.

---

## The concept: a Relief Operations Terminal

Reference language: **real emergency operations centers, glass-cockpit avionics, maritime
ECDIS, humanitarian field equipment, hi-vis safety gear, sodium-vapor emergency lighting.**
Calm, authoritative, engineered, warm. The AI commander is a steady field officer, not a
gamer HUD. The world outside is cold ash and fire; the instrument is warm and human.

**One-line identity:** charcoal-and-bone instrument panels, lit by a single hi-vis sodium
amber, framed with registration ticks, every number in engineered monospace.

---

## ⛔ Anti-AI-slop rules (hard constraints — a reviewer will reject violations)

From research into what makes UIs read as "AI-generated," AVOID:
- ❌ Cyan `#00d4ff` / electric-blue glow. ❌ Purple/indigo accents (the "AI purple problem").
- ❌ Frosted-glassmorphism cards (heavy `backdrop-filter: blur` + translucent dark + white
  hairline). ❌ `border-radius` ≥ 12px / "rounded-xl" everywhere.
- ❌ Inter, Roboto, Arial, system-ui, **Orbitron** (sci-fi cliché), Space Grotesk.
- ❌ Evenly-distributed rainbow of saturated colors all glowing equally.
- ❌ Emoji as structural icons. ❌ Big vague hero copy ("Build the future").
- ❌ Uniform soft drop-shadows on floating cards.

DO instead:
- ✅ Warm near-black charcoal surfaces, near-opaque, **sharp** corners (≤3px) + corner
  registration ticks. ✅ One signature hue (sodium amber) carrying identity; semantic
  green/red/amber used **sparingly** for meaning only.
- ✅ Tabular monospace numerics. ✅ Dense, scannable, real microcopy (coordinates, channel
  IDs, unit counts) — the texture AI-slop omits. ✅ Asymmetry via a left channel spine and
  instrument framing.

---

## Design tokens (use these exact values via CSS variables)

```css
/* Surfaces — warm ember-dark, NOT slate/pure-black */
--bg:            #0C0A08;   /* page void */
--panel:         #15110D;   /* primary instrument surface (use at ~0.93 alpha over 3D) */
--panel-2:       #1E1813;   /* raised inset */
--panel-3:       #2A2118;   /* track / well backgrounds */

/* Hairlines — warm, never pure white */
--line:          rgba(244,196,128,0.14);
--line-strong:   rgba(244,196,128,0.30);

/* Ink — warm bone, never #fff */
--ink:           #F2EBDD;   /* primary text + big numbers */
--ink-dim:       #A89B86;   /* secondary */
--ink-faint:     #6B6253;   /* labels, microcopy, ticks */

/* Signature identity hue — hi-vis sodium amber (the "AI/command/live" color) */
--sig:           #FFB54A;
--sig-deep:      #E08A1E;
--sig-glow:      rgba(255,181,74,0.22);

/* Semantic — used ONLY for meaning, sparingly */
--good:          #54D6A0;   /* sustainability / carbon avoided / housed */
--warn:          #FFC247;   /* low timber / caution */
--crit:          #FF5A4D;   /* shortage / failed / critical urgency */

/* Comms tag hues (HUD-only, keep distinguishable) */
--cmd: #FFB54A;  --rsc: #FF8A5B;  --slv: #C7D45A;  --rbd: #6FC9D6;  --log: #B9A0E0;
```

### Typography (load in index.html)
```
IBM Plex Sans Condensed  — labels, headers, wordmark. UPPERCASE, letter-spacing .08–.14em.
IBM Plex Mono            — ALL numerics, comms, data readouts. tabular-nums.
IBM Plex Sans            — optional running prose (brief/debrief sentences).
```
Google Fonts import:
`family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500`

### Material — the "instrument panel" (replaces glass card)
- Surface: `var(--panel)` at ~0.93 alpha. A *restrained* `backdrop-filter: blur(6px)` is
  allowed purely for legibility over the 3D — but the panel must read as solid metal, not frost.
- Border: `1px solid var(--line)`; corner registration ticks (small L-marks) at the corners.
- A 2px colored **status edge** along the top of each cluster in its accent (sodium for
  command clusters, good/warn/crit where semantic).
- Radius: 3px. Optional 45° chamfer on one corner (`clip-path`) for the console feel.
- Faint scanline/noise texture overlay at very low opacity (≈0.03) for depth. No big glows.
- Shadows: tight + dark (`0 2px 10px rgba(0,0,0,.5)`), never soft floaty.

---

## Layout — the ops console (CSS grid regions)

```
┌────────────────────────────────────────────────────────────────────────┐
│ ▌HAVEN  REC●  MSN-7F   │   02:14  ‹ACTIVE›   │   FLEET 6▲ 2□ 0✕  COND-2 │  ← rail (full width)
├────────────────────────────────────────────────────────────────────────┤
││            ┌─ MISSION STATUS ──────────────────────┐                  ┌─┐│
│s            │  3/4 HOUSED   2/2 RESCUED  +80% CARBON │                  │L││
│p            └───────────────────────────────────────┘                  │E││
│i                    (3D disaster zone behind)                          │D││
│n                                                                       │G││
│e                                                                       │E││
││  ┌─ MISSION COMMS ───────────────┐    ┌─ OPERATOR ─────────────────┐  │R││
││  │ [CMD] assigning rescue…       │    │ ◉ARM  TIMBER 2ND +FAM [_]  │  └─┘│
││  └───────────────────────────────┘    └────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
```

Grid regions (defined in `hud.module.css`):
- `rail`   — top, full width: wordmark + mission id + REC, mission clock + phase, fleet + condition. (was MissionClock)
- `metrics`— upper-center instrument strip: Scoreboard (families dominant).
- `spine`  — thin left vertical channel: tick marks + coordinate microcopy (decorative authenticity).
- `ledger` — right, full height: CarbonMeter (vertical gauge + material inventory).
- `comms`  — bottom-left: CommsLog (radio log).
- `console`— bottom-center: OperatorPanel (radio console).
- overlays — `ColdOpen` (full-screen, pre-START) and `Debrief` (full-screen, phase complete).

`.overlay` root stays `position:absolute; inset:0; pointer-events:none`. Only `console`,
`comms`, and the overlays set `pointer-events:auto`.

---

## Read-only data contract (from `src/types/world.ts`; never mutate)

Read everything via `useWorldStore(s => s.world)` (reactive). Shapes:
- `world.elapsedSeconds:number`, `world.phase: 'deploying'|'active'|'recovery'|'complete'`, `world.tick`
- `world.entities[]` — robots are `e.kind==='robot'` with `.status: 'idle'|'moving'|'working'|'blocked'|'failed'`
- `world.score`: `{ familiesHoused, familiesTotal, vulnerableHousedPct, peopleRescued, peopleTotal, wasteDivertedKg }`
- `world.carbon`: `{ avoidedKgCo2e, spentKgCo2e, baselineKgCo2e(=45000) }`  → `carbonPct = round(avoided/baseline*100)`
- `world.inventory`: `{ importedTimber, salvagedTimber, recycledPanels, ... }` (kg). Timber low < 2000, critical === 0.
- `world.commsLog[]`: `{ tick, agent: 'commander'|'rescue'|'salvage'|'rebuild'|'logistics', message, actionTag? }`
- Store actions: `useWorldStore(s=>s.isRunning)`, `s.setRunning(bool)`; `commander.injectHumanCommand(str)`;
  `bus.emit('chaos:timber_shortage'|'chaos:second_storm'|'chaos:new_families')`.

Scenario reality (for mockups): 4 families + 2 survivors (so X/4 and X/2), 8 robots, baseline 45,000 kgCO₂e.
The **demo climax**: TIMBER SHORTAGE → carbon-avoided % jumps ~+80% → that metric must *pulse*,
the carbon gauge must animate, timber inventory flips to a red "⚠ SHORTAGE" state.

---

## Component specs (each is one file; build to match `docs/ui-mockup.html`)

1. **MissionClock → the top rail.** Full-width. Left: `▌HAVEN` wordmark (Plex Sans Cond 700)
   + `MSN-7F·NORTH` mission id (mono, --ink-faint) + a live `REC ●` dot (pulsing --crit).
   Center: `mm:ss` (mono, large, tabular) + phase chip `‹ACTIVE›` (sodium border). Right:
   fleet `N▲ active / N□ idle / N✕ failed` (active=--good, idle=--ink-dim, failed=--crit) +
   a `COND-n` condition readout. Hairline bottom border, 2px sodium status edge.

2. **Scoreboard → MISSION STATUS strip.** Families housed is the hero number (Plex Mono 600,
   ~40px, --ink). Then Rescued, Carbon Avoided % (--good), Waste Diverted t (--good),
   Vuln-First % (--sig if >70 else --warn). Carbon-% gets a **pulse animation** when it
   increases (glow + scale, ≤400ms, respects reduced-motion). Each stat is an instrument
   readout: tiny uppercase label + big mono value, separated by hairline dividers.

3. **CarbonMeter → the ledger gauge (right column, full height).** Vertical instrument gauge:
   a `--panel-3` well with a fill rising to `avoidedPct%` (`transition: height .6s ease`),
   fill = warm-to-good gradient (`--sig-deep → --good`), tick marks every 25% with labels,
   big % readout. Below: "AVOIDED  X.X tCO₂e" (--good). Divider. Material inventory: timber
   (white→--warn<2t→--crit at 0), salvaged (--good), recycled panels (--sig). At timber===0
   show a `⚠ TIMBER SHORTAGE` block (--crit). Frame with corner ticks.

4. **CommsLog → MISSION COMMS radio log.** Header "MISSION COMMS" + a faint channel id
   (`CH-01 · SECURE`). Last 20 of `commsLog`, each line: agent tag `[CMD]` in its hue
   (monospace, bold) + message (--ink-dim). Auto-scroll to newest. Empty state:
   "— AWAITING DEPLOYMENT —" (--ink-faint). Subtle new-line fade-in. `pointer-events:auto`.

5. **OperatorPanel → radio console.** START is an **armed toggle** (reads `▶ ARM` / `■ STOP`,
   sodium when armed-ready, --crit ring when running). Three chaos controls styled as labeled
   console switches: `TIMBER` (--warn), `2ND STORM` (--crit), `+FAM` (--sig). A command input
   (mono) with a `TRANSMIT ▸` button (sodium). On Enter/Transmit: `commander.injectHumanCommand`
   + `addCommsEntry('commander', '[HUMAN] "…"', 'HUMAN_CMD')`. `pointer-events:auto`.

6. **ColdOpen (NEW, full-screen pre-START).** Shows when `!isRunning && phase==='deploying'`.
   Warm-dark scrim (not pure black). Centered: `▌HAVEN` wordmark big, tagline
   "AI DISASTER RELIEF COMMANDER", one prose line (Plex Sans) of context, a mono system block
   ("FLEET · 8 UNITS STANDBY / GRID · 250×250 m / STATUS · AWAITING OPERATOR"), and a prominent
   `◉ BEGIN MISSION` button that calls `setRunning(true)`. Dismiss = unmount when running.
   Animated reveal (staggered). This is the "room leans in" opening.

7. **Debrief (NEW, full-screen on `phase==='complete'`).** Dev-gated (phase never reaches
   complete yet — accept a `force?:boolean` prop / `?debrief=1` query so it can be tested).
   Full-screen warm scrim. Shows: AI one-line debrief string (from last commander comms or a
   passed string), and **Haven-vs-baseline** horizontal bars: Families Housed, Carbon Avoided %,
   Waste Diverted, Time-to-House — Haven bar in --good, baseline bar in --ink-faint, with
   numeric labels. A `RUN BACKUP` / close affordance. Title "MISSION DEBRIEF".

---

## Acceptance (judge-legibility, in priority order)
1. Reads as a real ops terminal, not an AI dashboard — warm, instrument-framed, no cyan/glass.
2. Families-housed number dominates; you know the mission state in 2 seconds.
3. On TIMBER SHORTAGE: carbon % pulses, gauge animates, timber flips red — the green win is felt.
4. Comms scroll with correctly-colored agent tags, auto-scrolling.
5. Cold-open before START; debrief at end (or via dev trigger).
6. Everything legible over the photoreal 3D; HUD never blocks the scene (pointer-events).
