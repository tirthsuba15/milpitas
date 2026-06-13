# Phase Cards — AI Brain Lead
*Haven Hackathon · 6-hour build · 4 people*

**Your role:** You make Haven intelligent. The Commander + three specialist agents (Rescue, Salvage, Rebuild) must reason visibly and impressively — judges need to see the AI thinking, not just robots moving on a script. You own the LLM loop, the narration, and the demo's climax (the timber shortage recovery moment). Nothing you build is shown to users as raw mechanics — it shows up as decisions in the comms log, actions in the world, and a compelling after-action debrief.

**Your north star:** The comms log should feel like a war room — terse, urgent, specific. Judges should be able to read 3 entries and understand exactly what the AI decided and why.

---

## Phase 1 — API Client, Serializer & Fallback
**Time budget:** 0:00–0:45 (45 minutes)
**Starts when:** Integration lead confirms types are frozen in `src/types/`

### Deliverable
`src/agents/client.ts` wraps the Anthropic SDK, calls `claude-sonnet-4-6`, and returns a parsed `AgentPlanResponse`. `src/agents/serializer.ts` takes a WorldState and produces a ≤600 token compact text summary. `src/agents/fallback.ts` returns a deterministic `AgentPlanResponse` without any LLM call. All three are importable and tested with a `console.log`.

### Key decisions
- **Model:** `claude-sonnet-4-6` — fast and cheap. Only upgrade to `claude-opus-4-7` if narration quality is genuinely poor after tuning.
- **Non-streaming:** Await the full response. 3-second planning interval means a 1-2s API call is fine.
- **Token budget:** ≤600 tokens in (serializer), ≤600 tokens out (6-10 actions + narration). Stay under 1200 total.
- **Output format:** Strict JSON only. System prompt says "Output ONLY the JSON object, no markdown, no explanation." Add `JSON.parse()` with try/catch — return null on failure (Commander then uses fallback).

### Dependencies
- Integration lead's `src/types/world.ts` and `src/types/agents.ts` (need these frozen first)
- `VITE_ANTHROPIC_API_KEY` in `.env` (confirm with Integration lead)

### What to build
1. Read `src/agents/client.ts` — it may already be scaffolded. Complete it: the system prompt in `SYSTEM_PROMPT` needs to precisely describe all AgentAction types with their field names. Test it by calling `planningCall` with a dummy context and `console.log`-ing the result.
2. Read `src/agents/serializer.ts` — complete `serializeWorldState()`. The output should be scannable text: discovered people sorted by urgency, idle robots, top debris by salvage value, build site progress, material inventory. Keep it ≤600 tokens (run it on the initial world state and count tokens with a rough estimate: 1 token ≈ 4 chars).
3. Read `src/agents/fallback.ts` — complete the fallback: idle drones → explore unrevealed cells; idle rescue units → highest urgency discovered person; idle sorters → highest value debris; idle builders → active build sites.
4. Write a quick `console.log` test that creates a test WorldState, calls `serializeWorldState()`, and logs the output. Paste into the Planning Session when done.

### Context hint
You are building the AI reasoning layer for Haven, an autonomous disaster relief AI. The shared types are in `src/types/world.ts` (WorldState, Entity, GridCell, etc.) and `src/types/agents.ts` (AgentAction variants). Your job in Phase 1 is the three foundational files: `client.ts` (wraps Anthropic SDK), `serializer.ts` (WorldState → compact text), `fallback.ts` (deterministic backup). The `VITE_ANTHROPIC_API_KEY` comes from `.env`. The API key is browser-exposed (hackathon only — production would use a backend). The serializer is the most important piece to get right: it must fit the entire meaningful world state into ~500 tokens so the LLM has enough context but calls stay fast and cheap. Focus on: people sorted by urgency (most urgent first), idle units, top-value debris, site progress, material inventory warnings. Omit: detailed grid state, already-rescued people, completed sites.

### Update block
```
PHASE 1 COMPLETE
Deliverable: client.ts, serializer.ts, fallback.ts working and importable
Key decisions: [any system prompt changes, token count of serializer]
Blockers: [anything blocking Phase 2]
Phase 2 needs: all three files importable; API key confirmed working
```

---

## Phase 2 — Commander Orchestrator (Perceive → Reason → Act → Re-plan)
**Time budget:** 0:45–2:00 (75 minutes)

### Deliverable
`src/agents/Commander.ts` exports a `commander` singleton with `maybePlan(state, nowMs, applyFn)` that: serializes the world state, calls Claude, parses the response, calls `applyFn` with the plan (or fallback if API fails). Also exports `injectHumanCommand(cmd)` to set a priority override for the next tick. Re-planning triggers immediately (within the next 100ms) when: a unit fails, or a new person reaches urgency > 90.

### Key decisions
- **Planning interval:** 3000ms between LLM calls. The `maybePlan` check: `nowMs - lastPlanAt >= 3000 || replanPending || hasSignificantEvent`.
- **Human command injection:** `injectHumanCommand()` sets `pendingHumanCommand` and `replanPending = true`. The command is prepended as "HUMAN OVERRIDE: ..." to the next planning context, then cleared.
- **Significant events:** Unit failure or person urgency > 90 → `replanPending = true`. This ensures the AI responds to crises within one tick (33ms) rather than waiting up to 3 seconds.
- **Error handling:** If API call throws, log the error and call `applyFn(fallbackPlan(state))` — demo never stalls.

### Dependencies
- Phase 1 files (`client.ts`, `serializer.ts`, `fallback.ts`)
- Integration lead's App.tsx calling `commander.maybePlan()` in the sim loop

### What to build
1. Read `src/agents/Commander.ts` — it may be scaffolded. Complete the `maybePlan()` method.
2. Key logic: track `lastPlanAt`, check `replanPending`, check `_hasSignificantEvent(state)`.
3. The `injectHumanCommand()` method stores the command and sets `replanPending = true`.
4. In `maybePlan()`: build `PlanningContext`, call `planningCall()`, on success call `applyFn(result)`, on null/error call `applyFn(fallbackPlan(state))`. Clear `pendingHumanCommand` after use.
5. Implement `generateDebrief(finalState)` — a single Claude call that asks for a 2-3 sentence debrief with specific numbers (families housed, carbon avoided, one key decision).
6. Test: confirm that injecting `commander.injectHumanCommand("test")` causes a planning call within 100ms.

### Context hint
Phase 1 is done: `planningCall()`, `serializeWorldState()`, and `fallbackPlan()` are all working. Now build the Commander loop in `src/agents/Commander.ts`. The Commander is a singleton (`export const commander = new Commander()`). Its main method is `async maybePlan(state, nowMs, applyFn)` — called every 33ms by App.tsx's interval, but it only actually plans every 3 seconds (or immediately on replan triggers). The `applyFn` callback takes an `AgentPlanResponse` and applies its actions to the world. Your Commander doesn't need to understand the actions — that's the Simulation lead's job. It just needs to: (1) check if enough time has passed or a replan is needed, (2) call the LLM (or fallback), (3) pass the result to `applyFn`. Make sure the fallback path is identical in signature — `applyFn` should work the same whether the response came from Claude or from `fallbackPlan()`.

### Update block
```
PHASE 2 COMPLETE
Deliverable: commander.maybePlan() works end-to-end with real LLM and fallback
Key decisions: [any changes to replanning logic or interval]
Blockers: [anything blocking Phase 3]
Phase 3 needs: confirmed maybePlan() works, injectHumanCommand() works
```

---

## Phase 3 — Rescue Agent + Salvage Agent (Specialist Logic)
**Time budget:** 2:00–3:30 (90 minutes)

### Deliverable
The Commander's system prompt includes Rescue and Salvage agent sections that produce distinct, vivid, correctly-typed actions. The comms log shows entries tagged `[RSC]` and `[SLV]` with agent-appropriate voice (rescue=urgent/human, salvage=material-economics). The Rescue agent correctly produces `assign_task` actions with `type: 'rescue'` for discovered high-urgency people. The Salvage agent produces `assign_task` actions with `type: 'sort_debris'` and `type: 'haul_material'`.

### Key decisions
- **One LLM call, multiple agents:** The specialist agents are NOT separate API calls. They're sections in the single Commander prompt. Claude acts as all agents simultaneously and returns a JSON array of actions tagged with `assignedBy: 'rescue'` / `assignedBy: 'salvage'` etc.
- **Urgency formula:** (vulnerability_score × 40) + (time_since_discovered_s × 0.4) + (proximity_to_hazard × 20), capped at 100. Vulnerability scores: high=3, medium=2, low=1. This is computed in the serializer, not the LLM.
- **Salvage priority:** Sort by `kgCo2eIfSalvaged` descending. The serializer already does this — LLM just needs to assign the top debris to idle sorters.

### Dependencies
- Phase 2 Commander loop working
- Sim lead's `applyAction()` correctly handling `assign_task` for `sort_debris` and `rescue` types

### What to build
1. Improve the system prompt in `src/agents/client.ts`. Add explicit "Rescue Agent" and "Salvage Agent" sections that describe what each agent should optimize and what action types they emit. Make the voices distinct.
2. Update `serializeWorldState()` in serializer.ts to include: urgency score formula result on each discovered person, and a clear "RESCUE AGENT" section vs "SALVAGE AGENT" section in the output.
3. Verify the LLM is producing `assign_task` actions with correct `type` fields ('rescue' for rescue units, 'sort_debris' for sorting robots).
4. Verify the `narrate` actions have distinct agent voices — print 10 narration entries and check for variety and specificity.
5. Add a rule to the prompt: Rescue agent never wastes a medic on a low-urgency person. Medic is only dispatched to urgency > 80.

### Context hint
The Commander loop works. Claude is planning and the fallback runs reliably. Now add specialist agent personalities to the prompt. The key insight: Claude responds to structured prompt sections. If you add a section "=== RESCUE AGENT ===\nYour goal: maximize lives saved, prioritize highest urgency first..." and a "=== SALVAGE AGENT ===" section, Claude will naturally produce actions that match each agent's mandate. The actions themselves are the same JSON format — just tagged with different `assignedBy` fields. Your main job is (1) improving the system prompt to produce distinct, non-generic narration and (2) improving the serializer to make the rescue and salvage sections of the world summary clear and scannable. Check the comms log after 10 planning ticks — if the messages all sound the same ("Assigning unit to task"), the prompt needs more personality.

### Update block
```
PHASE 3 COMPLETE
Deliverable: Rescue + Salvage agents producing vivid, distinct comms log entries
Key decisions: [any prompt changes, urgency formula adjustments]
Blockers: [anything blocking Phase 4]
Phase 4 needs: confirmed rescue/salvage actions working, distinct narration
```

---

## Phase 4 — Rebuild Agent + The Timber Shortage Recovery Moment
**Time budget:** 3:30–5:00 (90 minutes)

### Deliverable
The Rebuild agent section in the prompt correctly produces `allocate_material` and `assign_task` (build_module) actions. **When `importedTimber` drops to 0 (timber shortage chaos event), the Commander detects it within one planning tick and emits `allocate_material` actions switching all active build sites to `recycled_panels`, plus a narration that explicitly says it's making this switch and the carbon impact.** The carbon meter in the HUD visibly drops after the switch. This moment works reliably every time it's triggered.

### Key decisions
- **Material shortage detection:** The serializer includes a warning in the context when `importedTimber < 2000` and a CRITICAL when it's 0. Claude should produce `allocate_material` actions in response.
- **Carbon drop mechanics:** The `ledger.ts` `updateCarbonLedger()` function computes the avoided carbon when material is switched to recycled_panels (saves ~11.2 kgCO2e/kg vs imported timber). The `CarbonMeter.tsx` component reads from the store reactively.
- **Narrator voice for the moment:** The Commander's narration during timber shortage must include numbers: "Switching 3 build sites to recycled panels — carbon footprint drops from 12.0 to 0.8 kgCO2e/kg."
- **Fallback for this moment:** If LLM is slow, `fallback.ts` must ALSO handle the shortage — add a rule: if `inventory.importedTimber === 0`, emit `allocate_material(siteId, 'recycled_panels')` for every active site.

### Dependencies
- Sim lead's `ledger.ts` `updateCarbonLedger()` correctly updating `carbon.avoidedKgCo2e`
- Visual lead's `CarbonMeter.tsx` reading from store and animating
- Integration lead's chaos event wiring in App.tsx

### What to build
1. Add the "Rebuild Agent" section to the system prompt in `client.ts`. It should: prioritize building for high-vulnerability families, manage material allocation, and explicitly flag when material runs out.
2. Add a material shortage warning to the serializer: if `importedTimber === 0`, add a line "⚠ CRITICAL: Imported timber exhausted. Must switch all active build sites to recycled_panels NOW."
3. Add to the system prompt: "When imported timber is exhausted, IMMEDIATELY emit allocate_material actions for ALL active build sites switching to recycled_panels. This is non-negotiable. Include a narrate action explaining the carbon impact with specific numbers."
4. Add a fallback rule in `fallback.ts`: `if (state.inventory.importedTimber === 0)` → emit `allocate_material` for every active site.
5. Trigger the shortage event manually (via the chaos button), wait one planning tick, and verify the comms log shows the switch message and the CarbonMeter updates.
6. Run this 5 times. It must work every time.

### Context hint
The Rescue and Salvage agents work. Now add the Rebuild agent and the climax moment. The timber shortage recovery beat is the single most important moment in the demo — it's the one that judges remember. It must: (1) happen visibly in the comms log with a specific message, (2) result in material change in the ledger, (3) be reflected in the CarbonMeter dropping. The mechanics are already implemented in `ledger.ts` — you just need Claude to emit the right `allocate_material` actions and the right narration. The most common failure mode is Claude responding to the shortage with generic actions instead of specifically switching materials — fix this with explicit prompt language: "If you see ⚠ CRITICAL: Imported timber exhausted, the FIRST actions in your response MUST be allocate_material actions for every active build site."

### Update block
```
PHASE 4 COMPLETE
Deliverable: Rebuild agent works, timber shortage → material switch works reliably
Key decisions: [exact prompt language that made it reliable]
Blockers: [anything blocking Phase 5]
Phase 5 needs: confirmed recovery moment, needs narration tuning
```

---

## Phase 5 — Narration, Debrief & Prompt Tuning
**Time budget:** 5:00–6:00 (60 minutes)

### Deliverable
The comms log reads like a war room for 4 minutes straight — vivid, specific, non-repetitive. After mission completion, the `generateDebrief()` function produces a 2-3 sentence after-action debrief with specific numbers (families housed in vulnerability order, carbon avoided vs baseline, one key decision). The system prompt is tuned so the recovery moment narrates clearly and dramatically every time.

### Key decisions
- **Narration variety:** Add "Vary your phrasing. Never repeat an exact phrase you used in the last 5 turns." to the system prompt. The serializer can optionally include the last 3 comms entries so Claude knows what it just said.
- **Debrief:** One `generateDebrief()` call with the final WorldState. Ask for: (1) families housed and whether vulnerable ones went first, (2) tCO₂e avoided vs baseline as a percentage, (3) the single decision that most changed the outcome. Format: 2-3 sentences, no bullet points.
- **What to cut if time is short:** Narration variety tuning is nice-to-have. Debrief is must-have — it's the last thing judges see.

### Dependencies
All phases complete

### What to build
1. Include last 3 comms entries in the serializer output so Claude knows what it just said.
2. Add "Vary phrasing and tone across turns. Use agent-specific vocabulary: Rescue speaks about people and urgency; Salvage speaks about material value and carbon math; Rebuild speaks about construction timelines and vulnerable families; Commander speaks strategically." to system prompt.
3. Run the full demo scenario and read every comms entry. Highlight any repeated phrases or generic entries. Add anti-patterns to the system prompt ("never say 'Assigning unit to task'").
4. Add `generateDebrief()` call wired to the mission complete screen. Test it — paste the output in the Planning Session.
5. Final check: trigger all 3 chaos events in sequence and confirm narration stays coherent and non-repetitive.

### Update block
```
PHASE 5 COMPLETE — BRAIN DONE
Deliverable: Vivid comms log, debrief working, all 5 agents narrating distinctly
Sample debrief: "[paste generated debrief here]"
Key decisions: [final prompt additions that helped most]
```
