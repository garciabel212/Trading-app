// ─── Agent Trading OS — Workflow Runner ──────────────────────────────────────
// Orchestrates pipeline stages, builds the RunRecord, and emits TraceEvents.
//
// Key invariant: the runner executes ALL stages synchronously and returns the
// complete RunRecord. Callers (the React hook) may then pace delivery to the
// UI using timers — but decisions are never determined by timer callbacks.

import type {
  PipelineInput,
  TraceEvent,
  RunRecord,
  ExecutionOutput,
} from './types';
import type { MockExecutionAdapter } from './adapter';
import {
  runMarketFeed,
  runAnalysisSkill,
  runMarketAnalyst,
  runStrategyAgent,
  runRiskEngine,
  runPaperExecution,
  runEvaluation,
} from './stages';
import { MAX_ORDER_QTY } from './scenarios';
import type {
  TradingAgentProfile,
  SkillExecutionOutput,
  MemoryQueryOutput,
} from '../agents/types';
import {
  queryRelevantMemories,
  buildEpisodicReflection,
  addEpisodicMemory,
} from '../agents/memoryStore';
import { updateAgentStats } from '../agents/agentRegistry';

// ── ID helpers ────────────────────────────────────────────────────────────────

let _runCounter = 0;
let _eventCounter = 0;

function newRunId(): string {
  return `run-${Date.now()}-${++_runCounter}`;
}

function newEventId(): string {
  return `evt-${Date.now()}-${++_eventCounter}`;
}

// ── Event builders ────────────────────────────────────────────────────────────

function startEvent(
  runId: string,
  seq: number,
  nodeId: string,
  input: Record<string, unknown>,
): TraceEvent {
  return {
    runId,
    eventId: newEventId(),
    seq,
    nodeId,
    timestamp: Date.now(),
    eventType: 'node-start',
    input,
    output: {},
    decision: `${nodeId} started`,
  };
}

function completeEvent(
  runId: string,
  seq: number,
  nodeId: string,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  decision: string,
  ruleVerdict?: TraceEvent['ruleVerdict'],
): TraceEvent {
  return {
    runId,
    eventId: newEventId(),
    seq,
    nodeId,
    timestamp: Date.now(),
    eventType: 'node-complete',
    input,
    output,
    decision,
    ruleVerdict,
  };
}

function skippedEvent(
  runId: string,
  seq: number,
  nodeId: string,
  input: Record<string, unknown>,
  skipReason: string,
): TraceEvent {
  return {
    runId,
    eventId: newEventId(),
    seq,
    nodeId,
    timestamp: Date.now(),
    eventType: 'node-skipped',
    input,
    output: {},
    decision: `${nodeId} skipped: ${skipReason}`,
    skipReason,
  };
}

// ── Main runner ───────────────────────────────────────────────────────────────

/**
 * Execute the full pipeline for a given scenario input.
 * Returns a complete RunRecord. No awaits, no timers.
 *
 * @param input       The scenario parameters
 * @param adapter     The execution adapter (fresh instance for tests, singleton for UI)
 * @param onEvent     Optional callback invoked synchronously for each event emitted
 * @param activeAgent Optional custom agent profile driving strategy, skills, and memory
 */
export function runWorkflow(
  input: PipelineInput,
  adapter: MockExecutionAdapter,
  onEvent?: (event: TraceEvent) => void,
  activeAgent?: TradingAgentProfile,
): RunRecord {
  const runId = newRunId();
  let seq = 0;

  const record: RunRecord = {
    runId,
    scenarioKey: input.scenarioKey,
    description: input.description,
    events: [],
    approval: null,
    paperOrders: [],
    startedAt: Date.now(),
    completedAt: null,
    agentId: activeAgent?.id,
    agentName: activeAgent?.name,
  };

  const emit = (event: TraceEvent) => {
    record.events.push(event);
    onEvent?.(event);
  };

  // ── Stage 1: Market Feed ────────────────────────────────────────────────────
  const feedInput = {};
  emit(startEvent(runId, seq++, 'market-feed', feedInput));
  const feedOutput = runMarketFeed();
  emit(completeEvent(
    runId, seq++, 'market-feed',
    feedInput,
    feedOutput as unknown as Record<string, unknown>,
    `Loaded ${feedOutput.tickCount} ticks across ${feedOutput.symbols.length} symbols. Top: ${feedOutput.topSymbol}.`,
  ));

  // ── Stage 1b: Analysis Skill (if active agent) ──────────────────────────────
  let skillOutput: SkillExecutionOutput | undefined;
  if (activeAgent) {
    const skillId = activeAgent.skills[0] ?? 'kalshi-spread-analyzer';
    const skillInput = { topSymbol: feedOutput.topSymbol, skillId };
    emit(startEvent(runId, seq++, 'analysis-skill', skillInput));
    skillOutput = runAnalysisSkill(feedOutput, skillId);
    emit(completeEvent(
      runId, seq++, 'analysis-skill',
      skillInput,
      skillOutput as unknown as Record<string, unknown>,
      skillOutput.summary,
    ));
  }

  // ── Stage 2: Market Analyst ─────────────────────────────────────────────────
  const analystInput = feedOutput as unknown as Record<string, unknown>;
  emit(startEvent(runId, seq++, 'market-analyst', analystInput));
  const analystOutput = runMarketAnalyst(feedOutput, skillOutput);
  emit(completeEvent(
    runId, seq++, 'market-analyst',
    analystInput,
    analystOutput as unknown as Record<string, unknown>,
    `Detected ${analystOutput.signals.length} signals. Top: ${analystOutput.topSignal.symbol} ${analystOutput.topSignal.direction} (strength ${analystOutput.topSignal.strength.toFixed(2)}).`,
  ));

  // ── Stage 2b: Memory Query (if active agent) ────────────────────────────────
  let memoryQuery: MemoryQueryOutput | undefined;
  if (activeAgent) {
    const memoryQueryInput = { agentId: activeAgent.id, symbol: input.symbol, spread: 0.03 };
    emit(startEvent(runId, seq++, 'agent-memory', memoryQueryInput));
    memoryQuery = queryRelevantMemories(activeAgent, input.symbol, 0.03);
    emit(completeEvent(
      runId, seq++, 'agent-memory',
      memoryQueryInput,
      memoryQuery as unknown as Record<string, unknown>,
      memoryQuery.summary,
    ));
  }

  // ── Stage 3: Strategy Agent ─────────────────────────────────────────────────
  const strategyInput: Record<string, unknown> = {
    topSignal: analystOutput.topSignal,
    proposedQty: input.proposedQty,
    symbol: input.symbol,
    agentId: activeAgent?.id,
    agentName: activeAgent?.name,
  };
  emit(startEvent(runId, seq++, 'strategy-agent', strategyInput));
  const strategyOutput = runStrategyAgent(
    analystOutput,
    input.proposedQty,
    input.symbol,
    activeAgent,
    memoryQuery,
  );
  emit(completeEvent(
    runId, seq++, 'strategy-agent',
    strategyInput,
    strategyOutput as unknown as Record<string, unknown>,
    `Strategy "${strategyOutput.strategyName}" → ${strategyOutput.side.toUpperCase()} ${strategyOutput.proposedQty} ${strategyOutput.symbol} (confidence ${strategyOutput.confidenceScore.toFixed(2)}).`,
  ));

  // ── Stage 4: Risk Engine ────────────────────────────────────────────────────
  const riskInput: Record<string, unknown> = {
    ...strategyOutput as unknown as Record<string, unknown>,
    maxQty: MAX_ORDER_QTY,
  };
  emit(startEvent(runId, seq++, 'risk-engine', riskInput));
  const riskOutput = runRiskEngine(strategyOutput, runId);
  record.approval = riskOutput.approval;
  emit(completeEvent(
    runId, seq++, 'risk-engine',
    riskInput,
    riskOutput as unknown as Record<string, unknown>,
    riskOutput.reason,
    riskOutput.verdict,
  ));

  // ── Stage 5: Paper Execution ────────────────────────────────────────────────
  const execInput: Record<string, unknown> = {
    strategy: strategyOutput as unknown as Record<string, unknown>,
    approvalPresent: riskOutput.approval !== null,
  };

  let execOutput: ExecutionOutput = { order: null, reason: riskOutput.reason, skipped: true };
  if (!riskOutput.approved) {
    // Risk blocked — execution is skipped (not errored)
    emit(skippedEvent(runId, seq++, 'paper-execution', execInput, riskOutput.reason));
  } else {
    emit(startEvent(runId, seq++, 'paper-execution', execInput));
    const realExec = runPaperExecution(strategyOutput, riskOutput, adapter, runId);
    execOutput = realExec;
    if (realExec.order) {
      record.paperOrders.push(realExec.order);
    }
    emit(completeEvent(
      runId, seq++, 'paper-execution',
      execInput,
      realExec as unknown as Record<string, unknown>,
      realExec.reason,
    ));
  }

  // ── Stage 6: Evaluation ─────────────────────────────────────────────────────
  const evalInput: Record<string, unknown> = {
    eventCount: record.events.length,
    paperOrderCount: record.paperOrders.length,
    scenarioKey: input.scenarioKey,
  };
  emit(startEvent(runId, seq++, 'evaluation', evalInput));
  const evalOutput = runEvaluation(record);
  emit(completeEvent(
    runId, seq++, 'evaluation',
    evalInput,
    evalOutput as unknown as Record<string, unknown>,
    evalOutput.summary,
  ));

  // ── Stage 6b: Memory Commit & Reflection (if active agent) ──────────────────
  if (activeAgent) {
    const memoryCommitInput = { action: 'commit-reflection', runId };
    emit(startEvent(runId, seq++, 'agent-memory', memoryCommitInput));
    const reflection = buildEpisodicReflection(
      activeAgent,
      runId,
      input.symbol,
      0.09,
      0.12,
      0.03,
      strategyOutput.proposedQty,
      strategyOutput.confidenceScore,
      riskOutput,
      execOutput,
      evalOutput,
    );
    addEpisodicMemory(reflection);
    record.episodicMemory = reflection;
    updateAgentStats(
      activeAgent.id,
      riskOutput.approved,
      (reflection.outcome.estimatedPnl ?? 0) >= 0,
      1,
    );
    emit(completeEvent(
      runId, seq++, 'agent-memory',
      memoryCommitInput,
      reflection as unknown as Record<string, unknown>,
      `Committed new reflection: ${reflection.learnedLesson}`,
    ));
  }

  record.completedAt = Date.now();
  return record;
}
