// ─── Agent Trading OS — Mock Execution Adapter ───────────────────────────────
// Records paper orders. Does NOT call any real broker or API.
// The structured local validation token must be present and match the run before an order is placed.
// Call counts are exposed for tests.

import type { Approval, MockOrder, StrategyOutput } from './types';

let _orderCounter = 0;

export class MockExecutionAdapter {
  private _orders: MockOrder[] = [];
  private _callCount = 0;

  /** Number of times submitOrder was called (used in tests) */
  get callCount(): number {
    return this._callCount;
  }

  get orders(): MockOrder[] {
    return [...this._orders];
  }

  /**
   * Place a paper order.
   * Preconditions (enforced here, not assumed):
   *   - approval must be non-null
   *   - approval.runId must match intent.runId-equivalent (passed separately)
   *   - approval.amount must match intent.proposedQty
   */
  submitOrder(
    approval: Approval | null,
    intent: Pick<StrategyOutput, 'symbol' | 'proposedQty' | 'side'>,
    runId: string,
  ): MockOrder | null {
    this._callCount++;

    if (!approval) {
      return null; // no approval token — execution blocked
    }
    if (approval.runId !== runId) {
      return null; // approval is for a different run
    }
    if (approval.amount !== intent.proposedQty) {
      return null; // approved amount does not match intent
    }

    const order: MockOrder = {
      orderId: `PAPER-${++_orderCounter}`,
      runId,
      symbol: intent.symbol,
      qty: intent.proposedQty,
      side: intent.side,
      price: 0,
      placedAt: Date.now(),
      note: '[LOCAL SIMULATION — not a real trade]',
    };
    this._orders.push(order);
    return order;
  }

  reset(): void {
    this._orders = [];
    this._callCount = 0;
  }
}

/** Singleton for runtime use; tests should create fresh instances */
export const executionAdapter = new MockExecutionAdapter();

export function freshAdapter(): MockExecutionAdapter {
  return new MockExecutionAdapter();
}

