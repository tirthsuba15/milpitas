// Pre-computed "conventional rebuild" baseline for the AI-vs-baseline counterfactual panel.
// Hardcoded per the demo run-of-show: a conventional 6-home rebuild with all-imported materials
// and no triage prioritization. The "Haven" column is read live from world.score / world.carbon;
// this is the fixed thing to compare against.
//
// carbonKgCo2e is kept in sync with WorldState.carbon.baselineKgCo2e (45,000) — see the
// consistency test in counterfactual.test.ts.
export const COUNTERFACTUAL_BASELINE = {
  familiesHoused: 3,
  familiesTotal: 6,
  vulnerableHousedPct: 0,
  carbonKgCo2e: 45_000,
  hours: 6,
} as const
