// ─── Agent Trading OS — Replay and Verification Tests ─────────────────────────
// Comprehensive verification of replay correctness:
// 1. Evaluation evaluates recorded policy independently (custom limit, missing policy, missing proposal).
// 2. Pre-event state (cursor -1) isolates all future data in graph and inspector.
// 3. Moving backward restores correct earlier node, messages, and inspector states.
// 4. Runtime immutability protects inputs, nested recorded traces, and guarantees distinct round IDs.
// 5. Real replay runner controls (Play, Pause, Restart, Seek, Scenarios, Unmount) with fake timers.
// 6. Playback actions leave execution adapter call counts and order counts unchanged.

import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runWorkflow } from '../workflow/runner';
import { MockExecutionAdapter, executionAdapter } from '../workflow/adapter';
import { SCENARIOS, MAX_ORDER_QTY } from '../workflow/scenarios';
import { runEvaluation } from '../workflow/stages';
import {
  deriveNodeStates,
  deriveEdgeStates,
  deriveActivityEvents,
  deriveNodeInspectorTrace,
  deriveReplaySnapshot,
  deriveActiveMessages,
  deriveVisibleMessages,
} from '../workflow/replay';
import { INITIAL_NODES, INITIAL_EDGES } from '../data/graphData';
import type { RunRecord } from '../workflow/types';
import { useReplayRunner, PLAYBACK_STEP_MS } from '../hooks/useReplayRunner';
import { runProposalOnlyRound } from '../competition/proposalRoundEngine';
import type { NormalizedMarketSnapshot } from '../paper/types';

// ── DOM Harness for Mounting Real React Hooks in Node ──────────────────────────

function setupDomHarness() {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  class FakeElement {
    nodeType = 1;
    nodeName = 'DIV';
    tagName = 'DIV';
    style = {};
    children: unknown[] = [];
    ownerDocument: unknown = null;
    setAttribute() {}
    removeAttribute() {}
    appendChild() {}
    removeChild() {}
    addEventListener() {}
    removeEventListener() {}
  }
  class FakeIFrame extends FakeElement {}
  const doc = {
    nodeType: 9,
    nodeName: '#document',
    ownerDocument: null,
    activeElement: null,
    createElement: () => new FakeElement(),
    createTextNode: (t: string) => ({ nodeType: 3, nodeValue: t }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (globalThis as unknown as { window: unknown }).window = {
    Element: FakeElement,
    HTMLElement: FakeElement,
    HTMLIFrameElement: FakeIFrame,
    Node: FakeElement,
    addEventListener: () => {},
    removeEventListener: () => {},
    document: doc,
  };
  (globalThis as unknown as { document: unknown }).document = doc;
  (globalThis as unknown as { Element: unknown }).Element = FakeElement;
  (globalThis as unknown as { HTMLElement: unknown }).HTMLElement = FakeElement;
  (globalThis as unknown as { HTMLIFrameElement: unknown }).HTMLIFrameElement = FakeIFrame;
  (globalThis as unknown as { Node: unknown }).Node = FakeElement;
}

function mountReplayHook() {
  setupDomHarness();
  const container = new (globalThis as unknown as { Element: new () => unknown }).Element();
  const root = ReactDOM.createRoot(container as unknown as Element);
  let hookValue!: ReturnType<typeof useReplayRunner>;
  function TestComponent() {
    hookValue = useReplayRunner();
    return null;
  }
  act(() => {
    root.render(React.createElement(TestComponent));
  });
  return {
    get current() {
      return hookValue;
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}

const VALID_WEATHER_SNAPSHOT: NormalizedMarketSnapshot = {
  snapshotId: 'snap-weather-replay-001',
  ticker: 'KXWARMING-50',
  marketTitle: 'Global Temperature Anomaly Exceeding +1.5C in 2026',
  status: 'active',
  bestYesBid: 0.49,
  bestYesBidSize: 100,
  bestYesAsk: 0.52,
  bestYesAskSize: 80,
  spread: 0.03,
  lastPrice: 0.51,
  sourceTimestamp: Date.now(),
  localReceiptTimestamp: Date.now(),
  isStale: false,
  depth: {
    yesBids: [{ price: 0.49, size: 100 }],
    noBids: [{ price: 0.48, size: 80 }],
  },
};

// ── 1. Tightened Independent Policy Evaluation ─────────────────────────────────

describe('1. Tightened Evaluation: Evaluates recorded policy independently of verdicts', () => {
  it('reports failure when oversized proposal is falsely approved and executed', () => {
    const runId = 'corrupt-run-test';
    const oversizedQty = 25; // MAX_ORDER_QTY is 10

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
      policySnapshot: {
        maxOrderQty: MAX_ORDER_QTY,
        proposedQty: oversizedQty,
      },
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
          input: { proposedQty: oversizedQty, maxQty: MAX_ORDER_QTY },
          output: {
            approved: true,
            verdict: {
              rule: 'max-order-size',
              threshold: MAX_ORDER_QTY,
              observed: oversizedQty,
              passed: true,
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
    expect(evalResult.overallPassed).toBe(false);

    const policyCheck = evalResult.checks.find((c) =>
      c.description.includes('Independent policy limit check'),
    );
    expect(policyCheck).toBeDefined();
    expect(policyCheck?.passed).toBe(false);
    expect(policyCheck?.observed).toContain('POLICY VIOLATION');
  });

  it('evaluates against recorded limit different from global default (e.g. limit 15 vs global 10)', () => {
    const customLimit = 15;
    const proposedQty = 20;

    // Erroneously approved & executed proposal exceeding custom limit 15
    const recordWithCustomLimit: RunRecord = {
      runId: 'custom-limit-run',
      scenarioKey: 'allowed',
      startedAt: Date.now(),
      completedAt: Date.now() + 10,
      approval: {
        runId: 'custom-limit-run',
        approvedBy: 'risk-engine',
        amount: proposedQty,
        symbol: 'SPY',
        issuedAt: Date.now(),
      },
      paperOrders: [
        {
          orderId: 'ORDER-CUSTOM-1',
          runId: 'custom-limit-run',
          symbol: 'SPY',
          qty: proposedQty,
          side: 'buy',
          price: 0,
          placedAt: Date.now(),
          note: 'Simulation',
        },
      ],
      policySnapshot: {
        maxOrderQty: customLimit,
        proposedQty,
      },
      events: [
        {
          runId: 'custom-limit-run',
          eventId: 'ev-feed',
          seq: 1,
          nodeId: 'market-feed',
          timestamp: 1,
          eventType: 'node-complete',
          input: {},
          output: { topSymbol: 'SPY' },
          decision: 'Feed complete',
        },
        {
          runId: 'custom-limit-run',
          eventId: 'ev-strat',
          seq: 2,
          nodeId: 'strategy-agent',
          timestamp: 2,
          eventType: 'node-complete',
          input: { proposedQty },
          output: { proposedQty, symbol: 'SPY' },
          decision: `Proposed ${proposedQty}`,
        },
        {
          runId: 'custom-limit-run',
          eventId: 'ev-risk',
          seq: 3,
          nodeId: 'risk-engine',
          timestamp: 3,
          eventType: 'node-complete',
          input: { proposedQty, maxQty: customLimit },
          output: {
            approved: true,
            verdict: { rule: 'max-order-size', threshold: customLimit, observed: proposedQty, passed: true },
          },
          ruleVerdict: { rule: 'max-order-size', threshold: customLimit, observed: proposedQty, passed: true },
          decision: 'Risk approved',
        },
        {
          runId: 'custom-limit-run',
          eventId: 'ev-exec',
          seq: 4,
          nodeId: 'paper-execution',
          timestamp: 4,
          eventType: 'node-complete',
          input: {},
          output: { order: { orderId: 'ORDER-CUSTOM-1', qty: proposedQty, symbol: 'SPY' } },
          decision: 'Executed',
        },
        {
          runId: 'custom-limit-run',
          eventId: 'ev-eval',
          seq: 5,
          nodeId: 'evaluation',
          timestamp: 5,
          eventType: 'node-complete',
          input: {},
          output: {},
          decision: 'Evaluation complete',
        },
      ],
    };

    const evalResult = runEvaluation(recordWithCustomLimit);
    expect(evalResult.overallPassed).toBe(false);

    const policyCheck = evalResult.checks.find((c) =>
      c.description.includes('Independent policy limit check'),
    );
    expect(policyCheck?.passed).toBe(false);
    expect(policyCheck?.expected).toContain(`exceeds recorded limit ${customLimit}`);
    expect(policyCheck?.observed).toContain('POLICY VIOLATION');
  });

  it('fails evaluation when recorded policy limit evidence is missing instead of substituting global default', () => {
    // Older record lacking policySnapshot and without maxQty in risk input/verdict
    const missingPolicyRecord: RunRecord = {
      runId: 'missing-policy-run',
      scenarioKey: 'allowed',
      startedAt: Date.now(),
      completedAt: Date.now() + 10,
      approval: null,
      paperOrders: [],
      events: [
        {
          runId: 'missing-policy-run',
          eventId: 'e-1',
          seq: 1,
          nodeId: 'strategy-agent',
          timestamp: 1,
          eventType: 'node-complete',
          input: { proposedQty: 5 },
          output: { proposedQty: 5, symbol: 'AAPL' },
          decision: 'Propose 5 AAPL',
        },
        {
          runId: 'missing-policy-run',
          eventId: 'e-2',
          seq: 2,
          nodeId: 'risk-engine',
          timestamp: 2,
          eventType: 'node-complete',
          input: {}, // no maxQty
          output: { approved: false }, // no ruleVerdict
          decision: 'Risk blocked',
        },
      ],
    };

    const evalResult = runEvaluation(missingPolicyRecord);
    expect(evalResult.overallPassed).toBe(false);

    const policyCheck = evalResult.checks.find((c) =>
      c.description.includes('Independent policy limit check'),
    );
    expect(policyCheck?.passed).toBe(false);
    expect(policyCheck?.observed).toContain('Missing recorded policy evidence');
  });

  it('fails evaluation when original proposed quantity evidence is missing or non-finite', () => {
    const missingProposalRecord: RunRecord = {
      runId: 'missing-proposal-run',
      scenarioKey: 'allowed',
      startedAt: Date.now(),
      completedAt: Date.now() + 10,
      approval: null,
      paperOrders: [],
      policySnapshot: {
        maxOrderQty: 10,
        proposedQty: undefined as unknown as number,
      },
      events: [
        {
          runId: 'missing-proposal-run',
          eventId: 'e-1',
          seq: 1,
          nodeId: 'risk-engine',
          timestamp: 1,
          eventType: 'node-complete',
          input: { maxQty: 10 },
          output: { approved: false },
          decision: 'Risk evaluated',
        },
      ],
    };

    const evalResult = runEvaluation(missingProposalRecord);
    expect(evalResult.overallPassed).toBe(false);

    const policyCheck = evalResult.checks.find((c) =>
      c.description.includes('Independent policy limit check'),
    );
    expect(policyCheck?.passed).toBe(false);
    expect(policyCheck?.observed).toContain('Missing original proposed quantity evidence');

    // Non-finite proposal
    const nonFiniteRecord = {
      ...missingProposalRecord,
      policySnapshot: { maxOrderQty: 10, proposedQty: NaN },
    };
    const nonFiniteResult = runEvaluation(nonFiniteRecord);
    const nonFiniteCheck = nonFiniteResult.checks.find((c) =>
      c.description.includes('Independent policy limit check'),
    );
    expect(nonFiniteCheck?.passed).toBe(false);
    expect(nonFiniteCheck?.observed).toContain('Invalid recorded proposed quantity');
  });
});

// ── 2. Replay Boundary: Pre-Event State & Temporal Isolation ───────────────────

describe('2. Replay Boundary: Pre-event state reveals no future data in graph or inspector', () => {
  let adapter: MockExecutionAdapter;
  let record: RunRecord;

  beforeEach(() => {
    adapter = new MockExecutionAdapter();
    record = runWorkflow(SCENARIOS.allowed, adapter);
  });

  it('pre-event cursor (-1) exposes no historical messages, outputs, verdicts, or receipts', () => {
    const snapshot = deriveReplaySnapshot(record, -1);

    expect(snapshot.cursorIndex).toBe(-1);
    expect(snapshot.activeEvents).toHaveLength(0);
    expect(snapshot.currentEvent).toBeNull();
    expect(snapshot.isAtStart).toBe(true);

    // Graph state: all nodes idle with latestActivity null
    const nodes = deriveNodeStates(INITIAL_NODES, snapshot.activeEvents);
    for (const node of nodes) {
      expect(node.data.status).toBe('idle');
      expect(node.data.latestActivity).toBeNull();
    }

    // Graph edges: no edge animated
    const edges = deriveEdgeStates(INITIAL_EDGES, snapshot.activeEvents);
    for (const edge of edges) {
      expect((edge.data as Record<string, unknown>).animated).toBe(false);
    }

    // Messages: zero visible messages
    const activeMsgs = deriveActiveMessages(record, -1);
    expect(activeMsgs).toEqual({});

    const visibleList = deriveVisibleMessages(record, snapshot.activeEvents);
    expect(visibleList).toEqual([]);

    // Activity ticker: empty
    const activity = deriveActivityEvents(snapshot.activeEvents, {});
    expect(activity).toEqual([]);

    // Inspector for every node displays 'unreached' with summary "Not reached at this replay step."
    for (const node of INITIAL_NODES) {
      const trace = deriveNodeInspectorTrace(node.id, snapshot.activeEvents);
      expect(trace.reached).toBe(false);
      expect(trace.status).toBe('unreached');
      expect(trace.summaryText).toBe('Not reached at this replay step.');
      expect(trace.output).toBeNull();
      expect(trace.decision).toBeNull();
      expect(trace.ruleVerdict).toBeNull();
      expect(trace.riskBreakdown).toBeNull();
      expect(trace.evalOutput).toBeNull();
      expect(trace.paperOrders).toHaveLength(0);
    }
  });

  it('at Analyst complete (seq 4), downstream nodes have no outputs or active states', () => {
    const cursorIndex = 3;
    const activeEvents = record.events.slice(0, cursorIndex + 1);

    const nodes = deriveNodeStates(INITIAL_NODES, activeEvents);

    const downstreamIds = ['strategy-agent', 'risk-engine', 'paper-execution', 'evaluation'];
    for (const id of downstreamIds) {
      const node = nodes.find((n) => n.id === id);
      expect(node?.data.status).toBe('idle');
      expect(node?.data.latestActivity).toBeNull();
    }

    for (const id of downstreamIds) {
      const trace = deriveNodeInspectorTrace(id, activeEvents);
      expect(trace.reached).toBe(false);
      expect(trace.status).toBe('unreached');
      expect(trace.output).toBeNull();
      expect(trace.summaryText).toBe('Not reached at this replay step.');
      expect(trace.evalOutput).toBeNull();
      expect(trace.paperOrders).toHaveLength(0);
    }

    const activities = deriveActivityEvents(activeEvents, {});
    expect(activities).toHaveLength(2);
    expect(activities.map((a) => a.nodeId)).toEqual(['market-feed', 'market-analyst']);
  });

  it('while Risk Engine is running (start event only), output and verdict are hidden', () => {
    const riskStartIndex = record.events.findIndex(
      (e) => e.nodeId === 'risk-engine' && e.eventType === 'node-start',
    );
    expect(riskStartIndex).toBeGreaterThan(-1);

    const activeEvents = record.events.slice(0, riskStartIndex + 1);
    const trace = deriveNodeInspectorTrace('risk-engine', activeEvents);

    expect(trace.reached).toBe(true);
    expect(trace.status).toBe('running');
    expect(trace.input).not.toBeNull();
    expect(trace.output).toBeNull();
    expect(trace.ruleVerdict).toBeNull();
    expect(trace.riskBreakdown).toBeNull();
  });
});

// ── 3. Moving Backward: Deterministic State Rebuilding ─────────────────────────

describe('3. Moving Backward: Restores earlier node, messages, and inspector states', () => {
  let adapter: MockExecutionAdapter;
  let record: RunRecord;

  beforeEach(() => {
    adapter = new MockExecutionAdapter();
    record = runWorkflow(SCENARIOS.allowed, adapter);
  });

  it('moving cursor back from execution complete to strategy complete clears later outputs', () => {
    const execCompleteIndex = record.events.findIndex(
      (e) => e.nodeId === 'paper-execution' && e.eventType === 'node-complete',
    );
    const stratCompleteIndex = record.events.findIndex(
      (e) => e.nodeId === 'strategy-agent' && e.eventType === 'node-complete',
    );

    const forwardEvents = record.events.slice(0, execCompleteIndex + 1);
    const forwardNodes = deriveNodeStates(INITIAL_NODES, forwardEvents);
    const forwardExecNode = forwardNodes.find((n) => n.id === 'paper-execution');
    const forwardTrace = deriveNodeInspectorTrace('paper-execution', forwardEvents);

    expect(forwardExecNode?.data.status).toBe('success');
    expect(forwardTrace.reached).toBe(true);
    expect(forwardTrace.paperOrders).toHaveLength(1);

    const backwardEvents = record.events.slice(0, stratCompleteIndex + 1);
    const backwardNodes = deriveNodeStates(INITIAL_NODES, backwardEvents);
    const backwardExecNode = backwardNodes.find((n) => n.id === 'paper-execution');
    const backwardRiskNode = backwardNodes.find((n) => n.id === 'risk-engine');
    const backwardTrace = deriveNodeInspectorTrace('paper-execution', backwardEvents);

    expect(backwardExecNode?.data.status).toBe('idle');
    expect(backwardRiskNode?.data.status).toBe('idle');

    expect(backwardTrace.reached).toBe(false);
    expect(backwardTrace.status).toBe('unreached');
    expect(backwardTrace.output).toBeNull();
    expect(backwardTrace.paperOrders).toHaveLength(0);
    expect(backwardTrace.summaryText).toBe('Not reached at this replay step.');
  });

  it('stepping backward in proposal rounds hides future messages', () => {
    const result = runProposalOnlyRound(VALID_WEATHER_SNAPSHOT, 'daily-weather', 200.0);
    const roundRecord = result.runRecord;

    // Full replay has all messages
    const fullMessages = deriveActiveMessages(roundRecord, roundRecord.events.length - 1);
    expect(fullMessages['coach-evaluator']).toBeDefined();
    expect(fullMessages['risk-engine']).toBeDefined();

    // Step back to Alpha proposal step (seq 2 / event index 1)
    const backwardMessages = deriveActiveMessages(roundRecord, 1);
    expect(backwardMessages['coach-evaluator']).toBeUndefined();
    expect(backwardMessages['risk-engine']).toBeUndefined();
    expect(backwardMessages['paper-execution']).toBeUndefined();

    // Step back to pre-event cursor (-1) hides all messages
    const preMessages = deriveActiveMessages(roundRecord, -1);
    expect(Object.keys(preMessages)).toHaveLength(0);
  });
});

// ── 4. Preserved Recorded Evidence & Runtime Immutability ──────────────────────

describe('4. Preserved Recorded Evidence & Runtime Immutability', () => {
  it('mutating original input after execution cannot change an existing replay record', () => {
    const input = {
      scenarioKey: 'allowed' as const,
      description: 'Original input test',
      symbol: 'AAPL',
      proposedQty: 5,
    };

    const adapter = new MockExecutionAdapter();
    const record = runWorkflow(input, adapter);

    // Mutate caller-owned input
    input.proposedQty = 999;
    input.symbol = 'MUTATED';
    input.description = 'Mutated description';

    // The recorded run must retain the original snapshotted values
    expect(record.policySnapshot?.proposedQty).toBe(5);
    expect(record.events[1].decision).toContain('AAPL');
    expect(record.description).toBe('Original input test');
  });

  it('attempting to mutate nested recorded data is prevented by runtime deep freeze', () => {
    const adapter = new MockExecutionAdapter();
    const record = runWorkflow(SCENARIOS.allowed, adapter);

    // Root record is frozen
    expect(Object.isFrozen(record)).toBe(true);

    // Nested events array is frozen
    expect(Object.isFrozen(record.events)).toBe(true);

    // Nested event object and output are frozen
    expect(Object.isFrozen(record.events[0])).toBe(true);
    expect(Object.isFrozen(record.events[0].output)).toBe(true);

    // Mutating nested output throws in strict mode
    expect(() => {
      (record.events[0].output as Record<string, unknown>).hacked = true;
    }).toThrow();
    expect((record.events[0].output as Record<string, unknown>).hacked).toBeUndefined();
  });

  it('separate proposal-only rounds have distinct run IDs even within the same clock tick', () => {
    const round1 = runProposalOnlyRound(VALID_WEATHER_SNAPSHOT, 'daily-weather', 200.0);
    const round2 = runProposalOnlyRound(VALID_WEATHER_SNAPSHOT, 'daily-weather', 200.0);

    expect(round1.runId).not.toBe(round2.runId);
    expect(round1.runRecord.runId).not.toBe(round2.runRecord.runId);
    expect(round1.runRecord.events[0].runId).toBe(round1.runId);
    expect(round2.runRecord.events[0].runId).toBe(round2.runId);
  });

  it('mutating caller-owned market snapshot cannot alter proposal round evidence', () => {
    const snapshotCopy = { ...VALID_WEATHER_SNAPSHOT };
    const round = runProposalOnlyRound(snapshotCopy, 'daily-weather', 200.0);

    // Mutate caller snapshot
    snapshotCopy.lastPrice = 0.99;
    snapshotCopy.ticker = 'HACKED';

    // Recorded result must retain original values
    expect(round.snapshot.lastPrice).toBe(0.51);
    expect(round.snapshot.ticker).toBe('KXWARMING-50');
    expect(round.runRecord.events[0].input.ticker).toBe('KXWARMING-50');
  });
});

// ── 5. Actual Replay Controls & Fake Timer Invariants ──────────────────────────

describe('5. Actual Replay Controls & Fake Timers (Mounted Hook Execution)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    executionAdapter.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a loaded record at pre-event cursor exposes no future data; stepping backward clears outputs', () => {
    const hook = mountReplayHook();

    const adapter = new MockExecutionAdapter();
    const record = runWorkflow(SCENARIOS.allowed, adapter);

    // Load record explicitly at pre-event cursor (-1)
    act(() => {
      hook.current.loadRecord(record, -1);
    });

    expect(hook.current.cursorIndex).toBe(-1);
    expect(hook.current.isPlaying).toBe(false);

    // Step forward advances step-by-step
    act(() => {
      hook.current.stepNext();
    });
    expect(hook.current.cursorIndex).toBe(0);

    act(() => {
      hook.current.stepNext();
    });
    expect(hook.current.cursorIndex).toBe(1);

    // Step backward restores earlier state
    act(() => {
      hook.current.stepPrev();
    });
    expect(hook.current.cursorIndex).toBe(0);

    // Stepping backward again reaches pre-event cursor (-1)
    act(() => {
      hook.current.stepPrev();
    });
    expect(hook.current.cursorIndex).toBe(-1);

    hook.unmount();
  });

  it('Play followed by Pause stays at the paused cursor after all pending timers are advanced', () => {
    const hook = mountReplayHook();

    act(() => {
      hook.current.runScenario('allowed');
    });

    expect(hook.current.cursorIndex).toBe(0);
    expect(hook.current.isPlaying).toBe(true);

    // Advance 1 step
    act(() => {
      vi.advanceTimersByTime(PLAYBACK_STEP_MS);
    });
    expect(hook.current.cursorIndex).toBe(1);

    // Pause playback
    act(() => {
      hook.current.togglePlayPause();
    });
    expect(hook.current.isPlaying).toBe(false);
    const pausedCursor = hook.current.cursorIndex;
    expect(pausedCursor).toBe(1);

    // Advance timers significantly — cursor must stay exactly at paused position
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(hook.current.cursorIndex).toBe(pausedCursor);
    expect(hook.current.isPlaying).toBe(false);

    hook.unmount();
  });

  it('Play followed by Restart stays at the beginning (cursor 0); a stale callback cannot advance it', () => {
    const hook = mountReplayHook();

    act(() => {
      hook.current.runScenario('allowed');
    });

    // Advance steps while playing
    act(() => {
      vi.advanceTimersByTime(PLAYBACK_STEP_MS);
    });
    expect(hook.current.cursorIndex).toBe(1);

    act(() => {
      vi.advanceTimersByTime(PLAYBACK_STEP_MS);
    });
    expect(hook.current.cursorIndex).toBe(2);

    // Restart while playing
    act(() => {
      hook.current.restartPlayback();
    });

    expect(hook.current.cursorIndex).toBe(0);
    expect(hook.current.isPlaying).toBe(false);

    // Advance timers — stale callbacks must NOT fire
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(hook.current.cursorIndex).toBe(0);

    hook.unmount();
  });

  it('switching scenarios during playback cannot let the previous timer change the new run', () => {
    const hook = mountReplayHook();

    act(() => {
      hook.current.runScenario('allowed');
    });
    const run1Id = hook.current.runRecord?.runId;
    expect(hook.current.cursorIndex).toBe(0);

    // Switch scenario mid-playback before step timer elapses
    act(() => {
      vi.advanceTimersByTime(PLAYBACK_STEP_MS / 2);
    });

    act(() => {
      hook.current.runScenario('blocked');
    });
    const run2Id = hook.current.runRecord?.runId;
    expect(run2Id).not.toBe(run1Id);
    expect(hook.current.cursorIndex).toBe(0);

    // Advance timer for the new run
    act(() => {
      vi.advanceTimersByTime(PLAYBACK_STEP_MS);
    });
    expect(hook.current.runRecord?.runId).toBe(run2Id);
    expect(hook.current.cursorIndex).toBe(1);

    hook.unmount();
  });

  it('unmount cancels pending playback work', () => {
    const hook = mountReplayHook();

    act(() => {
      hook.current.runScenario('allowed');
    });
    expect(hook.current.isPlaying).toBe(true);

    // Unmount while playback timer is pending
    hook.unmount();

    // Advancing all timers should run without error or stale state updates
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(10000);
      });
    }).not.toThrow();
  });

  it('repeated Play, Pause, Previous, Next, Seek, and Restart leave adapter call counts unchanged', () => {
    const hook = mountReplayHook();

    act(() => {
      hook.current.runScenario('allowed');
    });

    const baselineCalls = executionAdapter.callCount;
    const baselineOrders = executionAdapter.orders.length;
    expect(baselineCalls).toBe(1);
    expect(baselineOrders).toBe(1);

    // Perform repeated playback actions
    act(() => {
      hook.current.stepNext();
      hook.current.stepNext();
      hook.current.stepPrev();
      hook.current.seekTo(4);
      hook.current.seekTo(-1);
      hook.current.seekTo(2);
      hook.current.restartPlayback();
      hook.current.togglePlayPause();
    });

    act(() => {
      vi.advanceTimersByTime(PLAYBACK_STEP_MS * 2);
    });

    act(() => {
      hook.current.togglePlayPause();
      hook.current.restartPlayback();
    });

    // Verification: adapter was never invoked again during playback
    expect(executionAdapter.callCount).toBe(baselineCalls);
    expect(executionAdapter.orders.length).toBe(baselineOrders);

    hook.unmount();
  });

  it('each scenario execution generates an isolated run record with unique runId', () => {
    const adapter = new MockExecutionAdapter();

    const recordAllowed = runWorkflow(SCENARIOS.allowed, adapter);
    expect(recordAllowed.scenarioKey).toBe('allowed');

    const recordBlocked = runWorkflow(SCENARIOS.blocked, adapter);
    expect(recordBlocked.scenarioKey).toBe('blocked');
    expect(recordBlocked.runId).not.toBe(recordAllowed.runId);

    const allowedEventIds = new Set(recordAllowed.events.map((e) => e.eventId));
    for (const ev of recordBlocked.events) {
      expect(allowedEventIds.has(ev.eventId)).toBe(false);
      expect(ev.runId).toBe(recordBlocked.runId);
    }
  });
});
