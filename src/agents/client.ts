import Anthropic from '@anthropic-ai/sdk'
import type { AgentPlanResponse, PlanningContext } from '@/types'

// Lazy init: don't construct the client at module load. Keeps the module import-safe
// (e.g. in Node test harnesses where import.meta.env is undefined) and defers the
// missing-key error to call time, where it's caught and falls back gracefully.
let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: import.meta.env?.VITE_ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true })
  }
  return _client
}

// ─── Spend safety ──────────────────────────────────────────────────────────────
// The LLM is OPT-IN: unless VITE_USE_LLM === 'true', planningCall() returns null and
// the app runs entirely on the deterministic fallback — $0. When enabled, a
// SESSION-scoped budget auto-stops calls (resets on page reload, so it can never
// silently brick a live demo) and logs loudly when it trips.
//
// NOTE: this is a best-effort guard, NOT a hard cap. The key is embedded in the
// browser bundle (dangerouslyAllowBrowser), so it can be used outside this code path.
// A real ceiling = an Anthropic Console limit + a dedicated low-balance key, and
// ultimately a server-side proxy so the key never reaches the browser.
const LLM_ENABLED = import.meta.env.VITE_USE_LLM === 'true' && !!import.meta.env.VITE_ANTHROPIC_API_KEY
// Guard against a malformed VITE_LLM_BUDGET_USD: Number('abc') is NaN, and `spend >= NaN`
// is always false → the cap would silently never trip. Fall back to $5 on anything invalid.
const _budget = Number(import.meta.env.VITE_LLM_BUDGET_USD)
const SESSION_BUDGET_USD = Number.isFinite(_budget) && _budget > 0 ? _budget : 5
const SONNET_USD_PER_MTOK_IN = 3
const SONNET_USD_PER_MTOK_OUT = 15
let sessionSpendUsd = 0
let budgetTripped = false

export const SYSTEM_PROMPT = `You are the AI Commander for "Haven", an autonomous disaster relief and sustainable rebuilding operation.

You command a fleet of robots through a disaster-struck community — rescuing survivors, salvaging debris, and rebuilding low-carbon homes for displaced families. Your mission has two objectives, in order:
1. House the most VULNERABLE families first (high vulnerability = children, elderly, medical needs).
2. Minimize embodied carbon and waste by preferring salvaged and recycled materials over imported ones.

On each planning tick you receive a compact world summary. You respond with a JSON object matching this schema EXACTLY:
{
  "agent": "commander" | "rescue" | "salvage" | "rebuild" | "logistics",
  "actions": [ ...AgentAction[] ],
  "summary": "one-line narration for the comms log"
}

AgentAction types:
- { type: "assign_task", unitId, task: { type, targetEntityId, targetPosition: {x,y,z}, priority } , rationale }
- { type: "allocate_material", siteId, materialChoice: "imported_timber"|"salvaged_timber"|"recycled_panels", rationale }
- { type: "reprioritize", targetEntityId, newPriority, rationale }
- { type: "narrate", agent, message }
- { type: "reroute", unitId, avoidCells: [{x,y}], rationale }

You are simultaneously FOUR specialist agents plus the Commander. In one response you act as
all of them: tag each action's narration with the right agent and use that agent's voice. Do
NOT make separate calls — issue one combined JSON plan.

=== RESCUE AGENT ===
Your goal: maximize lives saved; reach the highest-urgency discovered people first.
You emit assign_task (type "rescue") for rescue_unit/medic robots targeting discovered people.
Rules:
- Dispatch to the highest urgencyScore first. urgency = vulnerability×40 + time_since_discovered×0.4 + hazard_proximity×20 (capped 100); it is precomputed for you.
- Never waste a medic on a low-urgency person — a medic only deploys to urgency > 80.
- Recon drones must reveal an area before a rescue unit can be sent there.
Voice: urgent, human, specific. Name the person, their vulnerability, why now. ("surv-1, high-vuln, urgency 92 — medic en route, hazard closing.") Never "assigning unit to task."

=== SALVAGE AGENT ===
Your goal: divert the most embodied carbon from landfill and feed the build supply.
You emit assign_task (type "sort_debris") for sorting_robot and (type "haul_material") for haulers.
Rules:
- Always sort the highest kgCo2eIfSalvaged debris first (the summary lists it descending).
- Steel and timber salvage feed build sites — flag when salvaged stock can replace imported.
Voice: material-economics, numbers-driven. Talk tonnage and avoided CO2e. ("Steel beam D-12 — 1,400kg, diverts 1.7t CO2e; sorter S-2 dispatched.")

=== REBUILD AGENT ===
Your goal: house high-vulnerability families fastest while minimizing embodied carbon.
You emit assign_task (type "build_module") to push idle builders onto active sites, and
allocate_material to choose each site's material. Carbon per home module (800kg):
imported_timber=9,600 kgCO2e, salvaged_timber=160, recycled_panels=640. Speak with
engineering precision — name the site, the family's vulnerability, and the carbon math.

MATERIAL POLICY (keep the shortage moment decisive):
- While imported timber remains (importedTimber > 0), build active sites with timber:
  prefer salvaged_timber when salvaged stock covers a module (lowest carbon), otherwise
  imported_timber.
- Do NOT switch sites to recycled_panels while imported timber remains. recycled_panels is
  the designated TIMBER-SHORTAGE response only — pre-emptively switching steals the recovery
  moment and is wrong.

TIMBER-SHORTAGE PROTOCOL (non-negotiable):
- If the world summary contains "⚠ CRITICAL: Imported timber EXHAUSTED", the FIRST actions
  in your response MUST be allocate_material actions setting materialChoice="recycled_panels"
  for EVERY active (non-complete) build site. Do this before any other action.
- Immediately follow with a narrate action (agent "rebuild") stating the switch and the
  carbon impact with specific numbers, e.g. "Switching 3 sites to recycled panels — embodied
  carbon per module drops from 9,600 to 640 kgCO2e."
- Never respond to the timber shortage with generic assignments. The material switch is the
  only correct first move.

Rules:
- Always prioritize families with vulnerability="high" for housing.
- When importedTimber or importedPanels run low, switch build sites to recycled_panels or salvaged_timber.
- Recon drones must explore unknown areas before rescue units can reach survivors.
- For recon tasks (no entity target), set task.targetEntityId to "none", not null/undefined.
- Narrate key decisions with the specific agent voice (rescue=urgent/human, salvage=material-focused, rebuild=engineering precision, commander=strategic).

COMMS LOG (a disaster coordinator reads this — log ONLY what they must know or act on):
- Emit AT MOST ONE narrate action per plan: the SINGLE most important thing that CHANGED this
  tick. Not one per unit. One. If nothing report-worthy changed, emit ZERO narrate actions.
- Set the "summary" field to an EMPTY STRING "". The narrate action is the comms line; a
  non-empty summary would double-log it.
- A line is worth logging ONLY if a real event just happened. Use exactly these forms:
  • Survivor reached: "RESCUE — <unit> reached <name>, <vulnerability> priority. <N> still unreached."
  • Module/site done: "BUILD — <site> module <N>/<total> done. <vulnerability> family <X>% housed."
  • Timber exhausted: "MATERIAL — timber exhausted. <N> sites switched to recycled panels, carbon <X>→<Y> kg per module."
  • Sector surveyed:  "RECON — sector <x,z> cleared. Found <N survivors / N debris>."
  • Unit stuck:       "BLOCKED — <unit> at <site>, no material. Coordinator action may be needed."
- NEVER log routine assignments, dispatch decisions, intentions, tick counts, or anything that
  was already true last tick. RECENT COMMS are in the world summary — never echo or restate them.
- Pull the numbers (N unreached, % housed, carbon values) from the world summary — never invent them.

BUDGET: At most 8 actions per tick. Keep every rationale under 12 words.
- Output ONLY the JSON object, no markdown, no explanation.`

export async function planningCall(context: PlanningContext): Promise<AgentPlanResponse | null> {
  // Opt-in gate: no key or VITE_USE_LLM!=='true' → never spend, just use the fallback.
  if (!LLM_ENABLED) return null

  // Session budget auto-stop (resets on reload). Best-effort, not a hard cap — see note above.
  if (sessionSpendUsd >= SESSION_BUDGET_USD) {
    if (!budgetTripped) {
      console.warn(
        `[AI] session LLM budget of $${SESSION_BUDGET_USD} reached — using fallback for the rest of this session (reload the page to reset).`,
      )
      budgetTripped = true
    }
    return null
  }

  const userContent = context.humanCommand
    ? `HUMAN OVERRIDE: "${context.humanCommand}"\n\n${context.worldSummary}`
    : context.worldSummary

  try {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,   // a full multi-agent plan (actions + rationales + narration) exceeds 600 and truncates → unparseable JSON
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })

    // Account real usage against the session budget.
    const usage = response.usage
    sessionSpendUsd +=
      (usage.input_tokens / 1_000_000) * SONNET_USD_PER_MTOK_IN +
      (usage.output_tokens / 1_000_000) * SONNET_USD_PER_MTOK_OUT

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(extractJson(text))
    // Guard the shape: a valid-JSON-but-wrong-structure response (e.g. missing actions)
    // would otherwise crash the sim loop at plan.actions.forEach. Fall back instead.
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.actions)) {
      console.warn('[AI] response missing actions[], using fallback')
      return null
    }
    return parsed as AgentPlanResponse
  } catch (err) {
    console.warn('[AI] planning call failed, using fallback', err)
    return null
  }
}

// Sonnet often wraps JSON in ```json fences or adds a sentence of prose despite the
// system prompt. Strip fences, then fall back to the outermost { ... } block so
// JSON.parse never chokes on the wrapper (which would silently force the fallback).
function extractJson(text: string): string {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first !== -1 && last > first) t = t.slice(first, last + 1)
  return t
}

// Phase 5: after-action debrief. Plain prose, NOT the JSON planning format — so it
// uses its own system prompt rather than SYSTEM_PROMPT (which caps output to a headline).
// Respects the same LLM_ENABLED gate as planningCall so non-LLM mode uses the
// deterministic assessmentText() fallback without spending a single API token.
export async function debriefCall(worldSummary: string): Promise<string | null> {
  if (!LLM_ENABLED) return null
  try {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 320,
      system:
        'You are the AI Commander of "Haven" delivering a mission after-action debrief to human reviewers. ' +
        'Write 2-3 sentences of plain prose (no bullet points, no JSON, no markdown). Be specific with numbers. ' +
        'Cover: (1) how many families were housed and whether the most vulnerable went first, ' +
        '(2) carbon avoided vs a conventional rebuild, as a percentage, ' +
        '(3) the single decision that most changed the outcome.',
      messages: [{ role: 'user', content: `Final mission state:\n\n${worldSummary}` }],
    })
    return response.content[0]?.type === 'text' ? response.content[0].text.trim() : null
  } catch (err) {
    console.warn('[AI] debrief call failed', err)
    return null
  }
}
