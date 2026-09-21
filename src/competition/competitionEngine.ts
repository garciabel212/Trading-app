// ─── Agent Trading OS — Competition Engine ──────────────────────────────────
// Runs the independent decision phase across Trader Alpha, Beta, and Gamma.
// Invariant: Each competitor analyzes the snapshot concurrently and independently,
// with zero awareness of the other competitors' pending decisions.

import type { NormalizedMarketSnapshot } from '../paper/types';
import type {
  CompetitorRole,
  NoTradeDecision,
  TradeProposal,
} from './types';
import { TRADER_ROLES } from './traderProfiles';
import { evaluateMarketForTrader, type TraderDecisionResult } from './proposalEngine';
import {
  loadTraderPortfolio,
  recordNoTrade,
  recordProposal,
} from './portfolioStore';
import { eventBus } from './eventBus';

export interface DecisionBundle {
  bundleId: string;
  timestamp: number;
  snapshot: NormalizedMarketSnapshot;
  decisions: Record<CompetitorRole, TraderDecisionResult>;
  proposals: TradeProposal[];
  noTrades: NoTradeDecision[];
}

export function runIndependentPhase(
  snapshot: NormalizedMarketSnapshot
): DecisionBundle {
  const now = Date.now();
  const bundleId = `bundle-${now}`;

  // Emit market observation
  eventBus.emit({
    id: `evt-market-${now}`,
    type: 'market.observed',
    timestamp: now,
    sourceNode: 'node-market-feed',
    payload: { ticker: snapshot.ticker, title: snapshot.marketTitle },
  });

  const decisions: Record<CompetitorRole, TraderDecisionResult> = {} as any;
  const proposals: TradeProposal[] = [];
  const noTrades: NoTradeDecision[] = [];

  for (const role of TRADER_ROLES) {
    const portfolio = loadTraderPortfolio(role);

    // Emit analysis started
    eventBus.emit({
      id: `evt-analysis-${role}-${now}`,
      type: 'trader.analysis.started',
      timestamp: now,
      sourceNode: `node-trader-${role}`,
      payload: { role, ticker: snapshot.ticker },
    });

    const result = evaluateMarketForTrader(role, snapshot, portfolio.cash);
    decisions[role] = result;

    if (result.type === 'proposal') {
      proposals.push(result.proposal);
      recordProposal(result.proposal);

      eventBus.emit({
        id: `evt-prop-${role}-${now}`,
        type: 'trader.proposal.submitted',
        timestamp: now,
        sourceNode: `node-trader-${role}`,
        targetNode: 'node-portfolio-manager',
        payload: {
          role,
          proposalId: result.proposal.proposalId,
          action: result.proposal.action,
          side: result.proposal.side,
          contracts: result.proposal.contracts,
        },
      });
    } else {
      noTrades.push(result.decision);
      recordNoTrade(result.decision);

      eventBus.emit({
        id: `evt-notrade-${role}-${now}`,
        type: 'trader.notrade.recorded',
        timestamp: now,
        sourceNode: `node-trader-${role}`,
        payload: { role, reason: result.decision.reason, explanation: result.decision.explanation },
      });
    }
  }

  return {
    bundleId,
    timestamp: now,
    snapshot,
    decisions,
    proposals,
    noTrades,
  };
}
