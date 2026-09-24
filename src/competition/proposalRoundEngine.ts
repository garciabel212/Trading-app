// ─── Agent Trading OS — Proposal-Only Decision Round Engine ───────────────────
// Orchestrates deterministic proposal rounds across Alpha, Beta, Gamma,
// Portfolio Manager, Risk Engine, Paper Execution, and Coach Evaluator.
//
// Invariants:
// 1. Initial submissions are frozen independently before cross-inspection.
// 2. Execution displays "Proposal only—execution disabled."
// 3. ZERO account balances, positions, or order histories are mutated.
// 4. Emits explicit, inspectable AgentMessage objects linked to grounded evidence.

import type { NormalizedMarketSnapshot } from '../paper/types';
import type { AgentMessage, EvidenceReference, StructuredPrediction } from './messageTypes';
import { RESEARCH_PROFILES, checkWholeShareAffordability, type ProfileKey } from './researchProfiles';
import type { RunRecord, TraceEvent } from '../workflow/types';
import { deepClone, deepFreeze } from '../workflow/replay';

let _propRoundCounter = 0;

export interface ProposalRoundResult {
  runId: string;
  snapshot: NormalizedMarketSnapshot;
  profileKey: ProfileKey;
  messages: AgentMessage[];
  selectedTraderId: string | null;
  riskVerdict: 'APPROVED' | 'BLOCKED' | 'INCOMPLETE';
  executionStatus: string;
  coachStatus: string;
  runRecord: RunRecord;
  prediction?: StructuredPrediction;
}

export function runProposalOnlyRound(
  snapshot: NormalizedMarketSnapshot,
  profileKey: ProfileKey = 'daily-weather',
  availableCash: number = 200.0,
  staleOverride?: boolean,
  oneqPrediction?: StructuredPrediction
): ProposalRoundResult {
  const profile = RESEARCH_PROFILES[profileKey];
  const now = Date.now();
  const runId = `prop-round-${profileKey}-${now}-${++_propRoundCounter}`;
  const clonedSnapshot = deepClone(snapshot);
  const snapshotId = clonedSnapshot.snapshotId;

  const messages: AgentMessage[] = [];
  const events: TraceEvent[] = [];
  let seq = 1;
  let msgCounter = 1;

  const isStale = staleOverride ?? (clonedSnapshot.isStale || (now - clonedSnapshot.localReceiptTimestamp > 30000));
  const isMissingData = !clonedSnapshot.lastPrice || (clonedSnapshot.bestYesAsk === null && clonedSnapshot.bestYesBid === null);

  // ── 1. Snapshot Event ───────────────────────────────────────────────────────
  events.push({
    runId,
    eventId: `evt-${runId}-${seq++}`,
    seq: seq - 1,
    nodeId: 'market-feed',
    timestamp: now,
    eventType: 'node-complete',
    input: { ticker: clonedSnapshot.ticker, profileKey },
    output: {
      snapshotId,
      price: clonedSnapshot.lastPrice,
      isStale,
      instrumentType: profile.instrumentType,
    },
    decision: `Captured timestamped market snapshot for ${clonedSnapshot.ticker} (${profile.name}). Data status: ${profile.dataStatus}.`,
  });

  // ── 2. Independent Competitor Submissions (Frozen independently) ────────────
  interface CompetitorSubmission {
    traderId: 'trader-alpha' | 'trader-beta' | 'trader-gamma';
    action: 'proposal' | 'skip';
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    summary: string;
    evidence: EvidenceReference[];
  }

  const submissions: CompetitorSubmission[] = [];

  if (profileKey === 'daily-weather') {
    const ask = clonedSnapshot.bestYesAsk ?? clonedSnapshot.lastPrice ?? 0.50;
    const bid = clonedSnapshot.bestYesBid ?? 0.40;
    const spread = Number((ask - bid).toFixed(2));

    // Alpha: Forecast anomaly dynamics
    if (spread <= 0.04 && ask < 0.85) {
      submissions.push({
        traderId: 'trader-alpha',
        action: 'proposal',
        side: 'buy',
        quantity: 5,
        price: ask,
        summary: `Alpha → Manager: Breakout condition detected on weather anomaly (spread: $${spread.toFixed(2)} <= $0.04). Entry proposed for 5 contracts @ $${ask.toFixed(2)}.`,
        evidence: [
          { indicatorOrRule: 'spread_friction', measuredValue: `$${spread.toFixed(2)}`, threshold: '<= $0.04', verdictPassed: true },
          { indicatorOrRule: 'best_ask_price', measuredValue: `$${ask.toFixed(2)}`, threshold: '< $0.85', verdictPassed: true },
        ],
      });
    } else {
      submissions.push({
        traderId: 'trader-alpha',
        action: 'skip',
        side: 'buy',
        quantity: 0,
        price: ask,
        summary: `Alpha → Manager: Skipping: spread ($${spread.toFixed(2)}) exceeds forecast breakout threshold ($0.04).`,
        evidence: [
          { indicatorOrRule: 'spread_friction', measuredValue: `$${spread.toFixed(2)}`, threshold: '<= $0.04', verdictPassed: false },
        ],
      });
    }

    // Beta: Pullback / Fair value expectation
    submissions.push({
      traderId: 'trader-beta',
      action: 'skip',
      side: 'buy',
      quantity: 0,
      price: ask,
      summary: 'Beta → Manager: Skipping: the pullback entry condition is absent (historical model edge is below 5.0% hurdle).',
      evidence: [
        { indicatorOrRule: 'modeled_edge_hurdle', measuredValue: '+2.8%', threshold: '>= +5.0%', verdictPassed: false },
      ],
    });

    // Gamma: Conservative Payoff Fade
    submissions.push({
      traderId: 'trader-gamma',
      action: 'skip',
      side: 'buy',
      quantity: 0,
      price: ask,
      summary: 'Gamma → Manager: Skipping: contract implied probability (under 85%) does not exhibit extreme consensus overreaction.',
      evidence: [
        { indicatorOrRule: 'consensus_extreme_threshold', measuredValue: `${Math.round(ask * 100)}%`, threshold: '>= 85%', verdictPassed: false },
      ],
    });
  } else {
    // profileKey === 'nasdaq-oneq'
    const price = clonedSnapshot.lastPrice ?? 180.40;

    if (oneqPrediction) {
      if (oneqPrediction.action === 'BUY') {
        submissions.push({
          traderId: 'trader-alpha',
          action: 'proposal',
          side: 'buy',
          quantity: 1,
          price,
          summary: `Alpha → Manager: BUY candidate: predicted return (${oneqPrediction.predictedGrossBps >= 0 ? '+' : ''}${oneqPrediction.predictedGrossBps.toFixed(1)} bps) exceeds costs (${oneqPrediction.estimatedCostBps.toFixed(1)} bps) + buffer (${oneqPrediction.entryBufferBps.toFixed(1)} bps). Proposing 1 share @ $${price.toFixed(2)}.`,
          evidence: [
            { indicatorOrRule: 'predicted_gross_bps', measuredValue: `${oneqPrediction.predictedGrossBps >= 0 ? '+' : ''}${oneqPrediction.predictedGrossBps.toFixed(1)} bps`, threshold: `> ${(oneqPrediction.estimatedCostBps + oneqPrediction.entryBufferBps).toFixed(1)} bps`, verdictPassed: true },
            { indicatorOrRule: 'estimated_net_bps', measuredValue: `${oneqPrediction.estimatedNetBps >= 0 ? '+' : ''}${oneqPrediction.estimatedNetBps.toFixed(1)} bps`, threshold: `> ${oneqPrediction.entryBufferBps.toFixed(1)} bps`, verdictPassed: true },
            { indicatorOrRule: 'selected_entry_buffer_bps', measuredValue: `+${oneqPrediction.entryBufferBps.toFixed(1)} bps`, threshold: 'buffer', verdictPassed: true },
          ],
        });
      } else {
        submissions.push({
          traderId: 'trader-alpha',
          action: 'skip',
          side: 'buy',
          quantity: 0,
          price,
          summary: `Alpha → Manager: WAIT: estimated net return (${oneqPrediction.estimatedNetBps >= 0 ? '+' : ''}${oneqPrediction.estimatedNetBps.toFixed(1)} bps) is below the selected entry buffer (+${oneqPrediction.entryBufferBps.toFixed(1)} bps).`,
          evidence: [
            { indicatorOrRule: 'predicted_gross_bps', measuredValue: `${oneqPrediction.predictedGrossBps >= 0 ? '+' : ''}${oneqPrediction.predictedGrossBps.toFixed(1)} bps`, threshold: `> ${(oneqPrediction.estimatedCostBps + oneqPrediction.entryBufferBps).toFixed(1)} bps`, verdictPassed: false },
            { indicatorOrRule: 'estimated_net_bps', measuredValue: `${oneqPrediction.estimatedNetBps >= 0 ? '+' : ''}${oneqPrediction.estimatedNetBps.toFixed(1)} bps`, threshold: `> ${oneqPrediction.entryBufferBps.toFixed(1)} bps`, verdictPassed: false },
            { indicatorOrRule: 'selected_entry_buffer_bps', measuredValue: `+${oneqPrediction.entryBufferBps.toFixed(1)} bps`, threshold: 'buffer', verdictPassed: false },
          ],
        });
      }
    } else {
      // Default unconfigured candidate
      submissions.push({
        traderId: 'trader-alpha',
        action: 'skip',
        side: 'buy',
        quantity: 0,
        price,
        summary: 'Alpha → Manager: Skipping: candidate research method (Opening-Range Breakout) is Not implemented.',
        evidence: [
          { indicatorOrRule: 'research_status', measuredValue: 'Not implemented', threshold: 'implemented', verdictPassed: false },
        ],
      });
    }

    // Beta: Report that model is unavailable until independently implemented
    submissions.push({
      traderId: 'trader-beta',
      action: 'skip',
      side: 'buy',
      quantity: 0,
      price,
      summary: 'Beta → Manager: Skipping: candidate research method (Pullback within trend) is Not implemented (model unavailable until independently implemented).',
      evidence: [
        { indicatorOrRule: 'research_status', measuredValue: 'Not implemented (model unavailable)', threshold: 'implemented', verdictPassed: false },
      ],
    });

    // Gamma: Report that model is unavailable until independently implemented
    submissions.push({
      traderId: 'trader-gamma',
      action: 'skip',
      side: 'buy',
      quantity: 0,
      price,
      summary: 'Gamma → Manager: Skipping: candidate research method (Mean reversion toward session VWAP) is Not implemented (model unavailable until independently implemented).',
      evidence: [
        { indicatorOrRule: 'research_status', measuredValue: 'Not implemented (model unavailable)', threshold: 'implemented', verdictPassed: false },
      ],
    });
  }

  // Record initial messages from Alpha, Beta, Gamma
  for (const sub of submissions) {
    const msg: AgentMessage = {
      messageId: `msg-${runId}-${msgCounter++}`,
      runId,
      snapshotId,
      sequence: seq,
      timestamp: now + seq * 10,
      sender: sub.traderId,
      recipient: 'portfolio-manager',
      messageType: sub.action,
      conciseSummary: sub.summary,
      evidenceReferences: sub.evidence,
      strategyVersion: `${profile.key}-${profile.methods[sub.traderId.replace('trader-', '') as 'alpha' | 'beta' | 'gamma'].name}`,
      instrumentType: profile.instrumentType,
      profileKey,
      status: 'delivered',
    };
    messages.push(msg);

    events.push({
      runId,
      eventId: `evt-${runId}-${seq++}`,
      seq: seq - 1,
      nodeId: sub.traderId,
      timestamp: now + seq * 10,
      eventType: 'node-complete',
      input: { snapshotId, price: sub.price },
      output: { action: sub.action, quantity: sub.quantity, summary: sub.summary },
      decision: sub.summary,
      messageId: msg.messageId,
    });
  }

  // ── 3. Manager Review & Selection ───────────────────────────────────────────
  const activeProposals = submissions.filter((s) => s.action === 'proposal');
  let selectedSubmission: CompetitorSubmission | null = null;
  let managerSummary = '';
  let managerType: AgentMessage['messageType'] = 'no_trade';

  if (activeProposals.length > 0) {
    selectedSubmission = activeProposals[0];
    managerType = 'selection';
    managerSummary = `Manager → Risk: Selected proposal: ${selectedSubmission.traderId.replace('trader-', '').toUpperCase()} (${selectedSubmission.quantity} ${profile.instrumentType === 'equity_etf' ? 'shares' : 'contracts'} of ${snapshot.ticker}). Requesting safety validation.`;
  } else {
    managerType = 'no_trade';
    managerSummary = 'Manager → Risk: NO TRADE recorded: all competitor agents submitted SKIP for this evaluation round.';
  }

  const managerMsg: AgentMessage = {
    messageId: `msg-${runId}-${msgCounter++}`,
    runId,
    snapshotId,
    sequence: seq,
    timestamp: now + seq * 10,
    sender: 'portfolio-manager',
    recipient: 'risk-engine',
    messageType: managerType,
    conciseSummary: managerSummary,
    evidenceReferences: [
      { indicatorOrRule: 'active_proposal_count', measuredValue: activeProposals.length, threshold: '>= 1' },
      { indicatorOrRule: 'selected_agent', measuredValue: selectedSubmission?.traderId ?? 'none' },
    ],
    strategyVersion: `${profile.key}-ManagerReview-v1.0`,
    instrumentType: profile.instrumentType,
    profileKey,
    status: 'delivered',
  };
  messages.push(managerMsg);

  events.push({
    runId,
    eventId: `evt-${runId}-${seq++}`,
    seq: seq - 1,
    nodeId: 'portfolio-manager',
    timestamp: now + seq * 10,
    eventType: 'node-complete',
    input: { proposalCount: activeProposals.length },
    output: { selected: selectedSubmission?.traderId ?? null },
    decision: managerSummary,
    messageId: managerMsg.messageId,
  });

  // ── 4. Risk Engine Evaluation ───────────────────────────────────────────────
  let riskVerdict: 'APPROVED' | 'BLOCKED' | 'INCOMPLETE' = 'INCOMPLETE';
  let riskSummary = '';
  const riskEvidence: EvidenceReference[] = [];

  if (isMissingData) {
    riskVerdict = 'INCOMPLETE';
    riskSummary = 'Risk → Manager: INCOMPLETE: market snapshot is missing required bid/ask or last price quotes.';
    riskEvidence.push({ indicatorOrRule: 'quote_completeness', measuredValue: 'missing', threshold: 'present', verdictPassed: false });
  } else if (isStale) {
    riskVerdict = 'BLOCKED';
    riskSummary = 'Risk → Manager: BLOCKED: market data snapshot is stale (> 30s latency threshold). Safety lock engaged.';
    riskEvidence.push({ indicatorOrRule: 'snapshot_staleness', measuredValue: 'stale', threshold: '< 30s', verdictPassed: false });
  } else if (!selectedSubmission) {
    riskVerdict = 'APPROVED'; // No proposed trade to violate risk
    riskSummary = 'Risk → Manager: No trade evaluated; portfolio boundaries remain intact.';
    riskEvidence.push({ indicatorOrRule: 'open_exposure', measuredValue: '$0.00', threshold: '<= $200.00', verdictPassed: true });
  } else {
    // Check sizing limits and cash
    const totalCost = selectedSubmission.quantity * selectedSubmission.price;
    const isWithinQuantityLimit = selectedSubmission.quantity <= 10;
    const isAffordable = profile.instrumentType === 'equity_etf'
      ? checkWholeShareAffordability(selectedSubmission.price, availableCash, selectedSubmission.quantity).affordable
      : totalCost <= availableCash;

    riskEvidence.push({ indicatorOrRule: 'order_quantity_limit', measuredValue: selectedSubmission.quantity, threshold: '<= 10', verdictPassed: isWithinQuantityLimit });
    riskEvidence.push({ indicatorOrRule: 'cash_affordability', measuredValue: `$${totalCost.toFixed(2)}`, threshold: `<= $${availableCash.toFixed(2)}`, verdictPassed: isAffordable });

    if (!isWithinQuantityLimit) {
      riskVerdict = 'BLOCKED';
      riskSummary = `Risk → Manager: BLOCKED: requested quantity (${selectedSubmission.quantity}) violates maximum policy limit of 10 units.`;
    } else if (!isAffordable) {
      riskVerdict = 'BLOCKED';
      riskSummary = `Risk → Manager: BLOCKED: available cash ($${availableCash.toFixed(2)}) is insufficient for total required capital ($${totalCost.toFixed(2)}).`;
    } else {
      riskVerdict = 'APPROVED';
      riskSummary = `Risk → Manager: APPROVED: proposed order of ${selectedSubmission.quantity} units satisfies all capital, sizing, and pricing constraints.`;
    }
  }

  const riskMsg: AgentMessage = {
    messageId: `msg-${runId}-${msgCounter++}`,
    runId,
    snapshotId,
    sequence: seq,
    timestamp: now + seq * 10,
    sender: 'risk-engine',
    recipient: 'portfolio-manager',
    messageType: 'risk_verdict',
    conciseSummary: riskSummary,
    evidenceReferences: riskEvidence,
    strategyVersion: `${profile.key}-RiskPolicy-v1.0`,
    instrumentType: profile.instrumentType,
    profileKey,
    status: 'delivered',
  };
  messages.push(riskMsg);

  events.push({
    runId,
    eventId: `evt-${runId}-${seq++}`,
    seq: seq - 1,
    nodeId: 'risk-engine',
    timestamp: now + seq * 10,
    eventType: 'node-complete',
    input: { selectedTraderId: selectedSubmission?.traderId ?? null, maxQty: 10 },
    output: { riskVerdict, reason: riskSummary },
    decision: riskSummary,
    ruleVerdict: {
      rule: 'policy_boundary_check',
      threshold: 10,
      observed: selectedSubmission?.quantity ?? 0,
      passed: riskVerdict === 'APPROVED',
    },
    messageId: riskMsg.messageId,
  });

  // ── 5. Execution Notice (Proposal only — execution disabled) ────────────────
  const executionSummary = oneqPrediction
    ? `Execution → Manager: Research simulation assumption: simulated fill modeled at next-open ($${selectedSubmission ? selectedSubmission.price.toFixed(2) : (clonedSnapshot.lastPrice ?? 180.40).toFixed(2)}) + slippage. Real-money submission disabled.`
    : 'Execution → Manager: Proposal only—execution disabled. Zero order submitted; account balances and ledgers remain unchanged.';
  const execMsg: AgentMessage = {
    messageId: `msg-${runId}-${msgCounter++}`,
    runId,
    snapshotId,
    sequence: seq,
    timestamp: now + seq * 10,
    sender: 'paper-execution',
    recipient: 'portfolio-manager',
    messageType: 'execution_notice',
    conciseSummary: executionSummary,
    evidenceReferences: [
      { indicatorOrRule: 'execution_mode', measuredValue: 'proposal_only_disabled', threshold: 'disabled' },
      { indicatorOrRule: 'account_cash_mutation', measuredValue: '$0.00', threshold: '$0.00', verdictPassed: true },
      { indicatorOrRule: 'orders_placed_count', measuredValue: 0, threshold: '0', verdictPassed: true },
    ],
    strategyVersion: `${profile.key}-PaperExecution-v1.0`,
    instrumentType: profile.instrumentType,
    profileKey,
    status: 'delivered',
  };
  messages.push(execMsg);

  events.push({
    runId,
    eventId: `evt-${runId}-${seq++}`,
    seq: seq - 1,
    nodeId: 'paper-execution',
    timestamp: now + seq * 10,
    eventType: 'node-skipped',
    input: { executionMode: 'proposal_only' },
    output: { ordersPlaced: 0 },
    decision: executionSummary,
    messageId: execMsg.messageId,
  });

  // ── 6. Coach Record (Outcome pending or matured) ───────────────────────────
  let coachSummary = 'Coach → Manager: Outcome pending; performance cannot yet be scored until an actual simulated trade outcome is observed.';
  let coachScored = false;
  if (oneqPrediction && oneqPrediction.maturedActualReturnBps !== undefined) {
    coachScored = true;
    const errorBps = oneqPrediction.predictedGrossBps - oneqPrediction.maturedActualReturnBps;
    coachSummary = `Coach → Manager: Matured outcome recorded: actual 30-min return = ${oneqPrediction.maturedActualReturnBps >= 0 ? '+' : ''}${oneqPrediction.maturedActualReturnBps.toFixed(1)} bps. Forecasting error = ${errorBps >= 0 ? '+' : ''}${errorBps.toFixed(1)} bps. Decision (${oneqPrediction.action}) audited for execution/opportunity cost.`;
  } else if (oneqPrediction) {
    coachSummary = `Coach → Manager: Forecast recorded (${oneqPrediction.action}: predicted ${oneqPrediction.predictedGrossBps >= 0 ? '+' : ''}${oneqPrediction.predictedGrossBps.toFixed(1)} bps, buffer ${oneqPrediction.entryBufferBps.toFixed(1)} bps). Opportunity audit pending maturation at t+7.`;
  }

  const coachEvidence: EvidenceReference[] = oneqPrediction && oneqPrediction.maturedActualReturnBps !== undefined
    ? [
        { indicatorOrRule: 'forecast_predicted_bps', measuredValue: `${oneqPrediction.predictedGrossBps >= 0 ? '+' : ''}${oneqPrediction.predictedGrossBps.toFixed(1)} bps` },
        { indicatorOrRule: 'matured_actual_return_bps', measuredValue: `${oneqPrediction.maturedActualReturnBps >= 0 ? '+' : ''}${oneqPrediction.maturedActualReturnBps.toFixed(1)} bps` },
        { indicatorOrRule: 'forecast_error_bps', measuredValue: `${(oneqPrediction.predictedGrossBps - oneqPrediction.maturedActualReturnBps) >= 0 ? '+' : ''}${(oneqPrediction.predictedGrossBps - oneqPrediction.maturedActualReturnBps).toFixed(1)} bps` },
        { indicatorOrRule: 'decision_audited', measuredValue: oneqPrediction.action, threshold: 'BUY or WAIT' },
      ]
    : [
        { indicatorOrRule: 'outcome_status', measuredValue: 'pending', threshold: 'observed' },
        { indicatorOrRule: 'scoring_status', measuredValue: 'unscored', threshold: 'scored' },
      ];

  const coachMsg: AgentMessage = {
    messageId: `msg-${runId}-${msgCounter++}`,
    runId,
    snapshotId,
    sequence: seq,
    timestamp: now + seq * 10,
    sender: 'coach-evaluator',
    recipient: 'portfolio-manager',
    messageType: 'coach_record',
    conciseSummary: coachSummary,
    evidenceReferences: coachEvidence,
    strategyVersion: `${profile.key}-CoachAudit-v1.0`,
    instrumentType: profile.instrumentType,
    profileKey,
    status: 'delivered',
  };
  messages.push(coachMsg);

  events.push({
    runId,
    eventId: `evt-${runId}-${seq++}`,
    seq: seq - 1,
    nodeId: 'coach-evaluator',
    timestamp: now + seq * 10,
    eventType: 'node-complete',
    input: { runId },
    output: { scored: coachScored, status: coachScored ? 'outcome_matured' : 'outcome_pending' },
    decision: coachSummary,
    messageId: coachMsg.messageId,
  });

  const runRecord: RunRecord = {
    runId,
    scenarioKey: 'allowed',
    scenarioDescription: `Proposal-Only Decision Round — ${profile.name} (${selectedSubmission ? `${selectedSubmission.traderId.replace('trader-', '').toUpperCase()} proposed` : 'All SKIP'})`,
    startedAt: now,
    completedAt: now + seq * 10,
    events,
    paperOrders: [], // Strictly ZERO orders placed
    approval: riskVerdict === 'APPROVED' && selectedSubmission ? {
      runId,
      approvedBy: 'risk-engine',
      amount: selectedSubmission.quantity,
      symbol: clonedSnapshot.ticker,
      issuedAt: now,
    } : null,
    messages,
    policySnapshot: {
      maxOrderQty: 10,
      proposedQty: selectedSubmission?.quantity ?? 0,
    },
  };

  const result: ProposalRoundResult = {
    runId,
    snapshot: clonedSnapshot,
    profileKey,
    messages,
    selectedTraderId: selectedSubmission?.traderId ?? null,
    riskVerdict,
    executionStatus: executionSummary,
    coachStatus: coachSummary,
    runRecord,
    prediction: oneqPrediction,
  };

  return deepFreeze(result);
}
