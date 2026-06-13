# STATUS — AI Brain Lead
*Written by Planning Agent after each phase. Read by Execution Agent at start of each phase.*

## Phases Completed
_(none yet)_

## Key Architectural Decisions
- Model: claude-sonnet-4-6 (cost/speed), upgrade to opus only if narration quality is poor
- Non-streaming, synchronous JSON response (simpler, good enough for 3s tick)
- One LLM call per Commander tick (specialist agents are sections in one prompt, not separate calls)
- Fallback policy in fallback.ts runs deterministically when API is slow or fails

## Files Created / Modified
_(none yet)_

## Unresolved Questions
- Will need VITE_ANTHROPIC_API_KEY in .env (coordinate with Integration lead)

## What Phase 2 Execution Agent Should Know
- Phase 1 output: working planningCall(), serializer that produces ≤600 token context, fallback.ts
- Phase 2 builds Commander.ts on top of these — the perceive→reason→act loop, re-plan triggers
- The LLM system prompt is in client.ts — read it carefully before adding specialist agents
