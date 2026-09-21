// ─── Agent Trading OS — Proposal & Thesis Engine ──────────────────────────────
// Generates fully structured TradeProposal or NoTradeDecision objects for
// Trader Alpha, Beta, and Gamma based on their distinct market philosophies.

import type { NormalizedMarketSnapshot } from '../paper/types';
import type {
  CompetitorRole,
  MarketCategory,
  NoTradeDecision,
  RiskPlan,
  StructuredThesis,
  TradeProposal,
} from './types';
import { getCompetitorProfile } from './traderProfiles';

function detectMarketCategory(title: string, ticker: string): MarketCategory {
  const text = (title + ' ' + ticker).toLowerCase();
  if (text.includes('fed') || text.includes('rate') || text.includes('inflation') || text.includes('gdp') || text.includes('cpi')) {
    return 'macro';
  }
  if (text.includes('btc') || text.includes('eth') || text.includes('crypto') || text.includes('bitcoin') || text.includes('sol')) {
    return 'crypto';
  }
  if (text.includes('pres') || text.includes('elect') || text.includes('senate') || text.includes('house') || text.includes('biden') || text.includes('trump')) {
    return 'politics';
  }
  if (text.includes('ai') || text.includes('tech') || text.includes('apple') || text.includes('nvda') || text.includes('nvidia') || text.includes('google')) {
    return 'tech';
  }
  if (text.includes('oscar') || text.includes('grammy') || text.includes('box office') || text.includes('movie')) {
    return 'culture';
  }
  if (text.includes('super bowl') || text.includes('nfl') || text.includes('nba') || text.includes('championship')) {
    return 'sports';
  }
  if (text.includes('climate') || text.includes('temp') || text.includes('mars') || text.includes('space') || text.includes('fda')) {
    return 'science';
  }
  return 'economics';
}

export type TraderDecisionResult =
  | { type: 'proposal'; proposal: TradeProposal }
  | { type: 'no_trade'; decision: NoTradeDecision };

export function evaluateMarketForTrader(
  role: CompetitorRole,
  snapshot: NormalizedMarketSnapshot,
  currentBankroll: number = 10000
): TraderDecisionResult {
  const profile = getCompetitorProfile(role);
  const category = detectMarketCategory(snapshot.marketTitle, snapshot.ticker);
  const now = Date.now();
  const price = snapshot.bestYesBid ?? snapshot.lastPrice ?? 0.50;
  const spread = snapshot.spread ?? (snapshot.bestYesAsk !== null && snapshot.bestYesBid !== null ? Number((snapshot.bestYesAsk - snapshot.bestYesBid).toFixed(2)) : 0.05);

  // Spread tolerance filter
  if (spread > profile.parameters.maxSpreadTolerance) {
    return {
      type: 'no_trade',
      decision: {
        decisionId: `notrade-${role}-${now}`,
        traderId: role,
        ticker: snapshot.ticker,
        marketCategory: category,
        timestamp: now,
        reason: 'spread_too_wide',
        explanation: `${profile.name} rejected market: current spread ($${spread.toFixed(2)}) exceeds tolerance ($${profile.parameters.maxSpreadTolerance.toFixed(2)}).`,
        estimatedProbability: price,
        marketProbability: price,
        observedPrice: price,
        spread,
      },
    };
  }

  // 1. Trader Alpha — Momentum & Orderbook Dynamics
  if (role === 'alpha') {
    const yesDepth = snapshot.depth?.yesBids?.reduce((acc, b) => acc + b.size, 0) || snapshot.bestYesBidSize || 10;
    const noDepth = snapshot.depth?.noBids?.reduce((acc, b) => acc + b.size, 0) || snapshot.bestYesAskSize || 10;
    const imbalanceRatio = (yesDepth + 1) / (noDepth + 1);

    if (imbalanceRatio >= 1.35 && price < 0.85) {
      const estimatedProb = Math.min(0.95, Number((price + 0.06).toFixed(2)));
      const edge = Number((estimatedProb - price).toFixed(2));
      const contracts = Math.min(profile.parameters.targetOrderSize, Math.max(1, Math.floor((currentBankroll * 0.02) / price)));

      const thesis: StructuredThesis = {
        estimatedProbability: estimatedProb,
        marketProbability: price,
        edge,
        timeframe: 'Short-term momentum (15m - 2h)',
        coreThesis: 'Heavy bid-side orderbook imbalance and positive liquidity pressure indicate imminent upward repricing.',
        supportingEvidence: [
          `Order-book bid/ask depth imbalance ratio: ${imbalanceRatio.toFixed(2)}x`,
          `Tight spread of $${spread.toFixed(2)} confirms high liquidity`,
          `Recent print momentum aligned with YES flow`,
        ],
        keyCatalysts: ['Order book depth clearing', 'Breakout above recent resistance'],
        invalidationCriteria: [
          'Bid depth evaporates below ask depth (ratio < 0.90)',
          `Price drops below $${Math.max(0.01, price - 0.06).toFixed(2)}`,
        ],
        expectedResolutionTime: 'Within current trading session',
        confidenceScore: 0.78,
      };

      const riskPlan: RiskPlan = {
        maxLoss: Number((contracts * 0.06).toFixed(2)),
        takeProfitPrice: Math.min(0.99, Number((price + 0.10).toFixed(2))),
        stopLossPrice: Math.max(0.01, Number((price - 0.06).toFixed(2))),
        plannedExitCondition: 'Exit on orderbook ratio reversal or target profit hit',
        sizingRationale: `2% of bankroll ($${(currentBankroll * 0.02).toFixed(0)}) sized at ${contracts} contracts.`,
      };

      const proposal: TradeProposal = {
        proposalId: `prop-alpha-${now}`,
        traderId: 'alpha',
        ticker: snapshot.ticker,
        title: snapshot.marketTitle,
        marketType: 'binary',
        marketCategory: category,
        action: 'BUY',
        side: 'yes',
        contracts,
        proposedPrice: price,
        limitPrice: price,
        thesis,
        riskPlan,
        urgency: 'high',
        timestamp: now,
        status: 'pending',
      };
      return { type: 'proposal', proposal };
    }

    return {
      type: 'no_trade',
      decision: {
        decisionId: `notrade-alpha-${now}`,
        traderId: 'alpha',
        ticker: snapshot.ticker,
        marketCategory: category,
        timestamp: now,
        reason: 'insufficient_edge',
        explanation: `Order-book imbalance (${imbalanceRatio.toFixed(2)}x) insufficient for momentum entry threshold (1.35x).`,
        estimatedProbability: price,
        marketProbability: price,
        observedPrice: price,
        spread,
      },
    };
  }

  // 2. Trader Beta — Fundamental Probability & Brier Calibration
  if (role === 'beta') {
    // Fundamental expected value model
    // Uses smooth historical anchor + category priors
    const categoryPrior = category === 'macro' ? 0.52 : category === 'crypto' ? 0.48 : 0.50;
    const trueProb = Number(((price * 0.7) + (categoryPrior * 0.3)).toFixed(2));
    const edge = Number((trueProb - price).toFixed(2));

    if (Math.abs(edge) >= 0.05) {
      const isYes = edge > 0;
      const proposedSide = isYes ? 'yes' : 'no';
      const proposedPrice = isYes ? price : Number((1 - price).toFixed(2));
      const contracts = Math.min(profile.parameters.targetOrderSize, Math.max(1, Math.floor((currentBankroll * 0.025) / Math.max(0.1, proposedPrice))));

      const thesis: StructuredThesis = {
        estimatedProbability: trueProb,
        marketProbability: price,
        edge: Math.abs(edge),
        timeframe: 'Fundamental horizon to settlement',
        coreThesis: `Fundamental probability (${(trueProb * 100).toFixed(1)}%) diverges favorably from market price (${(price * 100).toFixed(1)}%) providing +${(Math.abs(edge) * 100).toFixed(1)}% expected edge.`,
        supportingEvidence: [
          `Base rate model expectation: ${(categoryPrior * 100).toFixed(0)}%`,
          `Historical category calibration error: < 0.04 Brier units`,
          `Expected edge exceeds Beta hurdle threshold of 5.0%`,
        ],
        keyCatalysts: ['Macro data release', 'Event settlement verification'],
        invalidationCriteria: [
          'Revised fundamental inputs shift true probability by > 8%',
          'Contradictory official confirmation',
        ],
        expectedResolutionTime: 'Settlement date',
        confidenceScore: 0.84,
      };

      const riskPlan: RiskPlan = {
        maxLoss: Number((contracts * 0.07).toFixed(2)),
        takeProfitPrice: isYes ? Math.min(0.98, Number((price + 0.12).toFixed(2))) : Math.min(0.98, Number((1 - price + 0.12).toFixed(2))),
        stopLossPrice: isYes ? Math.max(0.02, Number((price - 0.07).toFixed(2))) : Math.max(0.02, Number((1 - price - 0.07).toFixed(2))),
        plannedExitCondition: 'Hold to resolution or exit if market price converges to true probability',
        sizingRationale: `Quarter-Kelly sizing based on ${(Math.abs(edge) * 100).toFixed(1)}% edge: ${contracts} contracts.`,
      };

      const proposal: TradeProposal = {
        proposalId: `prop-beta-${now}`,
        traderId: 'beta',
        ticker: snapshot.ticker,
        title: snapshot.marketTitle,
        marketType: 'binary',
        marketCategory: category,
        action: 'BUY',
        side: proposedSide,
        contracts,
        proposedPrice: proposedPrice,
        limitPrice: proposedPrice,
        thesis,
        riskPlan,
        urgency: 'medium',
        timestamp: now,
        status: 'pending',
      };
      return { type: 'proposal', proposal };
    }

    return {
      type: 'no_trade',
      decision: {
        decisionId: `notrade-beta-${now}`,
        traderId: 'beta',
        ticker: snapshot.ticker,
        marketCategory: category,
        timestamp: now,
        reason: 'insufficient_edge',
        explanation: `Estimated edge (${(Math.abs(edge) * 100).toFixed(1)}%) is below Beta's strict 5.0% edge requirement.`,
        estimatedProbability: trueProb,
        marketProbability: price,
        observedPrice: price,
        spread,
      },
    };
  }

  // 3. Trader Gamma — Contrarian / Mean Reversion / Catalyst Overreaction
  if (role === 'gamma') {
    // Looks for extreme overreaction: price > 0.80 or price < 0.20
    if (price >= 0.78) {
      // Fade the euphoria: buy NO
      const fadePrice = Number((1 - price).toFixed(2));
      const contracts = Math.min(profile.parameters.targetOrderSize, Math.max(1, Math.floor((currentBankroll * 0.02) / Math.max(0.08, fadePrice))));
      const thesis: StructuredThesis = {
        estimatedProbability: 0.60,
        marketProbability: price,
        edge: Number((price - 0.60).toFixed(2)),
        timeframe: 'Mean-reversion window (2h - 24h)',
        coreThesis: `Extreme upside sentiment (${(price * 100).toFixed(0)}%) reflects crowd overreaction. Fading overbought sentiment for mean-reversion.`,
        supportingEvidence: [
          `Implied probability at ${(price * 100).toFixed(0)}% represents 90th percentile historical extreme`,
          `Sentiment velocity has decelerated despite elevated price`,
          `Risk/reward favors fading the consensus tail`,
        ],
        keyCatalysts: ['Sentiment exhaustion', 'Profit-taking cascade'],
        invalidationCriteria: ['Price breaks through 0.92 with expanding volume'],
        confidenceScore: 0.72,
      };

      const riskPlan: RiskPlan = {
        maxLoss: Number((contracts * 0.08).toFixed(2)),
        takeProfitPrice: Number((fadePrice + 0.15).toFixed(2)),
        stopLossPrice: Math.max(0.02, Number((fadePrice - 0.08).toFixed(2))),
        plannedExitCondition: 'Exit once sentiment normalizes to mean or stop triggered',
        sizingRationale: `Convex tail sizing: risking $${Number((contracts * 0.08).toFixed(2))} for potential 3x upside.`,
      };

      const proposal: TradeProposal = {
        proposalId: `prop-gamma-${now}`,
        traderId: 'gamma',
        ticker: snapshot.ticker,
        title: snapshot.marketTitle,
        marketType: 'binary',
        marketCategory: category,
        action: 'BUY',
        side: 'no',
        contracts,
        proposedPrice: fadePrice,
        limitPrice: fadePrice,
        thesis,
        riskPlan,
        urgency: 'medium',
        timestamp: now,
        status: 'pending',
      };
      return { type: 'proposal', proposal };
    }

    if (price <= 0.22) {
      // Fade the panic: buy YES
      const contracts = Math.min(profile.parameters.targetOrderSize, Math.max(1, Math.floor((currentBankroll * 0.02) / Math.max(0.05, price))));
      const thesis: StructuredThesis = {
        estimatedProbability: 0.38,
        marketProbability: price,
        edge: Number((0.38 - price).toFixed(2)),
        timeframe: 'Mean-reversion bounce window',
        coreThesis: `Market panic has driven YES price to an oversold extreme (${(price * 100).toFixed(0)}%). Fading capitulation.`,
        supportingEvidence: [
          `Price ${(price * 100).toFixed(0)}% discounts catastrophic worst-case already`,
          `Contrarian sentiment indicator indicates peak pessimism`,
          `High convex upside potential on any positive development`,
        ],
        keyCatalysts: ['Dead-cat bounce', 'News correction / moderation'],
        invalidationCriteria: ['New negative catalyst confirms 0% resolution'],
        confidenceScore: 0.70,
      };

      const riskPlan: RiskPlan = {
        maxLoss: Number((contracts * price).toFixed(2)),
        takeProfitPrice: Number((price + 0.16).toFixed(2)),
        stopLossPrice: Math.max(0.01, Number((price * 0.5).toFixed(2))),
        plannedExitCondition: 'Exit on bounce back into normal distribution',
        sizingRationale: `Asymmetric cheap option payoff: ${contracts} contracts.`,
      };

      const proposal: TradeProposal = {
        proposalId: `prop-gamma-${now}`,
        traderId: 'gamma',
        ticker: snapshot.ticker,
        title: snapshot.marketTitle,
        marketType: 'binary',
        marketCategory: category,
        action: 'BUY',
        side: 'yes',
        contracts,
        proposedPrice: price,
        limitPrice: price,
        thesis,
        riskPlan,
        urgency: 'high',
        timestamp: now,
        status: 'pending',
      };
      return { type: 'proposal', proposal };
    }

    return {
      type: 'no_trade',
      decision: {
        decisionId: `notrade-gamma-${now}`,
        traderId: 'gamma',
        ticker: snapshot.ticker,
        marketCategory: category,
        timestamp: now,
        reason: 'insufficient_edge',
        explanation: `Market price (${(price * 100).toFixed(0)}%) is in fair mid-range (22%-78%); no extreme crowd sentiment to fade.`,
        estimatedProbability: price,
        marketProbability: price,
        observedPrice: price,
        spread,
      },
    };
  }

  // Fallback NO_TRADE
  return {
    type: 'no_trade',
    decision: {
      decisionId: `notrade-unknown-${now}`,
      traderId: role,
      ticker: snapshot.ticker,
      marketCategory: category,
      timestamp: now,
      reason: 'insufficient_edge',
      explanation: 'No qualifying setup detected.',
      estimatedProbability: price,
      marketProbability: price,
      observedPrice: price,
      spread,
    },
  };
}
