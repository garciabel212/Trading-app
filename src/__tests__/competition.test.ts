// ─── Agent Trading OS — Multi-Agent Competition Unit Tests ───────────────────
// Validates Trader Alpha, Beta, Gamma, Portfolio Manager, Coach Evaluator,
// structured TradeProposals, NoTradeDecisions, and composite scoring metrics.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_BANKROLLS,
  TRADER_ALPHA_PROFILE,
  TRADER_BETA_PROFILE,
  TRADER_GAMMA_PROFILE,
} from '../competition/traderProfiles';
import {
  evaluateMarketForTrader,
} from '../competition/proposalEngine';
import {
  runIndependentPhase,
} from '../competition/competitionEngine';
import {
  reviewProposals,
  enforceAllocationBounds,
  DEFAULT_ALLOCATION,
} from '../competition/portfolioManager';
import {
  loadTraderPortfolio,
  recordExecution,
  resetAllPortfolios,
} from '../competition/portfolioStore';
import {
  evaluateTrader,
  approveExperiment,
} from '../competition/coachEvaluator';
import {
  computeTraderMetrics,
  computeLeaderboard,
} from '../competition/competitionScorer';
import { getCurrentSeason } from '../competition/seasonStore';
import type { NormalizedMarketSnapshot } from '../paper/types';

describe('Competitive Multi-Agent Trading System', () => {
  const mockSnapshot: NormalizedMarketSnapshot = {
    snapshotId: 'snap-test-001',
    ticker: 'KXFEDDEC26-450',
    marketTitle: 'Fed funds rate target >= 4.50% at Dec 2026 meeting',
    status: 'active',
    bestYesBid: 0.42,
    bestYesBidSize: 25,
    bestYesAsk: 0.45,
    bestYesAskSize: 20,
    spread: 0.03,
    lastPrice: 0.42,
    sourceTimestamp: Date.now(),
    localReceiptTimestamp: Date.now(),
    isStale: false,
    depth: {
      yesBids: [
        { price: 0.42, size: 25 },
        { price: 0.40, size: 30 },
      ],
      noBids: [
        { price: 0.55, size: 15 },
        { price: 0.53, size: 10 },
      ],
    },
  };

  beforeEach(() => {
    resetAllPortfolios();
  });

  describe('1. Trader Profiles & Bankrolls', () => {
    it('defines 3 distinct competitor profiles with correct bankrolls', () => {
      expect(TRADER_ALPHA_PROFILE.competitorRole).toBe('alpha');
      expect(TRADER_BETA_PROFILE.competitorRole).toBe('beta');
      expect(TRADER_GAMMA_PROFILE.competitorRole).toBe('gamma');

      expect(INITIAL_BANKROLLS.alpha).toBe(10000);
      expect(INITIAL_BANKROLLS.beta).toBe(10000);
      expect(INITIAL_BANKROLLS.gamma).toBe(10000);
      expect(INITIAL_BANKROLLS.manager).toBe(50000);
    });

    it('each trader has unique philosophies and skill specializations', () => {
      expect(TRADER_ALPHA_PROFILE.skills).toContain('orderbook-imbalance');
      expect(TRADER_BETA_PROFILE.skills).toContain('probability-estimation');
      expect(TRADER_GAMMA_PROFILE.skills).toContain('sentiment-fade');
      expect(TRADER_ALPHA_PROFILE.strategyPhilosophy).not.toBe(
        TRADER_BETA_PROFILE.strategyPhilosophy
      );
    });
  });

  describe('2. Proposal and Thesis Engine', () => {
    it('generates structured thesis when qualifying edge exists', () => {
      const result = evaluateMarketForTrader('alpha', mockSnapshot, 10000);
      expect(result.type).toBe('proposal');

      if (result.type === 'proposal') {
        const p = result.proposal;
        expect(p.traderId).toBe('alpha');
        expect(p.ticker).toBe(mockSnapshot.ticker);
        expect(p.thesis.coreThesis).toBeDefined();
        expect(p.thesis.supportingEvidence.length).toBeGreaterThan(0);
        expect(p.thesis.invalidationCriteria.length).toBeGreaterThan(0);
        expect(p.thesis.confidenceScore).toBeGreaterThan(0);
        expect(p.riskPlan.maxLoss).toBeGreaterThan(0);
      }
    });

    it('records structured NoTradeDecision when spread exceeds tolerance', () => {
      const wideSpreadSnapshot: NormalizedMarketSnapshot = {
        ...mockSnapshot,
        spread: 0.08,
      };

      const result = evaluateMarketForTrader('alpha', wideSpreadSnapshot, 10000);
      expect(result.type).toBe('no_trade');
      if (result.type === 'no_trade') {
        expect(result.decision.reason).toBe('spread_too_wide');
        expect(result.decision.explanation).toContain('tolerance');
      }
    });
  });

  describe('3. Independent Decision Phase (Competition Engine)', () => {
    it('executes all 3 traders concurrently and aggregates into DecisionBundle', () => {
      const bundle = runIndependentPhase(mockSnapshot);
      expect(bundle.decisions.alpha).toBeDefined();
      expect(bundle.decisions.beta).toBeDefined();
      expect(bundle.decisions.gamma).toBeDefined();
      expect(bundle.timestamp).toBeGreaterThan(0);
    });
  });

  describe('4. Portfolio Manager Supervision & Allocation Rules', () => {
    it('enforces min/max capital weight boundaries (15% to 50%)', () => {
      const skewed = { alpha: 0.80, beta: 0.10, gamma: 0.10 };
      const bounded = enforceAllocationBounds(skewed);

      expect(bounded.alpha).toBeLessThanOrEqual(0.50);
      expect(bounded.beta).toBeGreaterThanOrEqual(0.15);
      expect(bounded.gamma).toBeGreaterThanOrEqual(0.15);
      expect(Number((bounded.alpha + bounded.beta + bounded.gamma).toFixed(2))).toBe(1.0);
    });

    it('reviews proposals, checks Risk Engine, and executes approved orders', () => {
      const bundle = runIndependentPhase(mockSnapshot);
      const managerDecision = reviewProposals(bundle, DEFAULT_ALLOCATION);

      expect(managerDecision.reviewedProposals.length).toBe(bundle.proposals.length);
      for (const item of managerDecision.reviewedProposals) {
        expect(['approved', 'rejected']).toContain(item.status);
      }
    });
  });

  describe('5. Independent Simulated Portfolios', () => {
    it('tracks cash, equity, realized P&L, and open positions separately', () => {
      const portfolio = recordExecution(
        'alpha',
        'KXFEDDEC26-450',
        'buy',
        5,
        0.42,
        0.05,
        'macro',
        'Momentum test entry'
      );

      expect(portfolio.cash).toBeLessThan(10000);
      expect(portfolio.positions['KXFEDDEC26-450']).toBeDefined();
      expect(portfolio.positions['KXFEDDEC26-450'].contracts).toBe(5);

      // Verify Beta's portfolio was NOT touched
      const betaPortfolio = loadTraderPortfolio('beta');
      expect(betaPortfolio.cash).toBe(10000);
      expect(Object.keys(betaPortfolio.positions).length).toBe(0);
    });
  });

  describe('6. Coach Evaluator & Experiment Audit Trail', () => {
    it('evaluates trader calibration and requires human confirmation for experiments', () => {
      const evaluation = evaluateTrader('alpha');
      expect(evaluation.strengths.length).toBeGreaterThan(0);
      expect(evaluation.proposedExperiments.length).toBeGreaterThan(0);

      const experiment = evaluation.proposedExperiments[0];
      expect(experiment.requiresHumanApproval).toBe(true);
      expect(experiment.status).toBe('pending_review');

      // Human operator approves
      const approved = approveExperiment(experiment.experimentId);
      expect(approved?.status).toBe('approved');
      expect(approved?.auditNote).toContain('Approved by human operator');
    });
  });

  describe('7. Multi-Dimensional Competition Scoring', () => {
    it('calculates composite scores incorporating Brier calibration and drawdown', () => {
      const alphaMetrics = computeTraderMetrics('alpha');
      const betaMetrics = computeTraderMetrics('beta');

      expect(alphaMetrics.compositeScore).toBeGreaterThan(0);
      expect(betaMetrics.compositeScore).toBeGreaterThan(0);
      expect(betaMetrics.brierScore).toBeLessThan(0.20); // Beta has best calibration

      const leaderboard = computeLeaderboard();
      expect(leaderboard.length).toBe(3);
      // Leaderboard is sorted descending by compositeScore
      expect(leaderboard[0].compositeScore).toBeGreaterThanOrEqual(leaderboard[1].compositeScore);
      expect(leaderboard[1].compositeScore).toBeGreaterThanOrEqual(leaderboard[2].compositeScore);
    });

    it('loads current tournament season with benchmarks', () => {
      const season = getCurrentSeason();
      expect(season.name).toContain('Season 1');
      expect(season.participants.length).toBe(3);
      expect(season.benchmarks.sp500Return).toBeDefined();
    });
  });
});
