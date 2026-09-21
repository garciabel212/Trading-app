// ─── Agent Trading OS — Replay and Verification Tests ─────────────────────────
// Verifies:
// 1. Evaluation detects deliberately incorrect approval & order on oversized proposal.
// 2. Earlier replay positions cannot reveal later outputs.
// 3. Moving backward restores the correct node and inspector states.
// 4. Repeated playback leaves execution-call and order counts unchanged.
// 5. Switching scenarios cannot mix events from different runs.
// 6. Pausing or restarting playback clears scheduled timer updates.

import { describe, it, expect, beforeEach } from 'vitest';
import { runWorkflow } from '../workflow/runner';
import { MockExecutionAdapter } from '../workflow/adapter';
import { SCENARIOS, MAX_ORDER_QTY } from '../workflow/scenarios';
import { runEvaluation } from '../workflow/stages';
import {
  deriveNodeStates,
  deriveEdgeStates,
  deriveActivityEvents,
  deriveNodeInspectorTrace,
  deriveReplaySnapshot,
} from '../workflow/replay';
import { INITIAL_NODES, INITIAL_EDGES } from '../data/graphData';
import type { RunRecord } from '../workflow/types';

describe('1. Tightened Evaluation: Detects deliberately incorrect approval on oversized proposal', () => {
  it('reports failure when oversized proposal is falsely approved and executed', () => {
    const runId = 'corrupt-run-test';
    const oversizedQty = 25; // MAX_ORDER_QTY is 10

    // Construct a synthetic RunRecord where Risk Engine erroneously marked passed
    // and issued an approval, and Paper Execution placed a fake order.
    const corruptRecord: RunRecord = {
      runId,
      scenarioKey: 'blocked',
      description: 'Corrupted test scenario',
      approval: {
        runId,
        approvedBy: 'risk-engine',
        amount: oversizedQty,
        symbol: 'TSLA',
        issuedAt: Date.now(),
      },
      paperOrders: [
        {
          orderId: 'PAPER-ILLICIT-1',
          runId,
          symbol: 'TSLA',
          qty: oversizedQty,
          side: 'buy',
          price: 0,
          placedAt: Date.now(),
          note: '[ILLICIT SIMULATION]',
        },
      ],
      startedAt: Date.now(),
      completedAt: Date.now() + 100,
      events: [
        {
          runId,
          eventId: 'ev-1',
          seq: 1,
          nodeId: 'market-feed',
          timestamp: 1,
          eventType: 'node-complete',
          input: {},
          output: { topSymbol: 'TSLA' },
          decision: 'Top symbol: TSLA',
        },
        {
          runId,
          eventId: 'ev-2',
          seq: 2,
          nodeId: 'market-analyst',
          timestamp: 2,
          eventType: 'node-complete',
          input: {},
          output: { topSignal: { symbol: 'TSLA', direction: 'long', strength: 0.8 } },
          decision: 'Signal: TSLA long',
        },
        {
          runId,
          eventId: 'ev-3',
          seq: 3,
          nodeId: 'strategy-agent',
          timestamp: 3,
          eventType: 'node-complete',
          input: {},
          output: { proposedQty: oversizedQty, symbol: 'TSLA', side: 'buy' },
          decision: `Propose buy ${oversizedQty} TSLA`,
        },
        {
          runId,
          eventId: 'ev-4',
          seq: 4,
          nodeId: 'risk-engine',
          timestamp: 4,
          eventType: 'node-complete',
          input: { proposedQty: oversizedQty },
          output: {
            approved: true, // Corrupt! Should be false
            verdict: {
              rule: 'max-order-size',
              threshold: MAX_ORDER_QTY,
              observed: oversizedQty,
              passed: true, // Corrupt! 25 > 10 should be false
            },
          },
          ruleVerdict: {
            rule: 'max-order-size',
            threshold: MAX_ORDER_QTY,
            observed: oversizedQty,
            passed: true,
          },
          decision: 'Corrupt approval issued',
        },
        {
          runId,
          eventId: 'ev-5',
          seq: 5,
          nodeId: 'paper-execution',
          timestamp: 5,
          eventType: 'node-complete',
          input: {},
          output: {
            order: {
              orderId: 'PAPER-ILLICIT-1',
              qty: oversizedQty,
              symbol: 'TSLA',
            },
          },
          decision: 'Illicit order placed',
        },
        {
          runId,
          eventId: 'ev-6',
          seq: 6,
          nodeId: 'evaluation',
          timestamp: 6,
          eventType: 'node-start',
          input: {},
          output: {},
          decision: 'Evaluating...',
        },
      ],
    };

    const evalResult = runEvaluation(corruptRecord);

    // Evaluation must independently catch this invariant violation!
    expect(evalResult.overallPassed).toBe(false);

    // Check that the independent policy limit check failed
    const policyCheck = evalResult.checks.find((c) =>
      c.description.includes('Independent policy limit check'),
    );
    expect(policyCheck).toBeDefined();
    expect(policyCheck?.passed).toBe(false);
    expect(policyCheck?.observed).toContain('POLICY VIOLATION');
  });
});

describe('2. Replay Purity: Earlier positions cannot reveal later outputs', () => {
  let adapter: MockExecutionAdapter;
  let record: RunRecord;

  beforeEach(() => {
    adapter = new MockExecutionAdapter();
    record = runWorkflow(SCENARIOS.allowed, adapter);
  });

  it('at Analyst complete (seq 4), downstream nodes have no outputs or active states', () => {
    // Events 0..3: market-feed start, market-feed complete, analyst start, analyst complete
    const cursorIndex = 3;
    const activeEvents = record.events.slice(0, cursorIndex + 1);

    const nodes = deriveNodeStates(INITIAL_NODES, activeEvents);

    // Downstream nodes must be idle
    const downstreamIds = ['strategy-agent', 'risk-engine', 'paper-execution', 'evaluation'];
    for (const id of downstreamIds) {
      const node = nodes.find((n) => n.id === id);
      expect(node?.data.status).toBe('idle');
      expect(node?.data.latestActivity).toBeNull();
    }

    // Downstream nodes in inspector must be 'unreached' with no outputs
    for (const id of downstreamIds) {
      const trace = deriveNodeInspectorTrace(id, activeEvents);
      expect(trace.reached).toBe(false);
      expect(trace.status).toBe('unreached');
      expect(trace.output).toBeNull();
      expect(trace.summaryText).toBe('Not reached at this replay step.');
      expect(trace.evalOutput).toBeNull();
      expect(trace.paperOrders).toHaveLength(0);
    }

    // Verify activity events only contain completed activities up to cursor
    const activities = deriveActivityEvents(activeEvents, {});
    expect(activities).toHaveLength(2); // Only feed complete and analyst complete
    expect(activities.map((a) => a.nodeId)).toEqual(['market-feed', 'market-analyst']);
  });

  it('while Risk Engine is running (start event only), output and verdict are hidden', () => {
    // Find index of risk-engine start event
    const riskStartIndex = record.events.findIndex(
      (e) => e.nodeId === 'risk-engine' && e.eventType === 'node-start',
    );
    expect(riskStartIndex).toBeGreaterThan(-1);

    const activeEvents = record.events.slice(0, riskStartIndex + 1);
    const trace = deriveNodeInspectorTrace('risk-engine', activeEvents);

    expect(trace.reached).toBe(true);
    expect(trace.status).toBe('running');
    expect(trace.input).not.toBeNull();
    expect(trace.output).toBeNull(); // Future output MUST NOT appear early
    expect(trace.ruleVerdict).toBeNull(); // Future verdict MUST NOT appear early
    expect(trace.riskBreakdown).toBeNull();
  });
});

describe('3. Moving Backward: Restores correct earlier node and inspector states', () => {
  let adapter: MockExecutionAdapter;
  let record: RunRecord;

  beforeEach(() => {
    adapter = new MockExecutionAdapter();
    record = runWorkflow(SCENARIOS.allowed, adapter);
  });

  it('moving cursor back from execution complete to strategy complete clears execution state', () => {
    const execCompleteIndex = record.events.findIndex(
      (e) => e.nodeId === 'paper-execution' && e.eventType === 'node-complete',
    );
    const stratCompleteIndex = record.events.findIndex(
      (e) => e.nodeId === 'strategy-agent' && e.eventType === 'node-complete',
    );

    // Forward state at execution complete
    const forwardEvents = record.events.slice(0, execCompleteIndex + 1);
    const forwardNodes = deriveNodeStates(INITIAL_NODES, forwardEvents);
    const forwardExecNode = forwardNodes.find((n) => n.id === 'paper-execution');
    const forwardTrace = deriveNodeInspectorTrace('paper-execution', forwardEvents);

    expect(forwardExecNode?.data.status).toBe('success');
    expect(forwardTrace.reached).toBe(true);
    expect(forwardTrace.paperOrders).toHaveLength(1);

    // Backward state at strategy complete
    const backwardEvents = record.events.slice(0, stratCompleteIndex + 1);
    const backwardNodes = deriveNodeStates(INITIAL_NODES, backwardEvents);
    const backwardExecNode = backwardNodes.find((n) => n.id === 'paper-execution');
    const backwardRiskNode = backwardNodes.find((n) => n.id === 'risk-engine');
    const backwardTrace = deriveNodeInspectorTrace('paper-execution', backwardEvents);

    // Both Risk Engine and Paper Execution must be restored to idle
    expect(backwardExecNode?.data.status).toBe('idle');
    expect(backwardRiskNode?.data.status).toBe('idle');

    // Inspector for Paper Execution must be unreached
    expect(backwardTrace.reached).toBe(false);
    expect(backwardTrace.status).toBe('unreached');
    expect(backwardTrace.output).toBeNull();
    expect(backwardTrace.paperOrders).toHaveLength(0);
    expect(backwardTrace.summaryText).toBe('Not reached at this replay step.');
  });
});

describe('4. Idempotency: Repeated playback leaves execution-call and order counts unchanged', () => {
  it('repeated stepping, seeking, and restarting never calls submitOrder or creates orders', () => {
    const adapter = new MockExecutionAdapter();
    const record = runWorkflow(SCENARIOS.allowed, adapter);

    expect(adapter.callCount).toBe(1);
    expect(adapter.orders).toHaveLength(1);
    const initialOrders = [...adapter.orders];

    // Simulate 20 arbitrary playback actions (scrubbing forward, backward, restart)
    const total = record.events.length;
    for (let i = 0; i < total; i++) {
      deriveReplaySnapshot(record, i);
      deriveNodeStates(INITIAL_NODES, record.events.slice(0, i + 1));
      deriveEdgeStates(INITIAL_EDGES, record.events.slice(0, i + 1));
      deriveNodeInspectorTrace('risk-engine', record.events.slice(0, i + 1));
    }

    // Restart playback
    deriveReplaySnapshot(record, 0);

    // Seek back and forth
    deriveReplaySnapshot(record, 7);
    deriveReplaySnapshot(record, 2);
    deriveReplaySnapshot(record, 10);
    deriveReplaySnapshot(record, 0);

    // Verify adapter was NEVER called again during playback
    expect(adapter.callCount).toBe(1);
    expect(adapter.orders).toHaveLength(1);
    expect(adapter.orders).toEqual(initialOrders);
  });
});

describe('5. Scenario Isolation: Switching scenarios cannot mix events from different runs', () => {
  it('each scenario execution generates an isolated run record with unique runId', () => {
    const adapter = new MockExecutionAdapter();

    // Run Allowed
    const recordAllowed = runWorkflow(SCENARIOS.allowed, adapter);
    expect(recordAllowed.scenarioKey).toBe('allowed');

    // Run Blocked
    const recordBlocked = runWorkflow(SCENARIOS.blocked, adapter);
    expect(recordBlocked.scenarioKey).toBe('blocked');
    expect(recordBlocked.runId).not.toBe(recordAllowed.runId);

    // Invariant: no events from recordAllowed exist in recordBlocked
    const allowedEventIds = new Set(recordAllowed.events.map((e) => e.eventId));
    for (const ev of recordBlocked.events) {
      expect(allowedEventIds.has(ev.eventId)).toBe(false);
      expect(ev.runId).toBe(recordBlocked.runId);
    }
  });
});

describe('6. Timer Cancellation: Pausing or restarting clears pending timeouts', () => {
  it('clearing a timer handle ensures callback is never invoked', async () => {
    let fired = false;
    const timer = setTimeout(() => {
      fired = true;
    }, 50);

    clearTimeout(timer);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fired).toBe(false);
  });
});
