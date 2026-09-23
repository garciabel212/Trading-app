// ─── Agent Trading OS — Research Market Profiles ──────────────────────────────
// Defines the Daily Weather Profile and Nasdaq Composite (ONEQ) Research Profile.
// Invariant: ETF mechanics (shares, dollars, session hours) are kept strictly
// isolated from Weather mechanics (probabilities, settlement payouts).

export type ProfileKey = 'daily-weather' | 'nasdaq-oneq';

export interface MarketProfileConfig {
  key: ProfileKey;
  name: string;
  subtitle: string;
  instrumentType: 'binary_contract' | 'equity_etf';
  tradableSymbol: string;
  benchmarkName: string;
  capitalBudget: number; // $200 total capital model
  sessionHours: string;
  timezone: string;
  quoteSource: string;
  dataStatus: 'live' | 'delayed' | 'historical' | 'fixture';
  valuationModel: string;
  feeStructure: string;
  methods: {
    alpha: { name: string; description: string; status: 'implemented' | 'research_candidate' };
    beta: { name: string; description: string; status: 'implemented' | 'research_candidate' };
    gamma: { name: string; description: string; status: 'implemented' | 'research_candidate' };
  };
}

export const RESEARCH_PROFILES: Record<ProfileKey, MarketProfileConfig> = {
  'daily-weather': {
    key: 'daily-weather',
    name: 'Daily Weather Contract Profile',
    subtitle: 'Kalshi Binary Weather Markets (Temperature & Precipitation)',
    instrumentType: 'binary_contract',
    tradableSymbol: 'KXWARMING-50',
    benchmarkName: 'NOAA Regional Climatology Baseline',
    capitalBudget: 200.0, // $200 total capital model
    sessionHours: '24/7 continuous settlement matching',
    timezone: 'UTC',
    quoteSource: 'Kalshi v2 Public Market API',
    dataStatus: 'fixture',
    valuationModel: 'Outcome probability (0.00 to 1.00) with $1.00 binary settlement payout',
    feeStructure: 'Official Kalshi taker fee: ceil(0.07 * C * P * (1 - P) * 100) / 100',
    methods: {
      alpha: {
        name: 'Forecast Anomaly Dynamics',
        description: 'Monitors short-term weather model revisions and temperature ensemble drift.',
        status: 'implemented',
      },
      beta: {
        name: 'Forecast Expected Value Pricing',
        description: 'Derives fair odds from historical station distributions; requires >=5.0% edge hurdle.',
        status: 'implemented',
      },
      gamma: {
        name: 'Conservative Payoff Fade',
        description: 'Fades extreme consensus probability spikes (>85%) with defined loss downside.',
        status: 'implemented',
      },
    },
  },
  'nasdaq-oneq': {
    key: 'nasdaq-oneq',
    name: 'Nasdaq Composite Research Profile (ONEQ)',
    subtitle: 'Fidelity Nasdaq Composite Tracking Stock ETF (Long-Only Paper Trading)',
    instrumentType: 'equity_etf',
    tradableSymbol: 'ONEQ',
    benchmarkName: 'Nasdaq Composite Index (^IXIC)',
    capitalBudget: 200.0, // $200 total capital model
    sessionHours: 'Regular Market Hours: 09:30 - 16:00',
    timezone: 'America/New_York',
    quoteSource: 'Nasdaq Real-Time Research Feed (Synthetic Fixture)',
    dataStatus: 'fixture',
    valuationModel: 'Dollar-denominated whole-share equity pricing (share count * price)',
    feeStructure: 'Zero-commission simulated paper broker execution ($0.00)',
    methods: {
      alpha: {
        name: 'Opening-Range Breakout (ORB)',
        description: 'Research candidate: Evaluates 15-minute high/low breakout with volume confirmation.',
        status: 'research_candidate',
      },
      beta: {
        name: 'Pullback Within Established Trend',
        description: 'Research candidate: Evaluates EMA retracement entries within prevailing daily trend.',
        status: 'research_candidate',
      },
      gamma: {
        name: 'Mean Reversion Toward Session VWAP',
        description: 'Research candidate: Evaluates 2-sigma deviation fading back to volume-weighted price.',
        status: 'research_candidate',
      },
    },
  },
};

/**
 * Checks whether an equity order satisfies whole-share affordability.
 * Fractional shares are explicitly NOT assumed.
 */
export function checkWholeShareAffordability(
  price: number,
  availableCash: number,
  requestedShares: number
): { affordable: boolean; maxAffordableShares: number; totalCost: number; reason?: string } {
  if (price <= 0) {
    return { affordable: false, maxAffordableShares: 0, totalCost: 0, reason: 'Invalid non-positive price' };
  }
  const maxAffordable = Math.floor(availableCash / price);
  const totalCost = Number((requestedShares * price).toFixed(2));
  if (requestedShares <= 0 || !Number.isInteger(requestedShares)) {
    return {
      affordable: false,
      maxAffordableShares: maxAffordable,
      totalCost: 0,
      reason: 'Requested shares must be a positive whole integer (fractional shares not supported)',
    };
  }
  if (requestedShares > maxAffordable) {
    return {
      affordable: false,
      maxAffordableShares: maxAffordable,
      totalCost,
      reason: `Insufficient cash: ${requestedShares} shares of ONEQ @ $${price.toFixed(2)} require $${totalCost.toFixed(2)}, but available cash is $${availableCash.toFixed(2)} (max affordable: ${maxAffordable} whole shares).`,
    };
  }
  return { affordable: true, maxAffordableShares: maxAffordable, totalCost };
}
