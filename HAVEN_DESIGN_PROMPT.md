# Design Prompt — Haven Operator Interface (for Claude Design)

You are Claude Design. Your job is to produce the **high-fidelity visual mockups of Haven's operator interface** — the real-time heads-up display and overlays that sit on top of a live, photorealistic 3D disaster-relief simulation. This is the visible identity of the product during a 3–4 minute live demo to hackathon judges.

**Before anything else, read `docs/UI_REDESIGN_BRIEF.md` in this repo. That file is the locked design system ("FIELD COMMAND") — exact color tokens, typefaces, layout regions, and component specs. You are not inventing a new identity; you are realizing that one at high fidelity and filling the gap it points to.** The brief points to a first-pass realization, `docs/ui-mockup.html` (it **already exists** — a static HTML/CSS mockup of the FIELD COMMAND system). **Open it and treat it as your starting point**, not a blank page: your task is to elevate it to high fidelity, add the states and overlays it is missing (cold-open, debrief, and the climax variant), and harden its legibility over the 3D scene. Note in your delta anything in that mockup that is stale or off-brief. Deliver your result as an extension of that same HTML/CSS mockup file so it stays the team's single rendered artifact. If anything in *this* prompt ever conflicts with `docs/UI_REDESIGN_BRIEF.md`, the brief wins; flag the conflict rather than silently diverging.

Read this whole prompt before you produce anything. The list of AI-generated-design tells in §6 is a hard rubric, not a suggestion — and it already agrees with the brief's anti-slop rules.

---

## 1. What you are designing (and what you are NOT)

**Haven** is an AI commander that runs a fleet of autonomous robots through the aftermath of a climate disaster — rescuing survivors, salvaging debris, and rebuilding low-carbon homes — and adapts live when things go wrong. A photorealistic 3D scene (wildfire + flood at dusk) fills the entire screen; an AI narrates its decisions; a human operator can issue commands and throw chaos at it.

**You are designing the interface layer that floats over that 3D scene** — the mission-control HUD, the operator console, the cold-open, and the after-action debrief. Think *instrument layer over a living world.*

**This is NOT a website, landing page, marketing page, or SaaS dashboard.** No hero section, navbar, feature grid, testimonials, pricing, or footer. There is no scrolling. There is one full-bleed screen (16:9, shown on a projector) that updates in real time. If your output could be mistaken for a startup homepage, you have failed the brief.

The 3D world is the stage and the subject. Your interface is the **legible nervous system on top of it** — it must never steal focus from the action in the scene, and it must never hide what the robots are doing.

---

## 2. Who it's for, and the one job it must do

**Audience:** hackathon judges who may know nothing about 3D graphics or AI, watching on a projector from across a room, for ~4 minutes — plus the operator (presenter) who interacts live.

**The north star — the single success test:** *A judge who knows nothing about the tech looks at the screen and immediately understands: there's a disaster, there are robots, and those robots are doing things that matter.* Every decision serves that legibility. Beauty that reduces legibility is a regression.

**The six things a judge must read at a glance** (acceptance checklist):
1. There's a disaster (the scene carries this — your job is to not bury it).
2. There are robots, and you can tell what state each one is in.
3. You can tell who needs help and how urgently.
4. Homes are going up, and you can see progress.
5. The AI is thinking out loud (a live decision feed).
6. The green choice is winning — and you can *watch* it happen at the climax.

**The demo climax (design the emotional peak around this):** mid-mission, timber runs out. The AI switches the remaining homes to recycled/salvaged material. The carbon-avoided metric jumps (~+80% of baseline), the carbon gauge animates, and the timber stock flips to a hard shortage state. A disruption becomes a sustainability win, live, on screen. This single moment is the most important thing the interface ever shows — choreograph it as one unified beat: as timber → 0, the carbon % glows and counts up, the gauge animates upward, and the timber block flips to its red shortage state, landing together in roughly half a second and settling legibly. Not a silent number tick.

---

## 3. The surfaces to design

Design every surface the brief defines, in its real states. Numbers and fields below are the *actual* data the interface binds to — populate your mockups with these, never lorem-ipsum.

**Live scenario (real counts — use verbatim):** 4 displaced families (sizes 4/5/3/2 members; vulnerability high/high/medium/low) + 2 individual survivors → readouts are **X/4 families** and **X/2 rescued**; 8 robots (2 recon drones, 2 rescue units, 1 medic, 1 sorting robot, 1 hauler, 1 builder); 3 build sites (4 modules each); 6 debris piles; carbon baseline **45,000 kgCO₂e**. Families/survivors start hidden under fog, discovered as drones explore.

The surfaces (these map 1:1 to the brief's component specs — match them):
1. **Top rail** — wordmark + mission id + live REC dot; mission clock `MM:SS` + phase chip; fleet active/idle/failed + condition readout. Full width.
2. **Mission-status strip (scoreboard)** — the dominant readout. Hero number: **families housed / 4**. Then rescued / 2, **carbon avoided %** (climax metric — designed pulse on increase), waste diverted (t), vulnerable-housed %.
3. **Carbon ledger gauge** (right column, full height) — vertical avoided-vs-baseline gauge that animates upward, tick marks, big % readout, then material stock (imported timber, salvaged timber, recycled panels) with the timber-shortage state.
4. **Mission comms feed** — live radio log of AI decisions, each tagged by agent (Commander / Rescue / Salvage / Rebuild / Logistics) with a one-line dispatch message; newest at bottom, auto-scroll. Design it as a **fixed-height scrollable region** (reserve ~10 visible lines): new entries push older ones up *within that box* and never reflow the panels around it. Entries arrive roughly every 3s with crisis bursts, so the region must look right both sparse and full.
5. **Operator console** — an armed START/STOP toggle, three "break-glass" chaos switches (Timber Shortage, Second Storm, +Families), and a free-text command transmit field. The only heavily-interactive region — design every control state: START/STOP (disarmed / armed-ready / armed-running), the three chaos switches (default / hover / active), and the command field (default / focus / typing).
6. **In-world legibility overlays** (live in the 3D scene; you own their visual language so it's consistent with the HUD): state-colored glow ring under each robot; pulsing urgency beacon over each discovered person; progress arc + rising volume on each build site; and the **material color of each home** so the climax switch is visible in the world, not only on the meter. They must read against a gritty, moving, smoky background.
7. **Cold-open (pre-START)** — what's on screen before START: the room should lean in. Wordmark, a one-line mission statement, a small mono system block (fleet standby / grid / status), and an unmistakable BEGIN affordance. Hides the all-zeros readouts until there's something to show.
8. **After-action debrief (mission-complete)** — the closing beat: the AI's one-sentence result (housed-vulnerable-first + carbon cut + waste diverted, with real numbers) and a **Haven vs. conventional-baseline** comparison as side-by-side bars (families housed, carbon, waste, time-to-house). Lands the dual win in five seconds.

For each surface, show **default**, **active/live**, **climax** (where relevant), and **empty/loading** states.

---

## 4. Art direction — realize FIELD COMMAND, don't reinvent it

The identity is already chosen in `docs/UI_REDESIGN_BRIEF.md`. Your craft goes into executing it at a level that reads as authored, not generated. Treat these as **locked** (pull exact values from the brief):

- **Concept:** a *Relief Operations Terminal* — calm, authoritative, engineered, warm. References: real emergency-operations centers, glass-cockpit avionics, maritime ECDIS, humanitarian field equipment, hi-vis safety gear, sodium-vapor emergency lighting. The instrument is the steady field officer; the world outside is cold ash and fire.
- **Color (locked tokens):** warm ember-dark surfaces (charcoal/`#15110D`-class panels at ~0.93 alpha over the 3D), warm bone ink (never pure white), a single signature **hi-vis sodium amber** (`#FFB54A`) carrying identity, and semantic **good/warn/crit** (`#54D6A0` / `#FFC247` / `#FF5A4D`) used **only for meaning, sparingly**. Comms-tag hues per the brief. **No cyan. No purple/indigo/violet. Anywhere.**
- **Type (locked):** IBM Plex Sans Condensed for labels/headers (uppercase, tracked); IBM Plex Mono for all numerics/comms/data (tabular figures, mandatory); IBM Plex Sans for any running prose. The families-housed number is large and dominant.
- **Material:** instrument panels, not glass cards — near-opaque warm charcoal, **sharp corners (≤3px)** with corner registration ticks, a 2px colored status edge per cluster, tight dark shadows (never soft floaty). **Blur is forbidden on the panels themselves** (that is the glassmorphism tell) — panels are opaque (≥0.93 alpha) and read as solid metal; you may blur the 3D *behind* a panel only if a bright fire would otherwise bleed through. A faint scanline/noise is allowed only on the data-display regions (numerics, comms) at ≤0.02 opacity — never as a full-screen decorative pass.
- **Layout:** the ops console grid — top `rail`, upper-center `metrics`, thin left `spine` of tick-marks + coordinate microcopy (decorative authenticity), right `ledger`, bottom-left `comms`, bottom-center `console`, plus full-screen `cold-open` and `debrief`. Asymmetric; center of frame kept clear for the action.

**Where your creativity goes (this is what separates authored from generated):** composition and visual hierarchy within the locked system; the climax choreography (the carbon pulse + gauge animation + shortage flip as one felt moment); instrument detailing (ticks, status edges, dividers, the spine's coordinate texture); state design (hover/active/focus/armed/empty/loading); the density and realism of microcopy; and making every element survive over a bright fire as well as over dark smoke. Within the locked IBM Plex stack, vary weight by role (data < label < section header) — never set everything to one weight. Bring a point of view. A safe, average result is the failure mode — **but creativity lives here, in composition / hierarchy / choreography / microcopy / state design, not in color, type, or structure (those are locked) and never by bending the §6 rubric, which is non-negotiable.**

---

## 5. Functional color semantics (fixed — design around these)

Wired to the simulation; must stay legible and consistent between the in-world overlays and the HUD. Hues come from the brief; the **roles are fixed**, and — critically — **never encode state by color alone** (a colorblind judge must read it via shape, label, position, or motion too):

- **Robot state:** idle / moving / working / blocked / failed → calm-to-alarm ramp; failed unmistakable.
- **Person urgency:** calm / elevated / critical → critical throws a vertical beacon so it pops out of the scene.
- **Build site:** planned / active / complete → plus the **material identity** of the home (timber vs. salvaged vs. recycled), since the climax is a material switch.
- **Comms agents:** Commander / Rescue / Salvage / Rebuild / Logistics → distinct, consistent tag color + a two-letter call-sign (CMD / RSC / SLV / RBD / LOG) so the feed is scannable.

Color is one channel; always pair it with a second.

---

## 6. AI-generated-design tells to AVOID (hard rubric — reinforces the brief)

These are the specific signatures that make a design read as machine-generated. Avoid every one; the intended alternative follows. (Sources at the end; the brief's own anti-slop list agrees and takes precedence on specifics.)

**Forbidden outright:**
- **Blue-purple / indigo / violet gradients** of any kind — the single most recognizable AI tell, a self-reinforcing training-data artifact. None, anywhere. (Also no cyan `#00d4ff` electric glow — the old Haven look the team is explicitly scrapping.)
- **Inter / Roboto / Arial / system-ui** as a primary face — and **no Orbitron or Space Grotesk** (sci-fi / over-used tells). Use the locked IBM Plex stack.
- **Unmodified Feather / Material / Lucide / Heroicons** icon sets, and **emoji as structural icons** → use a small consistent geometric glyph system + two-letter call-signs.
- **Generic SaaS landing-page structure** (hero + vague big headline like "Build the future" + three feature cards + CTA). Wrong medium entirely.
- **"Overly perfect" decorative gradients with no character**; gradient-as-background-decoration.

**Avoid (and do the opposite):**
- **Uniform border radius everywhere** (the tell: everything at ~12–16px / "rounded-xl") → sharp ≤3px corners with a deliberate hierarchy by role.
- **Frosted-glassmorphism cards** (heavy backdrop-blur + translucent dark + white hairline) → the near-opaque warm instrument panel.
- **Generic soft drop-shadows on floating cards** → tight, dark, engineered shadows + hairline borders + a defined elevation order.
- **Mathematically even, emotionally cold spacing** and a plain three-column grid → intentional asymmetry, instrument clustering, the left spine, purposeful whitespace.
- **Every block the same rounded card** → differentiated instruments with distinct weight and density.
- **An evenly-distributed rainbow of saturated colors all glowing equally** → one signature hue (sodium amber) for identity; saturated semantic colors reserved for meaning.
- **Zero micro-interactions / soulless feel** → purpose-driven motion (a ~150 / ~250 / ~350 ms tier with one signature easing); designed hover/active/focus/empty/loading/success states; the climax beat.
- **Color tokens named `primary`/`secondary`** with no meaning → semantic token names (the brief already uses `--sig`, `--good`, `--crit`, `--panel`, etc.).
- **Robotic, interchangeable copy** ("Error: invalid input", "Welcome to our platform") → the radio-dispatch voice in §7; copy that could only belong to *this* mission.
- **Centered, symmetric, everything-same-size** composition → clear hierarchy with one dominant element (families housed) and a framed-viewport layout.
- **Sci-fi-movie HUD cliché** (cold neon holograms, reticles-for-show) → real instrument legibility; every element functional; glow only where it is a true signal tied to the scene's bloom.
- **Trendy stock photography or unmodified illustration packs** (the Unsplash/Pexels/abstract-blob look) → all imagery is the 3D scene itself or engineered instrument detail; no decorative photos.
- **A centered, enlarged wordmark used as a hero focal point** → the wordmark anchors the top rail, small; it never becomes the center of the frame.
- **Uniform font weight across all sections** (everything one weight) → weight varies by role within the IBM Plex stack.

The deeper rule: **statistical-average choices read as AI; intentional, defensible, world-specific choices read as authored.** When a choice feels "safe," interrogate it. The texture AI-slop omits — coordinates, channel IDs, unit counts, registration ticks, dispatch shorthand — is exactly what sells this as a real terminal; include it densely.

---

## 7. Voice & microcopy

All text in a **terse radio-dispatch / incident-command register**: present tense, call-signs, specific numbers, no marketing adjectives. Right register: *"Deploying recon. Mapping zone."* · *"Three families located, NW fire line. Urgency critical."* · *"Timber exhausted — switching Site 2 to recycled panels, schedule holds, carbon down 60%."*

- **Cold-open:** one confident line that sets the stakes (housing displaced families after a climate disaster, fastest and greenest) + a clear BEGIN. A mission statement, not a tagline.
- **Debrief:** factual after-action — one dual-axis sentence with real numbers, then the Haven-vs-baseline bars.
- **Empty / loading / pre-deployment:** quiet character, in voice (e.g. *"— AWAITING DEPLOYMENT —"*). Never a robotic error string.
- Labels short, uppercase, tracked; data monospace and tabular.

---

## 8. Hard constraints (the design must survive these)

- **Overlays a busy, moving, smoky 3D scene.** Guarantee legibility with near-opaque scrims and safe margins; never occlude the center of the frame where rescues, builds, and the climax happen. Test panels mentally against both dark smoke and a bright orange fire behind them.
- **Updates in real time without jitter.** Reserve space; tabular numbers; nothing reflows or jumps when a value changes or a comms line is added. Rock-steady layout, alive data.
- **Reads on a projector from across a room.** Minimum legible sizes; high contrast (≥4.5:1, more over the scene); the families-housed number readable at distance.
- **Accessibility:** contrast targets met; state never conveyed by color alone; honor reduced-motion; the comms feed scannable.
- **Performance:** the layer is lightweight HTML/CSS over a WebGL canvas — avoid heavy full-screen backdrop-blur or effects that compete with the 3D for frame budget. Cinematic feel comes from type, color, layout, and restraint.
- **One screen, 16:9, no scroll.** Everything coexists in a single composed frame.

---

## 9. What to deliver

1. **The full composited screen** — delivered as the elevated/extended `docs/ui-mockup.html` (static HTML/CSS, the team's existing rendered artifact; not Figma or loose images) — HUD over a representative dusk disaster scene, in its key moments: **cold-open → live mid-mission → climax (timber shortage / carbon jump / material switch) → debrief.** Use a placeholder dusk image or CSS gradient behind the HUD to stand in for the live 3D; the HUD chrome is what you are designing.
2. **Each surface from §3** in its real states (default / active / climax / empty), populated with the real data from §3.
3. **A short delta note vs. `docs/UI_REDESIGN_BRIEF.md`:** confirm you used its exact tokens, type, and layout regions; list any place you extended it (with rationale) and any conflict you found.
4. **A one-paragraph rationale per major composition decision** (hierarchy, the climax choreography, the spine/microcopy texture, how panels stay legible over fire) — written so the presenter can defend it live to judges, including why it deliberately diverges from generic AI output. (This project is judged partly on the team understanding its own work; your rationale arms them.)
5. **A self-audit** confirming, point by point, that the design contains none of the §6 tells and obeys the brief's anti-slop rules.

Deliver something impossible to mistake for a generated template — authored for *this* mission, and so legible a stranger reads the whole story in four minutes.

---

### Sources (AI-design tells & how to avoid them)
- [AI Slop Web Design: Spotting and Fixing Generic Websites — 925studios](https://www.925studios.co/blog/ai-slop-web-design-guide)
- [Why AI Websites All Look the Same — AXE-WEB](https://axe-web.com/insights/ai-website-design-sameness/)
- [Why AI-Generated Websites Always Favour Blue-Purple Gradients — Kai Ni, Medium](https://medium.com/@kai.ni/design-observation-why-do-ai-generated-websites-always-favour-blue-purple-gradients-ea91bf038d4c)
- [The Purple Problem: Why AI Can't Stop Generating Purple Websites — Medium](https://medium.com/@ai.in.motion.blog/the-purple-problem-why-ai-cant-stop-generating-purple-websites-4381fb066883)
- [How to Break the AI-Generated UI Curse — dev.to](https://dev.to/a_shokn/how-to-break-the-ai-generated-ui-curse-your-guide-to-authentic-professional-design-2en)
- [The Year AI-Generated Interfaces Took Over — Standard Beagle](https://standardbeagle.com/the-year-ai-generated-interfaces-took-over/)
- [How to Make AI Designs Less Generic — Visily](https://www.visily.ai/blog/how-to-make-ai-designs-less-generic/)
