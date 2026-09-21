// ─── Agent Trading OS — Live Crypto & Asset Market Feed ────────────────────────
// Connects to Coinbase Exchange public ticker API for genuine real-time prices,
// spreads, and volume, normalized into the unified market snapshot format.

import type { NormalizedMarketSnapshot, MarketOption } from './types';
import { round4 } from './kalshi';

export const CRYPTO_MARKETS: MarketOption[] = [
  {
    ticker: 'BTC-USD',
    title: 'Bitcoin Spot (BTC / USD)',
    category: 'Crypto Spot',
  },
  {
    ticker: 'ETH-USD',
    title: 'Ethereum Spot (ETH / USD)',
    category: 'Crypto Spot',
  },
  {
    ticker: 'SOL-USD',
    title: 'Solana Spot (SOL / USD)',
    category: 'Crypto Spot',
  },
];

export function isCryptoTicker(ticker: string): boolean {
  return ticker.endsWith('-USD') && !ticker.startsWith('KX');
}

export function getCryptoApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api/coinbase';
  }
  return 'https://api.exchange.coinbase.com';
}

interface CoinbaseTickerResponse {
  price: string;
  bid: string;
  ask: string;
  volume: string;
  time: string;
  trade_id?: number;
  size?: string;
}

/**
 * Fetches live spot market quote for crypto pairs from Coinbase,
 * normalized into the unified NormalizedMarketSnapshot structure.
 */
export async function fetchCryptoSnapshot(
  pair: string,
): Promise<{ snapshot: NormalizedMarketSnapshot | null; error?: string }> {
  const baseUrl = getCryptoApiBaseUrl();
  const receiptTime = Date.now();

  try {
    const res = await fetch(`${baseUrl}/products/${pair}/ticker`, {
      headers: {
        'User-Agent': 'AgentTradingOS/1.0',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 429) {
        return { snapshot: null, error: 'Coinbase rate limit reached. Retrying...' };
      }
      return { snapshot: null, error: `Coinbase API error (HTTP ${res.status})` };
    }

    const data = (await res.json()) as CoinbaseTickerResponse;

    if (!data || !data.price) {
      return { snapshot: null, error: 'Malformed response from Coinbase API' };
    }

    const price = parseFloat(data.price);
    const bid = data.bid ? parseFloat(data.bid) : price * 0.9999;
    const ask = data.ask ? parseFloat(data.ask) : price * 1.0001;
    const spread = round4(ask - bid);

    let sourceTimestamp = receiptTime;
    if (data.time) {
      const parsed = Date.parse(data.time);
      if (!isNaN(parsed)) sourceTimestamp = parsed;
    }

    const vol = parseFloat(data.volume || '0');

    // Build synthetic 3-tier orderbook depth around bid/ask
    const yesBids = [
      { price: round4(bid * 0.9995), size: round4(vol * 0.001) },
      { price: round4(bid * 0.9998), size: round4(vol * 0.002) },
      { price: round4(bid), size: round4(vol * 0.005) },
    ];
    const noBids = [
      { price: round4(ask * 1.0005), size: round4(vol * 0.001) },
      { price: round4(ask * 1.0002), size: round4(vol * 0.002) },
      { price: round4(ask), size: round4(vol * 0.005) },
    ];

    const snapshot: NormalizedMarketSnapshot = {
      snapshotId: `crypto_${pair}_${receiptTime}`,
      ticker: pair,
      marketTitle: `${pair.replace('-', '/')} Spot Market`,
      status: 'active',
      bestYesBid: round4(bid),
      bestYesBidSize: round4(vol * 0.005),
      bestYesAsk: round4(ask),
      bestYesAskSize: round4(vol * 0.005),
      spread,
      lastPrice: round4(price),
      sourceTimestamp,
      localReceiptTimestamp: receiptTime,
      isStale: false,
      depth: {
        yesBids,
        noBids,
      },
    };

    return { snapshot };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { snapshot: null, error: message };
  }
}
