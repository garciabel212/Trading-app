// ─── Agent Trading OS — Paper Trading Domain Types ────────────────────────────
// Contracts for real Kalshi market data, normalized snapshots, paper accounts,
// decimal-safe orders, and decision-trace linkages.

export type KalshiMarketStatus = 'active' | 'closed' | 'settled' | 'unopened' | 'unknown';

/** Raw market structure returned by Kalshi API v2 */
export interface KalshiMarketRaw {
  ticker: string;
  title: string;
  status: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  yes_bid_dollars?: string | null;
  yes_bid_size_fp?: string | null;
  yes_ask_dollars?: string | null;
  yes_ask_size_fp?: string | null;
  last_price_dollars?: string | null;
  volume_24h_fp?: string | null;
  volume_fp?: string | null;
  open_interest_fp?: string | null;
  expiration_time?: string;
  close_time?: string;
  rules_primary?: string;
  rules_secondary?: string;
  updated_time?: string;
}

/** Raw orderbook structure returned by Kalshi API v2 */
export interface KalshiOrderbookRaw {
  orderbook_fp: {
    yes_dollars: [string, string][];
    no_dollars: [string, string][];
  };
}

/**
 * Normalized market quote & depth snapshot.
 * Invariant: Best YES Ask is derived via reciprocal binary pricing:
 * Best YES Ask = 1.00 - (Highest NO Bid)
 */
export interface NormalizedMarketSnapshot {
  snapshotId: string;
  ticker: string;
  marketTitle: string;
  status: KalshiMarketStatus;
  bestYesBid: number | null;
  bestYesBidSize: number;
  bestYesAsk: number | null;
  bestYesAskSize: number;
  spread: number | null;
  lastPrice: number | null;
  sourceTimestamp: number;
  localReceiptTimestamp: number;
  isStale: boolean;
  depth: {
    yesBids: { price: number; size: number }[];
    noBids: { price: number; size: number }[];
  };
}

/** Real-time genuine price observation for chart plotting */
export interface PriceObservation {
  timestamp: number;
  bid: number | null;
  ask: number | null;
  lastPrice: number | null;
}

/** Active held position in YES contracts */
export interface PaperPosition {
  ticker: string;
  contracts: number;
  avgEntryPrice: number;
  totalCostBasis: number;
}

/** Virtual paper account state (initial $1,000 cash) */
export interface PaperAccount {
  cash: number;
  position: PaperPosition | null;
  realizedPnl: number;
  totalFeesPaid: number;
  lastUpdated: number;
}

export type OrderOrigin = 'manual-user' | 'agent-workflow';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'filled' | 'rejected';

/** Paper execution order record with links to trace and market snapshot */
export interface PaperOrder {
  orderId: string;
  runId: string;
  snapshotId: string;
  ticker: string;
  side: OrderSide;
  qty: number;
  price: number;
  fee: number;
  totalAmount: number;
  placedAt: number;
  status: OrderStatus;
  origin: OrderOrigin;
  reason: string;
}

export type ConnectionStatus =
  | 'connected'
  | 'polling'
  | 'stale'
  | 'rate-limited'
  | 'error'
  | 'disconnected';

export interface MarketOption {
  ticker: string;
  title: string;
  category?: string;
}
