// ─── Agent Trading OS — Kalshi API Normalization & Client ─────────────────────
// Handles reciprocal YES/NO orderbook conversion, Kalshi taker fee formulas,
// and honest error/staleness tracking.

import type {
  KalshiMarketRaw,
  KalshiOrderbookRaw,
  NormalizedMarketSnapshot,
  KalshiMarketStatus,
  MarketOption,
} from './types';

export const CURATED_MARKETS: MarketOption[] = [
  {
    ticker: 'KXOAIANTH-40-ANTH',
    title: 'Will OpenAI or Anthropic IPO first? — Anthropic',
    category: 'Tech & AI Bets',
  },
  {
    ticker: 'KXOAIANTH-40-OAI',
    title: 'Will OpenAI or Anthropic IPO first? — OpenAI',
    category: 'Tech & AI Bets',
  },
  {
    ticker: 'KXRAMPBREX-40-RAMP',
    title: 'Will Ramp or Brex IPO first? — Ramp',
    category: 'Tech & AI Bets',
  },
  {
    ticker: 'KXELONMARS-99',
    title: 'Will Elon Musk visit Mars before Aug 1, 2099?',
    category: 'World & Space Bets',
  },
  {
    ticker: 'KXWARMING-50',
    title: 'Will the world pass 2 degrees Celsius over pre-industrial levels before 2050?',
    category: 'Climate & World Bets',
  },
  {
    ticker: 'KXNEWPOPE-70-PPAR',
    title: 'Who will the next Pope be? — Cardinal Pietro Parolin',
    category: 'Politics & Leadership Bets',
  },
  {
    ticker: 'KXMARSVRAIL-50',
    title: 'Will a human land on Mars before California starts high-speed rail?',
    category: 'Tech & Infrastructure Bets',
  },
  {
    ticker: 'KXERUPTSUPER-0-50JAN01',
    title: 'When will a supervolcano next erupt? — Before 2050',
    category: 'Climate & World Bets',
  },
];

export const KALSHI_POLL_INTERVAL_MS = 3500;
export const STALE_DATA_THRESHOLD_MS = 30000; // 30s

/** Decimal-safe 4-place rounding */
export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Decimal-safe 2-place cents rounding */
export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calculates official Kalshi taker fee:
 * Fee = round_up_to_nearest_cent(0.07 * contracts * price * (1 - price))
 */
export function calculateKalshiTakerFee(qty: number, price: number): number {
  if (qty <= 0 || price <= 0 || price >= 1) return 0;
  const rawFee = 0.07 * qty * price * (1 - price);
  return Math.ceil(rawFee * 100) / 100;
}

/**
 * Checks if a snapshot is stale, considering both the snapshot's flag
 * and the elapsed time since local receipt.
 */
export function isSnapshotStale(
  snapshot: NormalizedMarketSnapshot | null,
  now: number = Date.now(),
): boolean {
  if (!snapshot) return true;
  return snapshot.isStale || now - snapshot.localReceiptTimestamp > STALE_DATA_THRESHOLD_MS;
}

/**
 * Normalizes raw Kalshi orderbook and market data.
 *
 * Invariant: Binary reciprocal pricing:
 *   - highest NO bid at Y implies best YES ask at (1.00 - Y)
 *   - highest YES bid at X implies best NO ask at (1.00 - X)
 */
export function normalizeKalshiOrderbook(
  orderbookRaw: KalshiOrderbookRaw,
  marketRaw: KalshiMarketRaw,
  receiptTime: number = Date.now(),
): NormalizedMarketSnapshot {
  const yesBidsRaw = orderbookRaw?.orderbook_fp?.yes_dollars ?? [];
  const noBidsRaw = orderbookRaw?.orderbook_fp?.no_dollars ?? [];

  // Parse depth arrays (sorted ascending by price in Kalshi v2)
  const yesBids = yesBidsRaw.map(([p, s]) => ({
    price: round4(parseFloat(p)),
    size: round4(parseFloat(s)),
  }));

  const noBids = noBidsRaw.map(([p, s]) => ({
    price: round4(parseFloat(p)),
    size: round4(parseFloat(s)),
  }));

  // Best YES bid is last element in yes_dollars
  let bestYesBid: number | null = null;
  let bestYesBidSize = 0;
  if (yesBids.length > 0) {
    const best = yesBids[yesBids.length - 1];
    bestYesBid = best.price;
    bestYesBidSize = best.size;
  } else if (marketRaw.yes_bid_dollars) {
    bestYesBid = round4(parseFloat(marketRaw.yes_bid_dollars));
    bestYesBidSize = marketRaw.yes_bid_size_fp
      ? round4(parseFloat(marketRaw.yes_bid_size_fp))
      : 0;
  }

  // Best YES ask = 1.00 - (Highest NO bid)
  let bestYesAsk: number | null = null;
  let bestYesAskSize = 0;
  if (noBids.length > 0) {
    const highestNoBid = noBids[noBids.length - 1];
    bestYesAsk = round4(1.0 - highestNoBid.price);
    bestYesAskSize = highestNoBid.size;
  } else if (marketRaw.yes_ask_dollars) {
    bestYesAsk = round4(parseFloat(marketRaw.yes_ask_dollars));
    bestYesAskSize = marketRaw.yes_ask_size_fp
      ? round4(parseFloat(marketRaw.yes_ask_size_fp))
      : 0;
  }

  const spread =
    bestYesAsk !== null && bestYesBid !== null
      ? round4(bestYesAsk - bestYesBid)
      : null;

  const lastPrice = marketRaw.last_price_dollars
    ? round4(parseFloat(marketRaw.last_price_dollars))
    : null;

  let sourceTimestamp = receiptTime;
  if (marketRaw.updated_time) {
    const parsed = Date.parse(marketRaw.updated_time);
    if (!isNaN(parsed)) sourceTimestamp = parsed;
  }

  const isStale = receiptTime - sourceTimestamp > STALE_DATA_THRESHOLD_MS;
  const snapshotId = `snap_${marketRaw.ticker}_${receiptTime}`;

  const status: KalshiMarketStatus =
    marketRaw.status === 'active' ||
    marketRaw.status === 'closed' ||
    marketRaw.status === 'settled' ||
    marketRaw.status === 'unopened'
      ? marketRaw.status
      : 'unknown';

  return {
    snapshotId,
    ticker: marketRaw.ticker,
    marketTitle: marketRaw.title,
    status,
    bestYesBid,
    bestYesBidSize,
    bestYesAsk,
    bestYesAskSize,
    spread,
    lastPrice,
    sourceTimestamp,
    localReceiptTimestamp: receiptTime,
    isStale,
    depth: {
      yesBids,
      noBids,
    },
  };
}

/**
 * Resolves base API URL.
 * In browser environment: uses local proxy `/api/kalshi`.
 * In Node/Vitest environment: uses direct Kalshi endpoint.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api/kalshi';
  }
  return 'https://api.elections.kalshi.com/trade-api/v2';
}

/**
 * Fetch market details and orderbook, returning a normalized snapshot.
 * Never fabricates mock data on failure; reports honest errors.
 */
export async function fetchMarketSnapshot(
  ticker: string,
): Promise<{ snapshot: NormalizedMarketSnapshot | null; error?: string }> {
  const baseUrl = getApiBaseUrl();
  const receiptTime = Date.now();

  try {
    const [mRes, obRes] = await Promise.all([
      fetch(`${baseUrl}/markets/${ticker}`, {
        headers: { 'User-Agent': 'AgentTradingOS/1.0', Accept: 'application/json' },
      }),
      fetch(`${baseUrl}/markets/${ticker}/orderbook`, {
        headers: { 'User-Agent': 'AgentTradingOS/1.0', Accept: 'application/json' },
      }),
    ]);

    if (!mRes.ok) {
      if (mRes.status === 429) {
        return { snapshot: null, error: 'Kalshi rate limit reached (HTTP 429). Stale or paused.' };
      }
      return { snapshot: null, error: `Market fetch failed (HTTP ${mRes.status})` };
    }

    if (!obRes.ok) {
      if (obRes.status === 429) {
        return { snapshot: null, error: 'Kalshi rate limit reached (HTTP 429). Stale or paused.' };
      }
      return { snapshot: null, error: `Orderbook fetch failed (HTTP ${obRes.status})` };
    }

    const mData = (await mRes.json()) as { market?: KalshiMarketRaw } | KalshiMarketRaw;
    const obData = (await obRes.json()) as KalshiOrderbookRaw;

    const marketRaw: KalshiMarketRaw =
      (mData as { market?: KalshiMarketRaw }).market ?? (mData as KalshiMarketRaw);

    if (!marketRaw || !marketRaw.ticker) {
      return { snapshot: null, error: 'Market data missing from API response' };
    }

    // For live API fetches, the orderbook snapshot received just now is fresh.
    // Kalshi's market.updated_time only tracks the last trade or metadata revision,
    // which may be historical even while resting limit orders are actively traded.
    const marketWithFreshTimestamp: KalshiMarketRaw = {
      ...marketRaw,
      updated_time: new Date(receiptTime).toISOString(),
    };

    const snapshot = normalizeKalshiOrderbook(obData, marketWithFreshTimestamp, receiptTime);
    return { snapshot };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { snapshot: null, error: message };
  }
}
