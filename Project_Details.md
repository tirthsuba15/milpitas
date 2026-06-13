# Haven
### An Agentic AI Commander for Disaster Relief and Sustainable Rebuilding

*Working name — swap freely (alternatives: Rebuild Command, Aegis, Phoenix). Save this file as `cloud.md` / `CLAUDE.md` so the team and any AI coding assistant build toward the same picture.*

---

## One sentence

Haven is an AI commander that runs a fleet of autonomous agents through the aftermath of a climate disaster — rescuing survivors, clearing and salvaging the wreckage, and rebuilding low-carbon homes so displaced families can return — making every decision to get the most vulnerable people back into safe housing first, while minimizing carbon and waste, and re-planning live when a second storm hits, materials run short, or more families arrive.

## Track positioning

**Primary track: Housing / housing insecurity.** Haven's literal objective is getting displaced, housing-insecure people back into safe homes. That is the headline number on the scoreboard and the thing the operation is *for*.

**Sustainability is built in, not bolted on.** Haven does not wear a green sticker — sustainability lives inside what the agents optimize: embodied carbon, salvaged-material reuse, waste diverted from landfill, energy self-sufficiency, and the long-term resilience of the rebuilt community against the next disaster. Every rebuild decision is also a carbon decision. This lets Haven compete hard on housing while carrying a genuine, *measurable* sustainability story.

---

## 1. The Vision

A climate disaster has torn through a community. Homes are gone, debris is everywhere, families are displaced, and the surrounding land is scarred and primed for the next fire or flood. The slow, conventional response trucks in new high-carbon materials, sends the wreckage to landfill, rebuilds without thinking about what's coming next, and takes months to decide who gets helped first.

Haven replaces the missing brain. We drop a fleet of drones and ground robots into the zone, and instead of a human trying to steer every unit through chaos, an AI commander takes charge. It maps the site, finds the survivors and displaced families, and runs the entire relief-and-rebuild operation through a team of specialized agents — one triaging who to reach first, one salvaging usable material out of the rubble, one assembling low-carbon modular homes, one healing the surrounding land so the rebuilt community can survive the next event. A human commander can step in anytime with a plain-English order, and the AI works out how. When the world changes — a second storm, a timber shortage, a wave of new arrivals — it notices, rethinks the whole plan, and adapts out loud, in real time.

And it looks the part: a photorealistic disaster zone rendered cinematically, with the operation visibly unfolding across it. The room leans in before the AI makes its first move — then watches it think.

The one line to remember: **we're not building robots that move — we're building an AI that runs a relief-and-rebuild mission and adapts when everything goes wrong, out loud, in a world that looks real, while a room full of people watch it think.**

## 2. The Problem

There are two intertwined problems, and Haven solves both at once.

**Coordination under chaos.** In a real disaster the bottleneck is not the robots — it's coordination. A single operator can't track a dozen units, a spreading hazard, and a shifting list of survivors and families whose situations are deteriorating. The situation changes faster than any fixed plan: a safe corridor becomes a death trap, a unit fails, a new collapse traps more people. Triage is brutal and constant — who do you reach first, the closest person or the most vulnerable across the whole site? Rigid, pre-programmed routing can't react; it just keeps executing a plan that's no longer valid. Lives and homes are lost not because the machines can't move, but because nothing can think and re-think fast enough across the whole operation.

**Slow, wasteful, high-carbon rebuilding.** The recovery that follows is just as broken. Conventional rebuilds import new materials (steel and concrete carry enormous embodied carbon), bulldoze the wreckage into landfill, and rebuild on the same vulnerable ground without preparing for the next disaster. It is slow, expensive, carbon-heavy, and fragile.

Haven is the autonomous orchestrator that perceives the whole situation, reasons about priorities and risk, directs the fleet, rebuilds sustainably out of what's already on site, and continuously re-plans as the disaster evolves — closing the gap between "saving people" and "rebuilding right."

## 3. What Haven Is

A photorealistic 3D simulation of a disaster-struck community, and an AI that commands it.

The world is one coherent site — a town hit by wildfire and flooding — rendered cinematically in 3D. Inside it are survivors and displaced families who need help, debris that can be salvaged or wasted, scarred land that needs healing, and a fleet of autonomous robots. Above it all sits the AI commander and its team of specialized agents: they see what's happening, decide what the fleet should do, and adapt as conditions change. A human operator watches, can issue spoken or typed commands, and can throw new emergencies at the system to see how it copes.

**Four kinds of actors, one continuous loop.** The robot fleet does the work. The specialist agents do the thinking, each owning a piece of the mission. The Commander arbitrates between them and runs the master loop. The human directs at a high level. And the world fights back — hazards spread, conditions worsen, resources run short — so the AI is always looping: perceive, reason, act, recover. That loop is the entire product.

---

## 4. The Agent Architecture — the heart of the project

This is what makes Haven *agentic* rather than a simulation with a script. There are three tiers: one orchestrator, a team of specialist domain agents, and the robot fleet they command.

### 4.1 The Commander (orchestrator agent)

The Commander is the top-level strategic brain. It takes the mission goal and the human's intent, decomposes them into tasks, and hands each task to the specialist agent that owns it. Its hardest and most important job is **arbitration**: the specialists compete for the same scarce resources (robots, material, energy, time), and their goals pull against each other — the Rescue agent wants every spare unit on survivors, the Rebuild agent wants them hauling panels, the Salvage agent wants them sorting debris. The Commander weighs these against the mission's multi-objective function (lives saved, vulnerable families housed, carbon avoided, waste diverted, resilience) and decides who gets what, right now. When the world changes, the Commander is what notices, re-prioritizes, and re-plans across all the agents at once.

### 4.2 The specialist agents — the "different agents"

Each specialist owns one sub-problem, optimizes its own objective, and commands a sub-fleet of robots. This is the team of agents the operation runs on:

| Agent | Owns | Optimizes for | Commands |
|---|---|---|---|
| **Rescue & Triage** | Finding and reaching people | Lives saved, vulnerable-first ordering | Recon drones, rescue ground units, medics |
| **Salvage & Debris Recovery** | Turning wreckage into supply | Material recovered, carbon avoided, waste diverted | Survey drones, sorting robots, haulers |
| **Rebuild & Housing** | Assembling homes | Vulnerable families housed, build speed, low embodied carbon | Builder/assembler robots, haulers |
| **Restoration & Resilience** | Healing the land | Fire risk reduced, carbon sequestered, waterways cleaned | Clearing units, planting drones, skimmers |
| **Resource & Logistics** | The shared pools | Efficient allocation, no idle units, balanced budgets | (No robots — manages inventory, energy, fleet split, carbon ledger) |
| **Sentinel (Foresight)** | What's coming next | Resilience to the next event, demand forecasting | (No robots — feeds predictions to the others) |

**Rescue & Triage Agent.** Locates survivors and displaced families (discovered through fog-of-war as drones explore), assesses vulnerability and urgency, and dispatches rescue and medic units. Triage is its core reasoning: it weighs how vulnerable each person/family is (children, elderly, medical needs, longest displaced) against how reachable they are and how the hazards are moving — and remakes those calls every few seconds as conditions change.

**Salvage & Debris-Recovery Agent.** Surveys the wreckage and classifies every pile by what it's worth: reusable timber, recyclable steel, crushable aggregate, or contaminated waste. It directs sorting and hauling robots to recover the highest-value, highest-carbon-avoided material first and divert it from landfill — then feeds that salvaged material straight into the Rebuild agent's supply. This is the circular-economy engine: the wreckage becomes the building stock.

**Rebuild & Housing Agent.** Sequences and assembles low-carbon modular homes (mass-timber and recycled panels, prefab, solar-powered). It decides the build order to house the most vulnerable families first, manages a mixed material budget (salvaged + imported), and chooses the lowest-carbon build it can within its constraints — preferring salvaged material over new whenever the supply allows.

**Restoration & Resilience Agent.** Heals the surrounding environment so the rebuilt community survives the next disaster. This single agent runs four restoration sub-missions over the site (see §5): wildfire fuel-load reduction, reforestation, waterway/plastic recovery, and flood/erosion control. It prioritizes the zones that most reduce future risk per unit of effort.

**Resource & Logistics Agent.** The quartermaster. It tracks the shared material inventory (salvaged + imported), the energy budget, and the live carbon ledger, and it arbitrates when two agents want the same robots or the same material. It is the agent that makes scarcity visible and forces trade-offs.

**Sentinel (Foresight) Agent.** The predictive layer. It forecasts where the next hazard will strike (a second storm front, a wildfire reignition, a flood surge) and where housing demand will surge, so the operation builds *resiliently* — siting and sequencing homes to survive what's coming, not just patching what already happened. "It doesn't just rebuild, it anticipates the next disaster."

### 4.3 The robot fleet (the embodied units)

The agents are the minds; the robots are the hands. Units are typed by capability, and agents compose teams from them.

| Unit | What it does | Typically commanded by |
|---|---|---|
| **Recon / survey drones** | Map the site, lift the fog of war, discover people and debris, assess damage | Rescue, Salvage |
| **Rescue ground units** | Reach people, clear light rubble, carry out rescues | Rescue |
| **Medics** | Stabilize critical survivors faster (scarce — only 1–2) | Rescue |
| **Sorting robots** | Classify and separate debris by material type | Salvage |
| **Haulers / transport** | Move material — salvaged *and* new — between salvage, store, and build sites | Salvage, Rebuild, Logistics |
| **Builder / assembler robots** | Erect modular home modules | Rebuild |
| **Restoration units** | Clear fuel load, plant trees, skim waterways | Restoration |

### 4.4 How the agents coordinate

All agents read and write a shared **world state** (a blackboard): entity positions, person/family status, hazard map, material inventory, energy and carbon ledgers, and each robot's current job. Specialists post their intended tasks and their resource requests to this shared state; the **Resource & Logistics Agent** detects contention; and the **Commander** arbitrates and commits the final assignment. Every decision an agent makes is published to a **mission comms bus**, which surfaces in the UI as a radio-style comms log — this is what makes the AI's reasoning visible. The human sits at the Commander level: they inject intent ("get the most vulnerable families in the north housed first," "pull units off salvage and onto rescue"), and the Commander folds that into its next planning pass. The loop runs continuously: **perceive the world state → reason (Commander + specialists) → act (assign robots) → re-plan when anything changes.**

### 4.5 How the AI is actually implemented

A hybrid architecture, chosen so the smart part is genuinely smart and the reliable part is genuinely reliable — and so it survives a code review.

- **Deterministic simulation layer** handles everything that must be fast and predictable: robot movement and pathfinding, hazard spread, person/family state decay, inventory and carbon math, and scoring. No LLM in this loop — it runs every frame.
- **LLM-in-the-loop reasoning layer** powers the Commander and specialist agents — the parts that benefit from real judgment: triage ordering, resource arbitration, build sequencing, re-planning, and the natural-language narration. On each planning tick (every few seconds, or on any significant event), the current world state is serialized into a compact context, sent to the model, and the model returns a **structured action plan as JSON** — a list of tool calls like `assign(unit, task)`, `reprioritize(target)`, `allocate_material(site, source)`, `reroute(unit, path)` — plus a one-line rationale for the comms log. The deterministic layer validates and applies those actions. This split means the demo never stalls waiting on a model call, the agents' decisions are explainable, and a judge can read the action JSON and see exactly what the AI decided and why.

*(Implementation note: the LLM can be Claude via the Anthropic API. Keep the per-tick context small — only what changed — and cap planning frequency so latency and cost stay low. Always keep a deterministic fallback policy so a slow or failed model call never breaks the run.)*

---

## 5. The Sustainability Engine

Sustainability is the objective, not the label — it shows up in four places, which is exactly what a sustainability-aware judge rewards even on the housing track.

**1. The objective function the agents optimize.** Every agent's goal is multi-term. The Rebuild agent doesn't just "house families," it houses the most vulnerable families *while minimizing embodied carbon and waste inside a material and energy budget*. The Salvage agent maximizes material recovered and carbon avoided. So every decision the system narrates is also a sustainability decision.

**2. Circular reuse — the strongest signal there is.** The Salvage agent recovers material from the disaster debris and feeds it into the Rebuild agent's supply, so the operation builds out of what's already on site instead of importing new high-carbon stock. The wreckage becomes the building material.

**3. The four restoration sub-missions feed *better, more resilient* housing.** This is how all the pieces the team wanted connect to housing rather than being separate side-quests:
   - **Wildfire fuel-load reduction** — clearing dead vegetation around the rebuild zone so the new homes aren't sited in a tinderbox. *(This is what "water flow fuel reduction" maps to — confirm or rename in the doc.)*
   - **Reforestation** — replanting to sequester carbon, stabilize soil, and restore the ecosystem the community depends on.
   - **Waterway / plastic recovery** — clearing flood-borne debris and plastic from the river edge; recovered plastic can become recycled building components.
   - **Flood / erosion control** — restoring drainage and ground cover so the rebuilt homes survive the next flood.
   Each one makes the *housing* outcome more durable: homes that won't burn, won't flood, and sit in a restored landscape. The Sentinel agent points this work at the zones most at risk next.

**4. The carbon ledger and the live trade-off.** A running carbon ledger tracks embodied carbon avoided versus a conventional build. The signature recovery moment is a sustainability win you can watch (see §10): a material shortage forces the Rebuild agent off new timber and onto salvaged + recycled panels, the most vulnerable families still get housed on time, and the carbon meter visibly drops.

**The proof.** A side-by-side counterfactual runs the same disaster twice — once with Haven commanding, once with simple fixed routing — and shows more families housed, faster, with less carbon and less landfill. That turns "this looks cool" into "this measurably does better on both axes."

---

## 6. 3D Rendering & Simulation — how it works

### 6.1 Rendering philosophy

We commit to a cinematic, photorealistic look, and we get it the cheap way. **Photorealism in web 3D comes from lighting, materials, and post-processing — not from hand-modeling and rigging assets.** Hand-building assets is the trap that eats hackathons; we avoid it entirely. Three levers do most of the work (lighting, materials, post-processing), and everything else is curated from free, license-clear libraries.

### 6.2 Tech stack

- **Three.js** as the WebGL engine (optionally via **React Three Fiber** if the UI is React, which makes the HUD/overlays easier to bind to state).
- **postprocessing** library (or Three's `EffectComposer`) for the cinematic pass.
- **Web Speech API** for voice command (free, browser-native).
- Free CC0 asset and texture sources: **Poly Haven** (HDRIs + PBR textures), **Quaternius / Kenney** (low-poly models), **Sketchfab** CC0 models.
- Runs entirely in the browser — no native build, ideal for a demo on unknown hardware.

### 6.3 Lighting — image-based (HDRI)

Light the whole scene with a real-world environment map (an HDRI of an overcast or dusk sky / smoke-filled gloom) instead of placing fake lights. This single choice instantly gives realistic light, soft shadows, reflections, and atmosphere, and is the biggest jump toward "photoreal" for almost no effort. Add one directional light for sun direction and crisp shadows.

### 6.4 Materials — physically based (PBR)

Concrete, asphalt, rubble, scorched metal, mud, mass-timber panels, solar glass — all use real PBR material maps (albedo, normal, roughness, metalness, ambient-occlusion) pulled from free texture libraries. Nobody paints a texture by hand; we drop in real ones and tune them.

### 6.5 Post-processing — where the "wow" comes from

The pass that turns "web demo" into "film": **bloom** (makes fire, solar shimmer, and our unit markers radiate light), **SSAO / ambient occlusion** (grounds objects, adds depth), **ACES filmic tone mapping + color grading** (cinematic color), and a touch of **depth of field + vignette** to focus the eye. Most of the perceived realism lives here.

### 6.6 Assets & instancing

Drones, vehicles, debris, trees, and home modules come from ready-made free libraries — we curate and place, we don't model. Repeated objects (rubble chunks, floor tiles, trees) use **instanced meshes** so a thousand of them cost almost nothing. LOD (level of detail) swaps distant models for cheaper versions.

### 6.7 Dynamic effects

- **Fire, smoke, dust** — GPU particle/sprite systems amplified by the bloom pass; they read as photoreal without simulating real combustion.
- **Floodwater / river** — a reflective plane with a normal-map ripple (a `Reflector`), which also showcases the plastic-recovery sub-mission.
- **Homes assembling** — modules animate in via scale/clip reveals so you literally watch houses go up.

### 6.8 The simulation layer

- **Navigation:** a grid or navmesh over the site; pathfinding via **A\*** (or a flow-field for many units heading to shared goals), with dynamic costs so hazards make routes expensive or lethal.
- **Hazard spread:** a lightweight cellular model — fire spreads to adjacent flammable cells over time, flood seeps to low ground, each with its own rate.
- **Entity state:** survivors/families carry vulnerability + urgency that worsen over time (faster near hazards); debris carries material type + value; the inventory and carbon/energy ledgers update as work happens.
- **Scoring:** the metrics in §8, computed every tick.

### 6.9 Legibility overlays — the part that makes the AI visible

This is the big guardrail: a gorgeous scene can hide what the AI is doing, and the whole point is that its intelligence is *visible*. So on top of the realism we keep our actors unmistakable: each robot wears a glowing, state-colored marker/outline (idle / working / blocked / failed); people glow in urgency colors (calm / amber / critical) so they pop against the gritty terrain; build sites show progress rings; and the live comms log narrates every decision. **The realism is the stage; the agents' actions stay legible on top of it.**

### 6.10 Camera

A cinematic camera with slight depth — a slow controlled ambient drift, plus a few preset "hero" angles for the demo's key beats. A scripted camera always looks more professional on stage than free-flying.

### 6.11 Performance guardrails

Realistic lighting + post-processing + a dozen moving units can tank framerate, and a stuttering photoreal demo is worse than a smooth simple one. We cap particle counts, instance repeated geometry, use LOD and frustum culling, cap the device pixel ratio, and **test on the actual demo machine early**. We also record a clean full run as a backup so a hardware hiccup can never sink the demo.

---

## 7. Full Feature Set

**A. The photorealistic world.** Cinematic 3D disaster site (wildfire + flood) lit with HDRI and finished with a post pass; spreading hazards with real dynamics and glow; fog of war (the map is revealed by drones, people are discovered not known); survivors and families with deteriorating conditions; a heterogeneous robot fleet with real capability differences; collision-free fleet movement.

**B. The agent brain.** Autonomous mission orchestration (the Commander runs the whole operation, no one steering units); the specialist agents of §4; triage reasoning under pressure; team composition (a drone finds, a ground unit retrieves, the medic is saved for confirmed criticals); circular salvage-to-rebuild supply; goal-driven (multi-objective) rather than rule-driven behavior.

**C. Real-time adaptation & recovery (the differentiator).** Live re-planning when a route becomes lethal; recovery from unit failure (reassign the job, keep going); autonomous response to new emergencies (a second collapse or storm); surge handling (a wave of new arrivals rebalances the whole fleet); the material-shortage → salvage-substitution → carbon-drop beat.

**D. Human command.** Plain-English commands ("prioritize the families with kids in the north," "we're low on timber, switch to recycled panels"); voice command (hands-free, huge demo impact); the human directs strategy and can intervene anytime but never micromanages units.

**E. Situational awareness & legibility.** Live mission comms narrating the AI's reasoning; spoken narration of key decisions; a mission status dashboard (the scoreboard); an after-action debrief the AI writes itself.

**F. Proof & demonstration.** AI-versus-baseline comparison (same disaster, AI vs fixed routing — more housed, less carbon); operator chaos controls (inject a storm, disable a unit, trigger a shortage, surge new families — on cue); repeatable, reliable scenarios so the key beats land every rehearsal.

**G. Frontier stretch (high ceiling, with safe fallbacks).** AI vision through the drone camera (identify people/debris from the rendered view); the Sentinel predictive layer; a hardware-agnostic brain (the Commander is decoupled from the units, so in principle the same brain could drive real robots).

---

## 8. Metrics & Scoreboard

| Tier | Metrics |
|---|---|
| **Primary (Housing)** | Vulnerable families housed (the top number), vulnerable-first %, people rescued, build progress |
| **Sustainability** | Embodied carbon avoided vs. conventional build (tCO₂e), % material salvaged & reused, waste diverted from landfill, energy self-sufficiency %, restoration progress (fire risk reduced / trees planted / plastic recovered) |
| **Operational** | Mission clock, robots active / failed, material & energy budgets remaining |
| **Counterfactual** | Haven vs. baseline: families housed, time-to-house, carbon, waste |

The closing debrief states it in one sentence that hits both axes: *"Housed 14 of 18 families, vulnerable first; cut embodied carbon 38% by reusing salvaged material and substituting recycled panels; diverted 22 tons of debris from landfill."*

---

## 9. Human Command & Interaction

The operator directs at the level of intent, not joysticks. They can **type or speak** orders to the Commander, who translates them into coordinated action across the agents. They can throw **chaos** at the system mid-demo — a second storm, a disabled unit, a timber shortage, a surge of new families — to create the dramatic re-planning moments live and prove the adaptation is real. And at mission end they get the **after-action debrief**: what was saved and housed, the single decision or event that most affected the outcome, the carbon and waste numbers, and what the AI would do differently next time.

---

## 10. The Demo (run-of-show, ~3–4 minutes)

1. **First sight.** The camera opens on a photoreal disaster-struck town at dusk — smoke drifting, floodwater catching the light, debris everywhere. The room leans in.
2. **Deploy & discover.** The fleet deploys; recon drones fan out and the unknown map lights up; survivors and displaced families appear one by one.
3. **The agents take over.** Without anyone touching the controls, the Rescue agent triages and dispatches units, the Salvage agent starts classifying and recovering debris, and the Rebuild agent begins assembling the first homes for the most vulnerable families — each narrating its calls over the comms log.
4. **Human command.** The operator speaks an order ("get the families with kids in the north housed first"), and the Commander re-prioritizes the fleet.
5. **The recovery moment (the climax).** Disruption hits — a delayed supply truck means timber runs out, and a second storm front appears on the Sentinel's forecast. The build stalls. The Commander announces it, the Rebuild agent switches the remaining homes to salvaged + recycled panels, re-sequences so the most vulnerable families are still housed on time, and the **carbon meter visibly drops** because the greener material was forced into play. A disruption became a sustainability win, live.
6. **Resilience.** The Restoration agent clears fuel and replants the hillside above the rebuilt homes so the next fire doesn't reach them.
7. **The debrief.** The AI closes with its one-sentence account (families housed vulnerable-first, carbon cut, waste diverted) and the **counterfactual chart** vs. dumb routing.

Every one of those beats shows the AI *thinking*, in a world that looks real.

---

## 11. Scope & 10-Hour Build Plan

The vision above is the full picture. **You cannot build all of it in 10 hours, and trying to will sink you.** Build the core that demos itself; represent the breadth with lightweight modules; cut the rest without shame.

### 11.1 Core — must build (demo-critical)
- The 3D scene with HDRI lighting + post pass + legibility overlays (one site, good enough to read as real).
- Collision-free fleet movement with A\* pathfinding.
- The **Commander + three specialist agents**: Rescue & Triage, Salvage, Rebuild. (These three carry both tracks: rescue = relief, rebuild = housing, salvage = sustainability.)
- The core loop with the deterministic sim + LLM planning split (§4.5).
- **One** recovery moment — the timber-shortage → salvage-substitution → carbon-drop beat. This is the whole demo; make it bulletproof.
- The HUD scoreboard with the carbon meter and families-housed counter, and the comms log.
- One human command (typed is fine; voice is a bonus).
- The AI-vs-baseline counterfactual (can be a pre-computed chart if live is too costly).

### 11.2 Stretch — if time allows
- The **Restoration agent** and its four sub-missions, shown as *narrated + lightweight visual* (planting drones placing trees, a clearing unit, a skimmer on the water) rather than fully simulated systems — enough to legitimately claim the breadth.
- The **Sentinel** foresight layer (even a simple "next storm in zone X" forecast that changes siting reads as intelligence).
- Voice command.
- Full operator chaos controls (multiple injectable events).
- Drone-camera vision.

### 11.3 Cut-first list (drop these the moment you're behind)
Drone-camera vision → voice → Sentinel → restoration sub-missions beyond a single visual → extra chaos events. Protect the core loop and the one recovery beat above all.

### 11.4 Roles
- **Visual / frontend lead:** the photoreal pass (lighting, materials, post), the scene, unit markers, comms/HUD. Starts the visual setup early; guards legibility and framerate.
- **AI / brain lead:** the Commander + specialist agents, the planning loop, triage, re-planning, narration, debrief.
- **World / simulation lead:** hazards and spread, person/family state, debris + material + carbon ledgers, fleet movement, scoring.
- **Integration / demo lead:** wiring, chaos controls, scenarios, run-of-show, and making the whole thing run end-to-end early and stay running.

### 11.5 Notes for the code review (the rubric tests this)
Milpitas Hacks 2 includes a code review and explicitly penalizes "blatantly AI generated" code and a presenter who doesn't understand the codebase — and it rewards **open source**. So: keep the repo **public**, comment the agent loop, and make sure whoever presents can explain the perceive→reason→act→re-plan loop and the action-JSON interface live. If you generate code with AI, read it and refactor it into something you own and can defend.

### What Haven is and isn't
**It is:** a cinematic, photorealistic 3D simulation where an AI visibly commands a robot fleet through disaster relief and a sustainable rebuild, makes real triage and material/carbon decisions, recovers from live disruptions, takes spoken human direction, and explains itself the whole way. **It isn't:** a physics-perfect fluid/structural simulator, or a project where we model and rig assets by hand, or six fully-simulated sustainability systems. The intelligence — coordination, triage, sustainable rebuilding, recovery — is the real, finished part; the world is achieved through lighting, materials, post-processing, and ready-made assets, built to make that intelligence impossible to miss.

---

## 12. Why It Wins — mapped to the rubric

- **Innovation & Creativity:** an embodied, multi-agent AI that runs a live relief-and-rebuild operation and *optimizes carbon under constraint* is far rarer and more novel than another chatbot or CRUD app.
- **Technical Complexity & Execution:** a genuinely complicated stack — multi-agent LLM orchestration + 3D + pathfinding + a hybrid deterministic/LLM loop — that you can explain end to end.
- **Functionality & Usability:** judges can *use* it — type or speak a command and inject a disruption, then watch it adapt (the rubric rewards judges who get to play with it).
- **Design & Presentation:** a photoreal scene with legible overlays and a rehearsed, scripted run.
- **Impact & Practicality:** it solves a real, massive problem (housing displaced people after climate disasters) with a measurable sustainability dividend and a clear path from sim to real robots — it would survive as a product.
- **Relevance to theme/track:** housing is the literal objective and the top scoreboard number, so it *completely follows* the track — with a real, measurable sustainability story carried inside it.
- **Quality of Code:** a public, commented repo and a team that owns and can defend the agent loop.

---

*The agents' intelligence is the heart and has to work; the photorealism is the identity that makes it unforgettable. Build them in parallel — never let the pretty scene delay the working brain, or the working brain ship without the look.*
