// ─── Agent Trading OS — Paper Trading Verification Tests ─────────────────────
// Comprehensive tests for:
// 1. Bid/Ask normalization via reciprocal binary pricing
// 2. Official Kalshi taker fee accounting
// 3. Purchase & close accounting (cash debits, proceeds credits, realized P&L)
// 4. Rejections: stale data, insufficient cash, insufficient liquidity, closed markets
// 5. Short selling & leverage prevention
// 6. Portfolio valuation at executable quotes (and pending settlement for closed markets)
// 7. Decision trace linkage & replay idempotency
// 8. Live Kalshi market data fetch demonstration (with honest error reporting)

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateKalshiTakerFee,
  normalizeKalshiOrderbook,
  roundCents,
  fetchMarketSnapshot,
  CURATED_MARKETS,
} from '../paper/kalshi';
import {
  INITIAL_PAPER_ACCOUNT,
  executePaperTrade,
  validatePaperOrder,
  valuePosition,
} from '../paper/account';
import { buildPaperTradeRunRecord } from '../paper/paperTraceBridge';
import type {
  KalshiMarketRaw,
  KalshiOrderbookRaw,
  NormalizedMarketSnapshot,
  PaperAccount,
} from '../paper/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function createMockMarket(overrides: Partial<KalshiMarketRaw> = {}): KalshiMarketRaw {
  return {
    ticker: 'KXTEST-01',
    title: 'Will Test Event happen before 2030?',
    status: 'active',
    yes_bid_dollars: '0.0900',
    yes_ask_dollars: '0.1200',
    last_price_dollars: '0.1200',
    updated_time: new Date().toISOString(),
    ...overrides,
  };
}

function createMockOrderbook(overrides: Partial<KalshiOrderbookRaw['orderbook_fp']> = {}): KalshiOrderbookRaw {
  return {
    orderbook_fp: {
      yes_dollars: [
        ['0.0100', '1000.00'],
        ['0.0500', '200.00'],
        ['0.0900', '50.00'], // Best YES bid: $0.09, size 50
      ],
      no_dollars: [
        ['0.5000', '300.00'],
        ['0.8000', '100.00'],
        ['0.8800', '40.00'], // Highest NO bid: $0.88 -> Best YES ask: 1.00 - 0.88 = $0.12, size 40
      ],
      ...overrides,
    },
  };
}

function createFreshSnapshot(overrides: Partial<NormalizedMarketSnapshot> = {}): NormalizedMarketSnapshot {
  const m = createMockMarket();
  const ob = createMockOrderbook();
  const base = normalizeKalshiOrderbook(ob, m, Date.now());
  return { ...base, ...overrides };
}

// ── 1. Bid/Ask Normalization & Reciprocal Pricing ──────────────────────────────

describe('1. Normalization & Reciprocal Pricing', () => {
  it('correctly derives best YES ask from highest NO bid (1.00 - highest_no_bid)', () => {
    const market = createMockMarket();
    const orderbook = createMockOrderbook({
      no_dollars: [
        ['0.4000', '50.00'],
        ['0.7500', '25.00'], // Highest NO bid: $0.75 -> Best YES ask: $0.25, size 25
      ],
      yes_dollars: [
        ['0.2000', '30.00'], // Best YES bid: $0.20, size 30
      ],
    });

    const snapshot = normalizeKalshiOrderbook(orderbook, market, Date.now());

    expect(snapshot.bestYesBid).toBe(0.2);
    expect(snapshot.bestYesBidSize).toBe(30);
    expect(snapshot.bestYesAsk).toBe(0.25);
    expect(snapshot.bestYesAskSize).toBe(25);
    expect(snapshot.spread).toBe(0.05);
  });

  it('marks data as stale when receipt time is >30s after source timestamp', () => {
    const now = Date.now();
    const oldTime = new Date(now - 45000).toISOString();
    const market = createMockMarket({ updated_time: oldTime });
    const orderbook = createMockOrderbook();

    const snapshot = normalizeKalshiOrderbook(orderbook, market, now);
    expect(snapshot.isStale).toBe(true);
  });
});

// ── 2. Official Kalshi Taker Fee Formula ───────────────────────────────────────

describe('2. Kalshi Taker Fee Accounting', () => {
  it('matches documented formula: ceil(0.07 * C * P * (1 - P) * 100) / 100', () => {
    // 10 contracts @ $0.50 (maximum uncertainty point)
    // 0.07 * 10 * 0.50 * 0.50 = 0.175 -> rounds up to $0.18
    expect(calculateKalshiTakerFee(10, 0.5)).toBe(0.18);

    // 5 contracts @ $0.12
    // 0.07 * 5 * 0.12 * 0.88 = 0.03696 -> rounds up to $0.04
    expect(calculateKalshiTakerFee(5, 0.12)).toBe(0.04);

    // 1 contract @ $0.40
    // 0.07 * 1 * 0.40 * 0.60 = 0.0168 -> rounds up to $0.02
    expect(calculateKalshiTakerFee(1, 0.4)).toBe(0.02);

    // Extreme boundaries
    expect(calculateKalshiTakerFee(0, 0.5)).toBe(0);
    expect(calculateKalshiTakerFee(10, 0)).toBe(0);
    expect(calculateKalshiTakerFee(10, 1.0)).toBe(0);
  });
});

// ── 3. Purchase & Close Accounting ────────────────────────────────────────────

describe('3. Purchase & Close Ledger Accounting', () => {
  let account: PaperAccount;
  let snapshot: NormalizedMarketSnapshot;

  beforeEach(() => {
    account = { ...INITIAL_PAPER_ACCOUNT, cash: 1000.0 };
    // Best YES bid $0.09 (size 50), Best YES ask $0.12 (size 40)
    snapshot = createFreshSnapshot();
  });

  it('buying YES contracts debits gross cost + taker fee and updates position', () => {
    const qty = 5;
    const askPrice = snapshot.bestYesAsk!; // 0.12
    const grossCost = roundCents(qty * askPrice); // 0.60
    const fee = calculateKalshiTakerFee(qty, askPrice); // 0.04
    const totalDeducted = roundCents(grossCost + fee); // 0.64

    const { updatedAccount, order } = executePaperTrade(
      'buy',
      qty,
      snapshot,
      account,
      'run-buy-1',
    );

    expect(order.status).toBe('filled');
    expect(order.fee).toBe(fee);
    expect(order.totalAmount).toBe(totalDeducted);

    expect(updatedAccount.cash).toBe(roundCents(1000.0 - totalDeducted)); // $999.36
    expect(updatedAccount.totalFeesPaid).toBe(fee); // $0.04
    expect(updatedAccount.position).toEqual({
      ticker: snapshot.ticker,
      contracts: qty,
      avgEntryPrice: askPrice,
      totalCostBasis: grossCost,
    });
  });

  it('closing YES contracts credits net proceeds (gross - fee) and calculates realized P&L', () => {
    // Start with existing position of 5 YES @ $0.12 ($0.60 basis), cash $999.36, fees $0.04
    const initialCash = 999.36;
    const initialFees = 0.04;
    account = {
      cash: initialCash,
      position: {
        ticker: snapshot.ticker,
        contracts: 5,
        avgEntryPrice: 0.12,
        totalCostBasis: 0.6,
      },
      realizedPnl: 0,
      totalFeesPaid: initialFees,
      lastUpdated: Date.now(),
    };

    // Close all 5 contracts at best bid $0.09
    const qty = 5;
    const bidPrice = snapshot.bestYesBid!; // 0.09
    const grossProceeds = roundCents(qty * bidPrice); // 0.45
    const exitFee = calculateKalshiTakerFee(qty, bidPrice); // 0.03
    const netProceeds = roundCents(grossProceeds - exitFee); // 0.42
    const tradePnl = roundCents(grossProceeds - 0.6 - exitFee); // 0.45 - 0.60 - 0.03 = -0.18

    const { updatedAccount, order } = executePaperTrade(
      'close',
      qty,
      snapshot,
      account,
      'run-close-1',
    );

    expect(order.status).toBe('filled');
    expect(order.fee).toBe(exitFee);
    expect(order.totalAmount).toBe(netProceeds);

    expect(updatedAccount.cash).toBe(roundCents(initialCash + netProceeds)); // 999.36 + 0.42 = $999.78
    expect(updatedAccount.realizedPnl).toBe(tradePnl); // -$0.18
    expect(updatedAccount.totalFeesPaid).toBe(roundCents(initialFees + exitFee)); // $0.07
    expect(updatedAccount.position).toBeNull(); // Position completely closed

    // Overall reconciliation:
    // Started with $1000.00 cash -> ending cash is $999.78.
    // Total cash decrease: $0.22 ($0.15 price loss + $0.04 entry fee + $0.03 exit fee = $0.22)
    expect(roundCents(1000.0 - updatedAccount.cash)).toBe(0.22);
  });
});

// ── 4. Pre-Execution Rejections & Boundary Checks ─────────────────────────────

describe('4. Pre-Execution Rejections', () => {
  let account: PaperAccount;
  let snapshot: NormalizedMarketSnapshot;

  beforeEach(() => {
    account = { ...INITIAL_PAPER_ACCOUNT, cash: 1000.0 };
    snapshot = createFreshSnapshot(); // ask size: 40, bid size: 50
  });

  it('rejects buy when quantity exceeds available ask liquidity', () => {
    // Set ask size to 4; request 5 (within risk limit <= 10, but exceeds liquidity)
    const lowLiqSnapshot = { ...snapshot, bestYesAskSize: 4 };
    const validation = validatePaperOrder('buy', 5, lowLiqSnapshot, account);
    expect(validation.canExecute).toBe(false);
    expect(validation.reason).toMatch(/insufficient.*liquidity/i);

    const { updatedAccount, order } = executePaperTrade('buy', 5, lowLiqSnapshot, account, 'run-fail-1');
    expect(order.status).toBe('rejected');
    expect(updatedAccount.cash).toBe(1000.0); // Cash untouched
  });

  it('rejects buy when cash is insufficient for cost + taker fee', () => {
    const poorAccount = { ...account, cash: 0.5 }; // Only $0.50 cash
    const validation = validatePaperOrder('buy', 5, snapshot, poorAccount); // Cost is $0.64
    expect(validation.canExecute).toBe(false);
    expect(validation.reason).toMatch(/insufficient cash/i);
  });

  it('rejects trade when market snapshot is stale', () => {
    const staleSnapshot = { ...snapshot, isStale: true };
    const validation = validatePaperOrder('buy', 5, staleSnapshot, account);
    expect(validation.canExecute).toBe(false);
    expect(validation.reason).toMatch(/stale/i);
  });

  it('rejects trade when market status is closed or settled', () => {
    const closedSnapshot = { ...snapshot, status: 'closed' as const };
    const validation = validatePaperOrder('buy', 5, closedSnapshot, account);
    expect(validation.canExecute).toBe(false);
    expect(validation.reason).toMatch(/status is "closed"/i);
  });

  it('strictly forbids short selling (cannot close without position)', () => {
    expect(account.position).toBeNull();
    const validation = validatePaperOrder('close', 5, snapshot, account);
    expect(validation.canExecute).toBe(false);
    expect(validation.reason).toMatch(/no open yes position/i);
  });

  it('strictly forbids selling more contracts than held', () => {
    const holdingAccount = {
      ...account,
      position: { ticker: snapshot.ticker, contracts: 3, avgEntryPrice: 0.12, totalCostBasis: 0.36 },
    };
    const validation = validatePaperOrder('close', 5, snapshot, holdingAccount);
    expect(validation.canExecute).toBe(false);
    expect(validation.reason).toMatch(/only 3 held/i);
  });
});

// ── 5. Portfolio Valuation & Closed Market State ───────────────────────────────

describe('5. Portfolio Valuation', () => {
  it('values position at current executable YES bid net of estimated exit fee', () => {
    const account: PaperAccount = {
      cash: 950.0,
      position: { ticker: 'KXTEST-01', contracts: 10, avgEntryPrice: 0.10, totalCostBasis: 1.0 },
      realizedPnl: 0,
      totalFeesPaid: 0.07,
      lastUpdated: Date.now(),
    };

    // Bid price is $0.15
    const snapshot = createFreshSnapshot({ bestYesBid: 0.15, bestYesBidSize: 50 });
    const valuation = valuePosition(account, snapshot);

    expect(valuation.status).toBe('active');
    expect(valuation.grossValue).toBe(1.5); // 10 * 0.15
    // Exit fee: 0.07 * 10 * 0.15 * 0.85 = 0.08925 -> 0.09
    expect(valuation.estimatedExitFee).toBe(0.09);
    expect(valuation.netExitValue).toBe(1.41); // 1.50 - 0.09
    expect(valuation.unrealizedPnl).toBe(0.41); // 1.41 - 1.00 basis
    expect(valuation.totalEquity).toBe(951.41); // 950 + 1.41
  });

  it('shows pending settlement and does NOT invent closing value when market closes', () => {
    const account: PaperAccount = {
      cash: 950.0,
      position: { ticker: 'KXTEST-01', contracts: 10, avgEntryPrice: 0.10, totalCostBasis: 1.0 },
      realizedPnl: 0,
      totalFeesPaid: 0.07,
      lastUpdated: Date.now(),
    };

    const closedSnapshot = createFreshSnapshot({ status: 'closed' });
    const valuation = valuePosition(account, closedSnapshot);

    expect(valuation.status).toBe('pending-settlement');
    expect(valuation.note).toMatch(/pending official settlement/i);
  });
});

// ── 6. Decision Trace Bridge & Replay Idempotency ─────────────────────────────

describe('6. Decision Trace Bridge & Replay Idempotency', () => {
  it('builds a complete 6-stage RunRecord linking to snapshotId and runId', () => {
    const account = { ...INITIAL_PAPER_ACCOUNT };
    const snapshot = createFreshSnapshot();
    const { updatedAccount, order } = executePaperTrade('buy', 5, snapshot, account, 'run-test-bridge');
    const validation = validatePaperOrder('buy', 5, snapshot, account);

    const record = buildPaperTradeRunRecord(
      'buy',
      5,
      snapshot,
      account,
      updatedAccount,
      order,
      validation,
    );

    expect(record.runId).toBe('run-test-bridge');
    expect(record.events).toHaveLength(12); // start and complete for 6 stages

    // Check risk event
    const riskEvent = record.events.find((e) => e.nodeId === 'risk-engine' && e.eventType === 'node-complete');
    expect(riskEvent).toBeDefined();
    expect(riskEvent?.ruleVerdict?.passed).toBe(true);

    // Check execution event
    const execEvent = record.events.find((e) => e.nodeId === 'paper-execution' && e.eventType === 'node-complete');
    expect(execEvent).toBeDefined();
    expect((execEvent?.output as any)?.snapshotId).toBe(snapshot.snapshotId);

    // Check evaluation event
    const evalEvent = record.events.find((e) => e.nodeId === 'evaluation' && e.eventType === 'node-complete');
    expect((evalEvent?.output as any)?.overallPassed).toBe(true);
  });

  it('replaying a paper trade trace leaves account cash and order counts unchanged', () => {
    const account = { ...INITIAL_PAPER_ACCOUNT };
    const snapshot = createFreshSnapshot();
    const { updatedAccount, order } = executePaperTrade('buy', 5, snapshot, account, 'run-idempotency');
    const initialCash = updatedAccount.cash;

    // Simulate arbitrary inspection / replay
    const record = buildPaperTradeRunRecord('buy', 5, snapshot, account, updatedAccount, order, {
      canExecute: true,
      unitPrice: 0.12,
      grossAmount: 0.6,
      estimatedFee: 0.04,
      netTotal: 0.64,
    });

    // Inspecting record does not mutate paper ledger
    expect(updatedAccount.cash).toBe(initialCash);
    expect(record.paperOrders).toHaveLength(1);
  });
});

// ── 7. Real Data Fetch Demonstration ──────────────────────────────────────────

describe('7. Live Kalshi API Data Fetch Demonstration', () => {
  it('successfully fetches real binary market data or honestly reports API limitation', async () => {
    const ticker = 'KXELONMARS-99';
    const result = await fetchMarketSnapshot(ticker);

    if (result.snapshot) {
      // Successful live fetch
      expect(result.snapshot.ticker).toBe(ticker);
      expect(result.snapshot.marketTitle).toBeTruthy();
      expect(result.snapshot.bestYesBid).toBeTypeOf('number');
      expect(result.snapshot.bestYesAsk).toBeTypeOf('number');
      expect(result.snapshot.snapshotId).toContain(ticker);
      console.log(
        `✓ Live Kalshi Market Data: ${result.snapshot.ticker} Bid: $${result.snapshot.bestYesBid} / Ask: $${result.snapshot.bestYesAsk}`,
      );
    } else {
      // If network or rate limit occurred, verify real error was honestly reported
      expect(result.error).toBeTruthy();
      console.log(`[Notice: Live Kalshi fetch returned: ${result.error}]`);
    }
  });

  it('verifies high-volume active prediction bets are available in CURATED_MARKETS', () => {
    const tickers = CURATED_MARKETS.map((m) => m.ticker);
    expect(tickers).toContain('KXOAIANTH-40-ANTH');
    expect(tickers).toContain('KXOAIANTH-40-OAI');
    expect(tickers).toContain('KXELONMARS-99');
  });

  it('correctly identifies and normalizes live crypto spot markets', async () => {
    const { isCryptoTicker, fetchCryptoSnapshot, CRYPTO_MARKETS } = await import('../paper/crypto');

    expect(isCryptoTicker('BTC-USD')).toBe(true);
    expect(isCryptoTicker('ETH-USD')).toBe(true);
    expect(isCryptoTicker('KXELONMARS-99')).toBe(false);

    expect(CRYPTO_MARKETS.length).toBeGreaterThanOrEqual(3);

    const result = await fetchCryptoSnapshot('BTC-USD');
    if (result.snapshot) {
      expect(result.snapshot.ticker).toBe('BTC-USD');
      expect(result.snapshot.bestYesBid).toBeGreaterThan(0);
      expect(result.snapshot.bestYesAsk).toBeGreaterThan(0);
      expect(result.snapshot.lastPrice).toBeGreaterThan(0);
      console.log(`✓ Live Coinbase BTC-USD Quote: $${result.snapshot.lastPrice} (Bid: $${result.snapshot.bestYesBid} / Ask: $${result.snapshot.bestYesAsk})`);
    } else {
      expect(result.error).toBeTruthy();
    }
  });
});
