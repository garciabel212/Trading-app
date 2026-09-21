// ─── Agent Trading OS — Paper Account & Execution Ledger ─────────────────────
// Implements a $1,000 virtual paper trading ledger with decimal-safe accounting,
// pre-execution liquidity and cash checks, position valuation, and local persistence.

import type {
  NormalizedMarketSnapshot,
  PaperAccount,
  PaperOrder,
  PaperPosition,
} from './types';
import { calculateKalshiTakerFee, isSnapshotStale, roundCents } from './kalshi';

export const INITIAL_CASH = 1000.0;
export const MAX_ORDER_SIZE_LIMIT = 10; // Consistent with Risk Engine policy

export const INITIAL_PAPER_ACCOUNT: PaperAccount = {
  cash: INITIAL_CASH,
  position: null,
  realizedPnl: 0,
  totalFeesPaid: 0,
  lastUpdated: Date.now(),
};

const ACCOUNT_STORAGE_KEY = 'agent_trading_os_paper_account_v2';
const ORDERS_STORAGE_KEY = 'agent_trading_os_paper_orders_v2';
const SNAPSHOTS_STORAGE_KEY = 'agent_trading_os_snapshots_v2';

// ── Persistence Helpers ───────────────────────────────────────────────────────

export function loadPersistedAccount(): PaperAccount {
  if (typeof window === 'undefined') return { ...INITIAL_PAPER_ACCOUNT };
  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) return { ...INITIAL_PAPER_ACCOUNT };
    const parsed = JSON.parse(raw) as PaperAccount;
    return {
      cash: roundCents(parsed.cash ?? INITIAL_CASH),
      position: parsed.position ? { ...parsed.position } : null,
      realizedPnl: roundCents(parsed.realizedPnl ?? 0),
      totalFeesPaid: roundCents(parsed.totalFeesPaid ?? 0),
      lastUpdated: parsed.lastUpdated ?? Date.now(),
    };
  } catch {
    return { ...INITIAL_PAPER_ACCOUNT };
  }
}

export function savePersistedAccount(account: PaperAccount): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadPersistedOrders(): PaperOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PaperOrder[]) : [];
  } catch {
    return [];
  }
}

export function savePersistedOrders(orders: PaperOrder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // Ignore storage quota errors
  }
}

export function savePersistedSnapshot(snapshot: NormalizedMarketSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, NormalizedMarketSnapshot>) : {};
    map[snapshot.snapshotId] = snapshot;
    // Keep at most 50 recent snapshots
    const keys = Object.keys(map);
    if (keys.length > 50) {
      delete map[keys[0]];
    }
    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

export function loadPersistedSnapshot(snapshotId: string): NormalizedMarketSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, NormalizedMarketSnapshot>;
    return map[snapshotId] ?? null;
  } catch {
    return null;
  }
}

// ── Validation & Order Execution ──────────────────────────────────────────────

export interface OrderValidationResult {
  canExecute: boolean;
  reason?: string;
  unitPrice: number;
  grossAmount: number;
  estimatedFee: number;
  netTotal: number;
}

/**
 * Validates a proposed buy or close order against live market snapshot and paper account.
 */
export function validatePaperOrder(
  action: 'buy' | 'close',
  qty: number,
  snapshot: NormalizedMarketSnapshot | null,
  account: PaperAccount,
): OrderValidationResult {
  if (!snapshot) {
    return {
      canExecute: false,
      reason: 'No market snapshot available. Awaiting market data.',
      unitPrice: 0,
      grossAmount: 0,
      estimatedFee: 0,
      netTotal: 0,
    };
  }

  if (isSnapshotStale(snapshot)) {
    return {
      canExecute: false,
      reason: 'Market snapshot is stale (>30s old). Live execution blocked for safety.',
      unitPrice: 0,
      grossAmount: 0,
      estimatedFee: 0,
      netTotal: 0,
    };
  }

  if (snapshot.status !== 'active') {
    return {
      canExecute: false,
      reason: `Market status is "${snapshot.status}". Orders only accepted on active markets.`,
      unitPrice: 0,
      grossAmount: 0,
      estimatedFee: 0,
      netTotal: 0,
    };
  }

  if (qty <= 0 || !Number.isInteger(qty)) {
    return {
      canExecute: false,
      reason: 'Quantity must be a positive integer contract count.',
      unitPrice: 0,
      grossAmount: 0,
      estimatedFee: 0,
      netTotal: 0,
    };
  }

  if (qty > MAX_ORDER_SIZE_LIMIT) {
    return {
      canExecute: false,
      reason: `Order quantity (${qty}) exceeds Risk Engine limit of ${MAX_ORDER_SIZE_LIMIT} units.`,
      unitPrice: 0,
      grossAmount: 0,
      estimatedFee: 0,
      netTotal: 0,
    };
  }

  if (action === 'buy') {
    if (snapshot.bestYesAsk === null || snapshot.bestYesAsk <= 0) {
      return {
        canExecute: false,
        reason: 'No executable YES ask quote on the orderbook.',
        unitPrice: 0,
        grossAmount: 0,
        estimatedFee: 0,
        netTotal: 0,
      };
    }

    if (qty > snapshot.bestYesAskSize) {
      return {
        canExecute: false,
        reason: `Insufficient ask liquidity: requested ${qty} contracts, but only ${snapshot.bestYesAskSize} available at best ask ($${snapshot.bestYesAsk.toFixed(2)}).`,
        unitPrice: snapshot.bestYesAsk,
        grossAmount: roundCents(qty * snapshot.bestYesAsk),
        estimatedFee: calculateKalshiTakerFee(qty, snapshot.bestYesAsk),
        netTotal: roundCents(qty * snapshot.bestYesAsk + calculateKalshiTakerFee(qty, snapshot.bestYesAsk)),
      };
    }

    const price = snapshot.bestYesAsk;
    const gross = roundCents(qty * price);
    const fee = calculateKalshiTakerFee(qty, price);
    const totalRequired = roundCents(gross + fee);

    if (account.cash < totalRequired) {
      return {
        canExecute: false,
        reason: `Insufficient cash: required $${totalRequired.toFixed(2)} ($${gross.toFixed(2)} + $${fee.toFixed(2)} fee), but available cash is $${account.cash.toFixed(2)}.`,
        unitPrice: price,
        grossAmount: gross,
        estimatedFee: fee,
        netTotal: totalRequired,
      };
    }

    return {
      canExecute: true,
      unitPrice: price,
      grossAmount: gross,
      estimatedFee: fee,
      netTotal: totalRequired,
    };
  } else {
    // action === 'close'
    const position = account.position;
    if (!position || position.ticker !== snapshot.ticker || position.contracts <= 0) {
      return {
        canExecute: false,
        reason: `No open YES position held in ${snapshot.ticker}. Short selling is forbidden.`,
        unitPrice: 0,
        grossAmount: 0,
        estimatedFee: 0,
        netTotal: 0,
      };
    }

    if (qty > position.contracts) {
      return {
        canExecute: false,
        reason: `Cannot close ${qty} contracts: only ${position.contracts} held. Short selling is forbidden.`,
        unitPrice: 0,
        grossAmount: 0,
        estimatedFee: 0,
        netTotal: 0,
      };
    }

    if (snapshot.bestYesBid === null || snapshot.bestYesBid <= 0) {
      return {
        canExecute: false,
        reason: 'No executable YES bid quote on the orderbook.',
        unitPrice: 0,
        grossAmount: 0,
        estimatedFee: 0,
        netTotal: 0,
      };
    }

    if (qty > snapshot.bestYesBidSize) {
      return {
        canExecute: false,
        reason: `Insufficient bid liquidity: requested to sell ${qty} contracts, but only ${snapshot.bestYesBidSize} available at best bid ($${snapshot.bestYesBid.toFixed(2)}).`,
        unitPrice: snapshot.bestYesBid,
        grossAmount: roundCents(qty * snapshot.bestYesBid),
        estimatedFee: calculateKalshiTakerFee(qty, snapshot.bestYesBid),
        netTotal: roundCents(qty * snapshot.bestYesBid - calculateKalshiTakerFee(qty, snapshot.bestYesBid)),
      };
    }

    const price = snapshot.bestYesBid;
    const gross = roundCents(qty * price);
    const fee = calculateKalshiTakerFee(qty, price);
    const netProceeds = roundCents(gross - fee);

    return {
      canExecute: true,
      unitPrice: price,
      grossAmount: gross,
      estimatedFee: fee,
      netTotal: netProceeds,
    };
  }
}

/**
 * Executes a simulated trade against the live snapshot.
 * Mutates nothing in place; returns the updated account and created order.
 */
export function executePaperTrade(
  action: 'buy' | 'close',
  qty: number,
  snapshot: NormalizedMarketSnapshot,
  account: PaperAccount,
  runId: string,
  origin: 'manual-user' | 'agent-workflow' = 'manual-user',
): { updatedAccount: PaperAccount; order: PaperOrder } {
  const validation = validatePaperOrder(action, qty, snapshot, account);
  const now = Date.now();
  const orderId = `PAPER-${now.toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

  if (!validation.canExecute) {
    const rejectedOrder: PaperOrder = {
      orderId,
      runId,
      snapshotId: snapshot.snapshotId,
      ticker: snapshot.ticker,
      side: action === 'buy' ? 'buy' : 'sell',
      qty,
      price: validation.unitPrice,
      fee: validation.estimatedFee,
      totalAmount: validation.netTotal,
      placedAt: now,
      status: 'rejected',
      origin,
      reason: validation.reason ?? 'Validation failed',
    };
    return { updatedAccount: account, order: rejectedOrder };
  }

  if (action === 'buy') {
    const cost = validation.grossAmount;
    const fee = validation.estimatedFee;
    const totalDeducted = validation.netTotal;

    const newCash = roundCents(account.cash - totalDeducted);
    let newPosition: PaperPosition;

    if (account.position && account.position.ticker === snapshot.ticker) {
      const totalContracts = account.position.contracts + qty;
      const combinedBasis = roundCents(account.position.totalCostBasis + cost);
      const avgPrice = roundCents(combinedBasis / totalContracts);
      newPosition = {
        ticker: snapshot.ticker,
        contracts: totalContracts,
        avgEntryPrice: avgPrice,
        totalCostBasis: combinedBasis,
      };
    } else {
      newPosition = {
        ticker: snapshot.ticker,
        contracts: qty,
        avgEntryPrice: validation.unitPrice,
        totalCostBasis: cost,
      };
    }

    const updatedAccount: PaperAccount = {
      cash: newCash,
      position: newPosition,
      realizedPnl: account.realizedPnl,
      totalFeesPaid: roundCents(account.totalFeesPaid + fee),
      lastUpdated: now,
    };

    const order: PaperOrder = {
      orderId,
      runId,
      snapshotId: snapshot.snapshotId,
      ticker: snapshot.ticker,
      side: 'buy',
      qty,
      price: validation.unitPrice,
      fee,
      totalAmount: totalDeducted,
      placedAt: now,
      status: 'filled',
      origin,
      reason: `Filled ${qty} YES @ $${validation.unitPrice.toFixed(2)} (Fee: $${fee.toFixed(2)})`,
    };

    return { updatedAccount, order };
  } else {
    // action === 'close'
    const position = account.position!;
    const proceeds = validation.grossAmount;
    const fee = validation.estimatedFee;
    const netCredit = validation.netTotal;

    const costBasisPortion = roundCents(position.avgEntryPrice * qty);
    const tradePnl = roundCents(proceeds - costBasisPortion - fee);

    const remainingContracts = position.contracts - qty;
    const newCash = roundCents(account.cash + netCredit);
    const newPosition =
      remainingContracts > 0
        ? {
            ...position,
            contracts: remainingContracts,
            totalCostBasis: roundCents(position.avgEntryPrice * remainingContracts),
          }
        : null;

    const updatedAccount: PaperAccount = {
      cash: newCash,
      position: newPosition,
      realizedPnl: roundCents(account.realizedPnl + tradePnl),
      totalFeesPaid: roundCents(account.totalFeesPaid + fee),
      lastUpdated: now,
    };

    const order: PaperOrder = {
      orderId,
      runId,
      snapshotId: snapshot.snapshotId,
      ticker: snapshot.ticker,
      side: 'sell',
      qty,
      price: validation.unitPrice,
      fee,
      totalAmount: netCredit,
      placedAt: now,
      status: 'filled',
      origin,
      reason: `Closed ${qty} YES @ $${validation.unitPrice.toFixed(2)} (P&L: $${tradePnl >= 0 ? '+' : ''}${tradePnl.toFixed(2)})`,
    };

    return { updatedAccount, order };
  }
}

// ── Portfolio Valuation ───────────────────────────────────────────────────────

export interface PositionValuation {
  status: 'active' | 'no-position' | 'stale' | 'unavailable' | 'pending-settlement';
  currentBid: number | null;
  grossValue: number;
  estimatedExitFee: number;
  netExitValue: number;
  unrealizedPnl: number;
  totalEquity: number;
  note: string;
}

export function valuePosition(
  account: PaperAccount,
  snapshot: NormalizedMarketSnapshot | null,
): PositionValuation {
  const position = account.position;

  if (!position || position.contracts <= 0) {
    return {
      status: 'no-position',
      currentBid: null,
      grossValue: 0,
      estimatedExitFee: 0,
      netExitValue: 0,
      unrealizedPnl: 0,
      totalEquity: account.cash,
      note: 'No open position held.',
    };
  }

  if (!snapshot || snapshot.ticker !== position.ticker) {
    return {
      status: 'unavailable',
      currentBid: null,
      grossValue: position.totalCostBasis,
      estimatedExitFee: 0,
      netExitValue: position.totalCostBasis,
      unrealizedPnl: 0,
      totalEquity: roundCents(account.cash + position.totalCostBasis),
      note: 'Market data unavailable for held position.',
    };
  }

  if (snapshot.status === 'closed' || snapshot.status === 'settled') {
    return {
      status: 'pending-settlement',
      currentBid: snapshot.bestYesBid,
      grossValue: position.totalCostBasis,
      estimatedExitFee: 0,
      netExitValue: position.totalCostBasis,
      unrealizedPnl: 0,
      totalEquity: roundCents(account.cash + position.totalCostBasis),
      note: 'Market is closed. Pending official settlement outcome.',
    };
  }

  if (isSnapshotStale(snapshot) || snapshot.bestYesBid === null) {
    return {
      status: 'stale',
      currentBid: snapshot.bestYesBid,
      grossValue: position.totalCostBasis,
      estimatedExitFee: 0,
      netExitValue: position.totalCostBasis,
      unrealizedPnl: 0,
      totalEquity: roundCents(account.cash + position.totalCostBasis),
      note: 'Exit valuation stale or bid quote unavailable.',
    };
  }

  const bid = snapshot.bestYesBid;
  const gross = roundCents(position.contracts * bid);
  const exitFee = calculateKalshiTakerFee(position.contracts, bid);
  const netValue = roundCents(gross - exitFee);
  const unrealized = roundCents(netValue - position.totalCostBasis);
  const equity = roundCents(account.cash + netValue);

  return {
    status: 'active',
    currentBid: bid,
    grossValue: gross,
    estimatedExitFee: exitFee,
    netExitValue: netValue,
    unrealizedPnl: unrealized,
    totalEquity: equity,
    note: `Valued at executable YES bid ($${bid.toFixed(2)}) net of estimated taker fee ($${exitFee.toFixed(2)}).`,
  };
}
