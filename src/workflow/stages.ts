// ─── Agent Trading OS — Pipeline Stages ──────────────────────────────────────
// Pure functions. No side effects, no timers, no randomness.
// Each function consumes typed input and returns typed output.
// The runner composes them and emits TraceEvents.

import type {
  MarketFeedOutput,
  AnalystOutput,
  Signal,
  StrategyOutput,
  RiskOutput,
  Approval,
  ExecutionOutput,
  EvaluationOutput,
  EvaluationCheck,
  RunRecord,
} from './types';
import type { MockExecutionAdapter } from './adapter';
import { MAX_ORDER_QTY } from './scenarios';
import type {
  SkillExecutionOutput,
  MemoryQueryOutput,
  TradingAgentProfile,
} from '../agents/types';
import type { NormalizedMarketSnapshot } from '../paper/types';

// ── Stage 1: Market Feed ──────────────────────────────────────────────────────

export function runMarketFeed(liveSnapshot?: NormalizedMarketSnapshot): MarketFeedOutput {
  if (liveSnapshot) {
    const depthCount =
      (liveSnapshot.depth?.yesBids?.length ?? 0) +
      (liveSnapshot.depth?.noBids?.length ?? 0);
    return {
      symbols: [liveSnapshot.ticker, 'AAPL', 'SPY'],
      tickCount: Math.max(1, depthCount),
      topSymbol: liveSnapshot.ticker,
    };
  }
  return {
    symbols: ['AAPL', 'TSLA', 'SPY', 'QQQ', 'MSFT'],
    tickCount: 847,
    topSymbol: 'AAPL',
  };
}

// ── Stage 1b: Analysis Skill ──────────────────────────────────────────────────

export function runAnalysisSkill(
  feed: MarketFeedOutput,
  skillId: string = 'kalshi-spread-analyzer',
  liveSnapshot?: NormalizedMarketSnapshot,
): SkillExecutionOutput {
  const isSpread = skillId === 'kalshi-spread-analyzer';
  if (liveSnapshot) {
    const spreadVal = liveSnapshot.spread ?? 0.03;
    const lastP = liveSnapshot.lastPrice ?? liveSnapshot.bestYesAsk ?? 0.5;
    const frictionPct = ((spreadVal / Math.max(0.01, lastP)) * 100).toFixed(1);
    return {
      skillId,
      skillName: isSpread ? 'Kalshi Spread Analyzer' : 'Momentum Trend Tracker',
      indicator: isSpread ? 'Spread-to-Price Ratio' : 'EMA Momentum',
      value: isSpread
        ? `${frictionPct}% (${spreadVal <= 0.05 ? 'tight spread' : 'wide spread friction'})`
        : '+0.74 (bullish)',
      summary: isSpread
        ? `Analyzed real-time orderbook depth for ${feed.topSymbol}: bid $${liveSnapshot.bestYesBid ?? '0.00'} / ask $${liveSnapshot.bestYesAsk ?? '0.00'}, spread evaluated at ${frictionPct}% friction.`
        : `Analyzed exponential momentum for ${feed.topSymbol}: directional strength score +0.74.`,
      timestamp: Date.now(),
    };
  }

  return {
    skillId,
    skillName: isSpread ? 'Kalshi Spread Analyzer' : 'Momentum Trend Tracker',
    indicator: isSpread ? 'Spread-to-Price Ratio' : 'EMA Momentum',
    value: isSpread ? '25.0% (wide spread friction)' : '+0.74 (bullish)',
    summary: isSpread
      ? `Analyzed orderbook depth for ${feed.topSymbol}: bid/ask spread ratio evaluated at 25.0% friction.`
      : `Analyzed exponential momentum for ${feed.topSymbol}: directional strength score +0.74.`,
    timestamp: Date.now(),
  };
}

// ── Stage 2: Market Analyst ───────────────────────────────────────────────────

export function runMarketAnalyst(
  feed: MarketFeedOutput,
  skill?: SkillExecutionOutput,
  liveSnapshot?: NormalizedMarketSnapshot,
): AnalystOutput {
  const topSymbol = feed.topSymbol;
  let direction: 'long' | 'short' | 'neutral' = 'long';
  let strength = 0.74;

  if (liveSnapshot) {
    const spread = liveSnapshot.spread ?? 0.05;
    strength = Math.max(0.2, Math.min(0.95, Math.round((1 - spread * 2) * 100) / 100));
    direction = (liveSnapshot.lastPrice ?? 0.5) >= 0.5 ? 'long' : 'short';
  }

  const signals: Signal[] = [
    { symbol: topSymbol, direction, strength, indicator: skill?.indicator ?? 'Spread & Orderbook' },
    { symbol: 'SPY',  direction: 'short',   strength: 0.41, indicator: 'RSI(14)' },
    { symbol: 'QQQ',  direction: 'neutral', strength: 0.18, indicator: 'MACD' },
  ];
  return { signals, topSignal: signals[0] };
}

// ── Stage 3: Strategy Agent ───────────────────────────────────────────────────
// Incorporates agent identity, configured parameters, and episodic memory precedents.

export function runStrategyAgent(
  analyst: AnalystOutput,
  proposedQty: number,
  symbol: string,
  agent?: TradingAgentProfile,
  memoryContext?: MemoryQueryOutput,
): StrategyOutput {
  const baseConfidence = agent
    ? agent.parameters.convictionThreshold
    : analyst.topSignal.strength;

  const adjustment = memoryContext?.convictionAdjustment ?? 0;
  const finalConfidence = Math.max(
    0.05,
    Math.min(0.99, Math.round((baseConfidence + adjustment) * 100) / 100),
  );

  let memoryInfluence: string | undefined;
  if (memoryContext && memoryContext.queriedCount > 0) {
    memoryInfluence = memoryContext.summary;
  }

  return {
    strategyName: agent ? `${agent.name} (${agent.strategyType})` : 'Momentum-v1',
    symbol,
    proposedQty,
    side: analyst.topSignal.direction === 'short' ? 'sell' : 'buy',
    confidenceScore: finalConfidence,
    agentId: agent?.id,
    convictionAdjustment: adjustment,
    memoryInfluence,
  };
}

// ── Stage 4: Risk Engine ──────────────────────────────────────────────────────
// Applies the max-order-size rule. Rejection is a successful enforcement —
// the engine's job is to stop out-of-bounds orders, not to approve everything.

export function runRiskEngine(
  strategy: StrategyOutput,
  runId: string,
  maxQty: number = MAX_ORDER_QTY,
): RiskOutput {
  const verdict = {
    rule: 'max-order-size',
    threshold: maxQty,
    observed: strategy.proposedQty,
    passed: strategy.proposedQty <= maxQty,
  };

  if (!verdict.passed) {
    return {
      approved: false,
      approval: null,
      verdict,
      reason: `Qty ${strategy.proposedQty} exceeds max ${maxQty} demo units. Order blocked.`,
    };
  }

  const approval: Approval = {
    runId,
    approvedBy: 'risk-engine',
    amount: strategy.proposedQty,
    symbol: strategy.symbol,
    issuedAt: Date.now(),
  };

  return {
    approved: true,
    approval,
    verdict,
    reason: `Qty ${strategy.proposedQty} within limit of ${maxQty}. Approval issued.`,
  };
}

// ── Stage 5: Paper Execution ──────────────────────────────────────────────────
// Requires a valid approval token. If absent, execution is skipped entirely.
// The adapter enforces additional checks (runId match, amount match).

export function runPaperExecution(
  strategy: StrategyOutput,
  risk: RiskOutput,
  adapter: MockExecutionAdapter,
  runId: string,
): ExecutionOutput {
  if (!risk.approved || !risk.approval) {
    return {
      order: null,
      reason: risk.reason,
      skipped: true,
    };
  }

  const order = adapter.submitOrder(risk.approval, strategy, runId);

  if (!order) {
    return {
      order: null,
      reason: 'Adapter rejected order (approval/runId/amount mismatch)',
      skipped: true,
    };
  }

  return {
    order,
    reason: `Paper order placed: ${order.orderId} — ${order.qty} ${order.symbol} ${order.side.toUpperCase()} [LOCAL SIMULATION]`,
    skipped: false,
  };
}

// ── Stage 6: Evaluation ───────────────────────────────────────────────────────
// Compares recorded behavior against explicitly stated expected outcomes.
// Does NOT display preset success messages based on scenario name alone —
// it reads the actual run record and verifies each property.

export function runEvaluation(record: RunRecord): EvaluationOutput {
  const checks: EvaluationCheck[] = [];

  // Check: did the risk verdict agree with whether an approval was issued?
  const riskEvent = record.events.find(
    (e) => e.nodeId === 'risk-engine' && e.eventType === 'node-complete',
  );
  const riskOutput = riskEvent?.output as Partial<RiskOutput> | undefined;
  const verdictPassed = riskOutput?.verdict?.passed ?? false;
  const approvalIssued = record.approval !== null;

  checks.push({
    description: 'Risk verdict matches approval token',
    expected: 'verdict.passed === (approval !== null)',
    observed: `verdict.passed=${verdictPassed}, approval=${approvalIssued ? 'present' : 'absent'}`,
    passed: verdictPassed === approvalIssued,
  });

  // Check: execution invocation count matches approval
  const executionEvent = record.events.find((e) => e.nodeId === 'paper-execution');
  const expectedOrderCount = approvalIssued ? 1 : 0;
  const actualOrderCount = record.paperOrders.length;

  checks.push({
    description: 'Paper order count matches expected',
    expected: `${expectedOrderCount} order(s)`,
    observed: `${actualOrderCount} order(s)`,
    passed: actualOrderCount === expectedOrderCount,
  });

  // Check: if risk blocked, execution was skipped (not errored)
  if (!verdictPassed) {
    const skipped = executionEvent?.eventType === 'node-skipped';
    checks.push({
      description: 'Blocked order → execution skipped (not errored)',
      expected: 'eventType = node-skipped',
      observed: `eventType = ${executionEvent?.eventType ?? 'absent'}`,
      passed: skipped,
    });
  }

  // Check: all workflow nodes emitted at least one event
  const workflowNodeIds = [
    'market-feed', 'market-analyst', 'strategy-agent', 'risk-engine', 'evaluation',
  ];
  const presentNodes = new Set(record.events.map((e) => e.nodeId));
  const allPresent = workflowNodeIds.every((id) => presentNodes.has(id));

  checks.push({
    description: 'All workflow nodes emitted events',
    expected: workflowNodeIds.join(', '),
    observed: workflowNodeIds.filter((id) => presentNodes.has(id)).join(', '),
    passed: allPresent,
  });

  // Check: Independent policy limit compliance
  // Checks the original proposal against policy limit independently of the reported
  // risk verdict and approval token. If an oversized proposal was somehow approved or
  // executed, this check fails even if those records agree with each other.
  const strategyEvent = record.events.find(
    (e) => e.nodeId === 'strategy-agent' && e.eventType === 'node-complete',
  );
  const strategyOutput = strategyEvent?.output as Partial<StrategyOutput> | undefined;
  const proposedQty =
    strategyOutput?.proposedQty ??
    (record.events.find((e) => e.nodeId === 'risk-engine')?.input as { proposedQty?: number } | undefined)?.proposedQty;
  const isOversized = proposedQty !== undefined && proposedQty > MAX_ORDER_QTY;
  const policyCompliant = isOversized
    ? !approvalIssued && actualOrderCount === 0
    : true;

  checks.push({
    description: 'Independent policy limit check',
    expected: isOversized
      ? `Proposed qty ${proposedQty} > ${MAX_ORDER_QTY}: must NOT be approved or executed`
      : `Proposed qty ${proposedQty ?? 'unknown'} <= ${MAX_ORDER_QTY}: compliant with policy`,
    observed: isOversized
      ? `approval=${approvalIssued ? 'issued (POLICY VIOLATION)' : 'withheld'}, orders=${actualOrderCount}`
      : `proposed=${proposedQty ?? 'unknown'}, limit=${MAX_ORDER_QTY}`,
    passed: policyCompliant,
  });

  const overallPassed = checks.every((c) => c.passed);

  const orderLine =
    actualOrderCount === 0
      ? 'No paper orders placed.'
      : `${actualOrderCount} paper order(s) recorded (LOCAL SIMULATION).`;

  const riskLine = verdictPassed
    ? 'Risk approved — order within size limit.'
    : 'Risk blocked — order size exceeded limit (rule enforced correctly).';

  return {
    checks,
    overallPassed,
    summary: `${riskLine} ${orderLine} ${overallPassed ? 'All checks passed.' : 'Some checks failed.'}`,
  };
}
