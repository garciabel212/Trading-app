// ─── Agent Trading OS — Workflow Types ───────────────────────────────────────
// These contracts define what stages consume, produce, and record.
// No React, no timers — pure data shapes.

// ── Primitive domain types ────────────────────────────────────────────────────

import type { NormalizedMarketSnapshot } from '../paper/types';

export type ScenarioKey = 'allowed' | 'blocked';

/** What the pipeline receives at its entry point */
export interface PipelineInput {
  /** Scenario identifier — carried through the whole run for traceability */
  scenarioKey: ScenarioKey;
  /** Human-readable description of this scenario */
  description: string;
  /** Ticker symbol to trade */
  symbol: string;
  /** Quantity proposed by Strategy Agent (set by scenario) */
  proposedQty: number;
  /** Genuine live snapshot if running on real-time market data */
  liveSnapshot?: NormalizedMarketSnapshot;
  /** Competitor trader ID if executed as part of the multi-agent competition */
  traderId?: string;
  /** Season ID if executed as part of an active season */
  seasonId?: string;
}

// ── Stage-level data ──────────────────────────────────────────────────────────

export interface MarketFeedOutput {
  symbols: string[];
  tickCount: number;
  topSymbol: string;
}

export interface Signal {
  symbol: string;
  direction: 'long' | 'short' | 'neutral';
  strength: number; // 0–1
  indicator: string;
}

export interface AnalystOutput {
  signals: Signal[];
  topSignal: Signal;
}

export interface StrategyOutput {
  strategyName: string;
  symbol: string;
  proposedQty: number;
  side: 'buy' | 'sell';
  confidenceScore: number;
  agentId?: string;
  convictionAdjustment?: number;
  memoryInfluence?: string;
}

/** Verdict from a named rule check */
export interface RuleVerdict {
  rule: string;       // e.g. "max-order-size"
  threshold: number;  // e.g. 10
  observed: number;   // e.g. 5 or 20
  /** true = rule was not violated; false = rule was violated */
  passed: boolean;
}

/** Structured local validation token issued by Risk Engine — required before local execution */
export interface Approval {
  runId: string;
  approvedBy: 'risk-engine';
  amount: number;
  symbol: string;
  issuedAt: number;
}

export interface RiskOutput {
  approved: boolean;
  approval: Approval | null;
  verdict: RuleVerdict;
  reason: string;
}

export interface MockOrder {
  orderId: string;
  runId: string;
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  /** Price is always 0 — paper only, no market data */
  price: 0;
  placedAt: number;
  note: string;
}

export interface ExecutionOutput {
  order: MockOrder | null;
  /** Explains why execution was skipped or succeeded */
  reason: string;
  skipped: boolean;
}

export interface EvaluationCheck {
  description: string;
  expected: string;
  observed: string;
  passed: boolean;
}

export interface EvaluationOutput {
  checks: EvaluationCheck[];
  /** true only when ALL checks pass */
  overallPassed: boolean;
  summary: string;
}

// ── Trace event ───────────────────────────────────────────────────────────────

export type TraceEventType =
  | 'node-start'
  | 'node-complete'
  | 'node-skipped'
  | 'node-error';

/**
 * Immutable record of what happened at one pipeline stage.
 * This is the source of truth for both the graph UI and the inspector.
 */
export interface TraceEvent {
  runId: string;
  eventId: string;
  seq: number;
  nodeId: string;
  timestamp: number;
  eventType: TraceEventType;
  /** What the stage actually received */
  input: Record<string, unknown>;
  /** What the stage actually produced (empty for start events) */
  output: Record<string, unknown>;
  /** Human-readable one-line summary of what this stage decided */
  decision: string;
  /** Present when the stage applied a named rule */
  ruleVerdict?: RuleVerdict;
  /** Present when eventType is 'node-skipped' or 'node-error' */
  skipReason?: string;
}

// ── Run record ────────────────────────────────────────────────────────────────

/** Complete record of one workflow run, built up as events are emitted */
export interface RunRecord {
  runId: string;
  scenarioKey: ScenarioKey;
  description: string;
  events: TraceEvent[];
  approval: Approval | null;
  paperOrders: MockOrder[];
  startedAt: number;
  completedAt: number | null;
  agentId?: string;
  agentName?: string;
  traderId?: string;
  seasonId?: string;
  episodicMemory?: unknown;
}

