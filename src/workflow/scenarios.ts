// ─── Agent Trading OS — Scenarios ────────────────────────────────────────────
// Two concrete PipelineInput definitions for the two demo scenarios.
// These are the ONLY things that differ between runs — everything else is
// determined by the pipeline functions.

import type { PipelineInput, ScenarioKey } from './types';

/** Maximum number of demo units Risk Engine will approve (the rule threshold) */
export const MAX_ORDER_QTY = 10;

export const SCENARIOS: Record<ScenarioKey, PipelineInput> = {
  allowed: {
    scenarioKey: 'allowed',
    description: 'Proposed qty (5) is within the 10-unit limit → Risk approves',
    symbol: 'AAPL',
    proposedQty: 5,
  },
  blocked: {
    scenarioKey: 'blocked',
    description: 'Proposed qty (20) exceeds the 10-unit limit → Risk blocks',
    symbol: 'TSLA',
    proposedQty: 20,
  },
};
