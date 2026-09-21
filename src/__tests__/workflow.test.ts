// ─── Agent Trading OS — Workflow Tests ────────────────────────────────────────
// Tests the runner and adapter against actual execution, not assertions about
// scenario names or preset flags.

import { describe, it, expect, beforeEach } from 'vitest';
import { runWorkflow } from '../workflow/runner';
import { MockExecutionAdapter } from '../workflow/adapter';
import { SCENARIOS, MAX_ORDER_QTY } from '../workflow/scenarios';
import { runRiskEngine } from '../workflow/stages';
import type { StrategyOutput } from '../workflow/types';

// ── Fixture helpers ───────────────────────────────────────────────────────────

function freshAdapter() {
  return new MockExecutionAdapter();
}

// ── 1. Allowed scenario ───────────────────────────────────────────────────────

describe('allowed scenario (qty=5, max=10)', () => {
  let adapter: MockExecutionAdapter;

  beforeEach(() => {
    adapter = freshAdapter();
  });

  it('produces exactly 1 paper order', () => {
    const record = runWorkflow(SCENARIOS.allowed, adapter);
    expect(record.paperOrders).toHaveLength(1);
  });

  it('adapter submitOrder was called exactly once', () => {
    runWorkflow(SCENARIOS.allowed, adapter);
    expect(adapter.callCount).toBe(1);
  });

  it('approval token is present on the run record', () => {
    const record = runWorkflow(SCENARIOS.allowed, adapter);
    expect(record.approval).not.toBeNull();
    expect(record.approval?.approvedBy).toBe('risk-engine');
  });

  it('risk event has a passing verdict', () => {
    const record = runWorkflow(SCENARIOS.allowed, adapter);
    const riskEvent = record.events.find(
      (e) => e.nodeId === 'risk-engine' && e.eventType === 'node-complete',
    );
    expect(riskEvent?.ruleVerdict?.passed).toBe(true);
    expect(riskEvent?.ruleVerdict?.observed).toBe(5);
    expect(riskEvent?.ruleVerdict?.threshold).toBe(MAX_ORDER_QTY);
  });

  it('paper-execution event is node-complete (not skipped)', () => {
    const record = runWorkflow(SCENARIOS.allowed, adapter);
    const execEvent = record.events.find(
      (e) => e.nodeId === 'paper-execution' &&
        (e.eventType === 'node-complete' || e.eventType === 'node-skipped'),
    );
    expect(execEvent?.eventType).toBe('node-complete');
  });

  it('evaluation reports overall pass', () => {
    const record = runWorkflow(SCENARIOS.allowed, adapter);
    const evalEvent = record.events.find(
      (e) => e.nodeId === 'evaluation' && e.eventType === 'node-complete',
    );
    const output = evalEvent?.output as { overallPassed?: boolean } | undefined;
    expect(output?.overallPassed).toBe(true);
  });
});

// ── 2. Blocked scenario ───────────────────────────────────────────────────────

describe('blocked scenario (qty=20, max=10)', () => {
  let adapter: MockExecutionAdapter;

  beforeEach(() => {
    adapter = freshAdapter();
  });

  it('produces zero paper orders', () => {
    const record = runWorkflow(SCENARIOS.blocked, adapter);
    expect(record.paperOrders).toHaveLength(0);
  });

  it('adapter submitOrder was never called', () => {
    runWorkflow(SCENARIOS.blocked, adapter);
    expect(adapter.callCount).toBe(0);
  });

  it('approval token is null on the run record', () => {
    const record = runWorkflow(SCENARIOS.blocked, adapter);
    expect(record.approval).toBeNull();
  });

  it('risk event has a failing verdict', () => {
    const record = runWorkflow(SCENARIOS.blocked, adapter);
    const riskEvent = record.events.find(
      (e) => e.nodeId === 'risk-engine' && e.eventType === 'node-complete',
    );
    expect(riskEvent?.ruleVerdict?.passed).toBe(false);
    expect(riskEvent?.ruleVerdict?.observed).toBe(20);
    expect(riskEvent?.ruleVerdict?.threshold).toBe(MAX_ORDER_QTY);
  });

  it('paper-execution event is node-skipped (not node-complete)', () => {
    const record = runWorkflow(SCENARIOS.blocked, adapter);
    const execEvent = record.events.find((e) => e.nodeId === 'paper-execution');
    expect(execEvent?.eventType).toBe('node-skipped');
  });

  it('paper-execution skip reason references the risk rejection', () => {
    const record = runWorkflow(SCENARIOS.blocked, adapter);
    const execEvent = record.events.find((e) => e.nodeId === 'paper-execution');
    expect(execEvent?.skipReason).toBeTruthy();
    // The reason should mention blocking, rejection, or exceeding the limit
    expect(execEvent?.skipReason).toMatch(/block|reject|exceed/i);
  });

  it('evaluation still runs and reports correct check results', () => {
    const record = runWorkflow(SCENARIOS.blocked, adapter);
    const evalEvent = record.events.find(
      (e) => e.nodeId === 'evaluation' && e.eventType === 'node-complete',
    );
    expect(evalEvent).toBeDefined();
    // Evaluation should still pass: rejection = enforcement success
    const output = evalEvent?.output as { overallPassed?: boolean } | undefined;
    expect(output?.overallPassed).toBe(true);
  });
});

// ── 3. Missing approval guard (adapter unit test) ─────────────────────────────

describe('MockExecutionAdapter: missing approval', () => {
  it('returns null and records the call when approval is null', () => {
    const adapter = freshAdapter();
    const intent = { symbol: 'AAPL', proposedQty: 5, side: 'buy' as const };
    const result = adapter.submitOrder(null, intent, 'run-test-1');
    expect(result).toBeNull();
    expect(adapter.callCount).toBe(1);  // called but returned null — call was made
    expect(adapter.orders).toHaveLength(0); // no order recorded
  });

  it('returns null when runId does not match', () => {
    const adapter = freshAdapter();
    // Manufacture a valid-looking approval with wrong runId
    const approval = {
      runId: 'run-DIFFERENT',
      approvedBy: 'risk-engine' as const,
      amount: 5,
      symbol: 'AAPL',
      issuedAt: Date.now(),
    };
    const result = adapter.submitOrder(approval, { symbol: 'AAPL', proposedQty: 5, side: 'buy' }, 'run-DIFFERENT-2');
    expect(result).toBeNull();
    expect(adapter.orders).toHaveLength(0);
  });

  it('returns null when amount does not match', () => {
    const adapter = freshAdapter();
    const approval = {
      runId: 'run-X',
      approvedBy: 'risk-engine' as const,
      amount: 3, // approved 3, intent says 5
      symbol: 'AAPL',
      issuedAt: Date.now(),
    };
    const result = adapter.submitOrder(approval, { symbol: 'AAPL', proposedQty: 5, side: 'buy' }, 'run-X');
    expect(result).toBeNull();
    expect(adapter.orders).toHaveLength(0);
  });
});

// ── 4. Reset cancels run (pure logic) ─────────────────────────────────────────
// Timer-pacing is React-layer behavior; what we test here is that after
// runWorkflow returns, the record is frozen — subsequent calls don't mutate it.

describe('run record immutability after completion', () => {
  it('adding to adapter after run does not affect the completed record', () => {
    const adapter = freshAdapter();
    const record = runWorkflow(SCENARIOS.allowed, adapter);
    const ordersAtCompletion = record.paperOrders.length;

    // Simulate a second spurious call (e.g., a leaked timer in tests)
    const fakeApproval = {
      runId: record.runId,
      approvedBy: 'risk-engine' as const,
      amount: 5,
      symbol: 'AAPL',
      issuedAt: Date.now(),
    };
    adapter.submitOrder(fakeApproval, { symbol: 'AAPL', proposedQty: 5, side: 'buy' }, record.runId);

    // The record.paperOrders is a snapshot — it should not grow
    expect(record.paperOrders.length).toBe(ordersAtCompletion);
  });
});

// ── 5. Rule engine boundary ───────────────────────────────────────────────────

describe('runRiskEngine boundary conditions', () => {
  const baseStrategy: StrategyOutput = {
    strategyName: 'Test',
    symbol: 'AAPL',
    proposedQty: 10,
    side: 'buy',
    confidenceScore: 0.5,
  };

  it('passes when qty === threshold (boundary)', () => {
    const result = runRiskEngine({ ...baseStrategy, proposedQty: 10 }, 'run-1', 10);
    expect(result.verdict.passed).toBe(true);
    expect(result.approved).toBe(true);
  });

  it('blocks when qty === threshold + 1', () => {
    const result = runRiskEngine({ ...baseStrategy, proposedQty: 11 }, 'run-2', 10);
    expect(result.verdict.passed).toBe(false);
    expect(result.approved).toBe(false);
    expect(result.approval).toBeNull();
  });

  it('passes with qty=1', () => {
    const result = runRiskEngine({ ...baseStrategy, proposedQty: 1 }, 'run-3', 10);
    expect(result.verdict.passed).toBe(true);
  });
});
