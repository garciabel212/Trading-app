// ─── Agent Trading OS — Competitor Trader Profiles ────────────────────────────
// Defines the 3 autonomous competitor agents + Portfolio Manager + Coach.
// Each has a distinct market philosophy, skills, risk parameters, and heuristics.

import type { TradingAgentProfile } from '../agents/types';
import type { CompetitorRole } from './types';

export const INITIAL_BANKROLLS: Record<CompetitorRole, number> = {
  alpha: 10000,
  beta: 10000,
  gamma: 10000,
  manager: 50000,
  coach: 0,
};

export const TRADER_ALPHA_PROFILE: TradingAgentProfile = {
  id: 'trader-alpha',
  name: 'Trader Alpha',
  role: 'strategy',
  strategyType: 'momentum',
  isPreset: true,
  competitorRole: 'alpha',
  initialBankroll: INITIAL_BANKROLLS.alpha,
  strategyPhilosophy:
    'The market itself contains information. Follow real flow, volume surges, spread dynamics, and order-book momentum.',
  skills: [
    'orderbook-imbalance',
    'momentum-scoring',
    'liquidity-filter',
    'spread-dynamics',
  ],
  parameters: {
    convictionThreshold: 0.68,
    targetOrderSize: 5,
    maxSpreadTolerance: 0.04,
    preferredSide: 'dynamic',
  },
  systemPrompt:
    'You are Trader Alpha. You focus on price momentum, volume bursts, bid/ask imbalances, and market microstructure. If flow is accelerating in one direction with tight spreads and depth, exploit it quickly.',
  learningStats: {
    totalRuns: 18,
    approvedRuns: 14,
    blockedRuns: 4,
    profitableRuns: 11,
    unprofitableRuns: 3,
    reflectionsCount: 6,
    policyComplianceScore: 94,
  },
  createdAt: 1710000000000,
  lastTrainedAt: 1710000000000,
};

export const TRADER_BETA_PROFILE: TradingAgentProfile = {
  id: 'trader-beta',
  name: 'Trader Beta',
  role: 'strategy',
  strategyType: 'conservative',
  isPreset: true,
  competitorRole: 'beta',
  initialBankroll: INITIAL_BANKROLLS.beta,
  strategyPhilosophy:
    'Estimate true probability from first principles and domain base rates. Trade only when true probability diverges substantially from market price with positive expected value.',
  skills: [
    'probability-estimation',
    'brier-calibration',
    'base-rate-modeling',
    'expected-value-calc',
  ],
  parameters: {
    convictionThreshold: 0.72,
    targetOrderSize: 4,
    maxSpreadTolerance: 0.03,
    preferredSide: 'dynamic',
  },
  systemPrompt:
    'You are Trader Beta. You ignore superficial noise and focus on fundamental probability distributions. You calculate edge = (trueProb - marketProb) and require strict Brier score calibration before risking capital.',
  learningStats: {
    totalRuns: 15,
    approvedRuns: 13,
    blockedRuns: 2,
    profitableRuns: 10,
    unprofitableRuns: 3,
    reflectionsCount: 5,
    policyComplianceScore: 97,
  },
  createdAt: 1710000000000,
  lastTrainedAt: 1710000000000,
};

export const TRADER_GAMMA_PROFILE: TradingAgentProfile = {
  id: 'trader-gamma',
  name: 'Trader Gamma',
  role: 'strategy',
  strategyType: 'contrarian',
  isPreset: true,
  competitorRole: 'gamma',
  initialBankroll: INITIAL_BANKROLLS.gamma,
  strategyPhilosophy:
    'Crowds overreact to dramatic headlines and transient sentiment spikes. Exploit mispriced tails and fade extreme euphoria or panic.',
  skills: [
    'sentiment-fade',
    'crowd-overreaction',
    'mean-reversion',
    'catalyst-timing',
  ],
  parameters: {
    convictionThreshold: 0.65,
    targetOrderSize: 6,
    maxSpreadTolerance: 0.05,
    preferredSide: 'dynamic',
  },
  systemPrompt:
    'You are Trader Gamma. You watch for sentiment saturation, panic selling, or speculative bubbles. When market implied odds exceed 85% or drop under 15% on emotional catalysts, you look for mean-reversion fades.',
  learningStats: {
    totalRuns: 14,
    approvedRuns: 10,
    blockedRuns: 4,
    profitableRuns: 8,
    unprofitableRuns: 2,
    reflectionsCount: 7,
    policyComplianceScore: 89,
  },
  createdAt: 1710000000000,
  lastTrainedAt: 1710000000000,
};

export const PORTFOLIO_MANAGER_PROFILE: TradingAgentProfile = {
  id: 'portfolio-manager',
  name: 'Portfolio Manager',
  role: 'risk',
  strategyType: 'conservative',
  isPreset: true,
  competitorRole: 'manager',
  initialBankroll: INITIAL_BANKROLLS.manager,
  strategyPhilosophy:
    'Capital preservation through multi-trader ensemble diversification. Balance allocations based on rolling Sharpe and Brier scores, enforcing strict min/max weight boundaries.',
  skills: [
    'capital-allocation',
    'portfolio-risk-budgeting',
    'trader-correlation-analysis',
    'ensemble-optimization',
  ],
  parameters: {
    convictionThreshold: 0.70,
    targetOrderSize: 10,
    maxSpreadTolerance: 0.03,
    preferredSide: 'dynamic',
  },
  systemPrompt:
    'You are the Portfolio Manager Agent. You oversee Alpha, Beta, and Gamma. You review incoming trade proposals, detect consensus or divergence, and allocate capital to maximize portfolio risk-adjusted returns.',
  learningStats: {
    totalRuns: 42,
    approvedRuns: 37,
    blockedRuns: 5,
    profitableRuns: 30,
    unprofitableRuns: 7,
    reflectionsCount: 12,
    policyComplianceScore: 99,
  },
  createdAt: 1710000000000,
  lastTrainedAt: 1710000000000,
};

export const COACH_EVALUATOR_PROFILE: TradingAgentProfile = {
  id: 'coach-evaluator',
  name: 'Coach & Evaluator',
  role: 'evaluator',
  strategyType: 'custom',
  isPreset: true,
  competitorRole: 'coach',
  initialBankroll: 0,
  strategyPhilosophy:
    'Continuous agent improvement via structured post-trade attribution, behavioral bias detection, and controlled experimental backtests.',
  skills: [
    'post-trade-attribution',
    'calibration-auditing',
    'bias-detection',
    'experiment-generation',
  ],
  parameters: {
    convictionThreshold: 0.75,
    targetOrderSize: 1,
    maxSpreadTolerance: 0.02,
    preferredSide: 'dynamic',
  },
  systemPrompt:
    'You are the Coach / Evaluator Agent. You monitor each trader performance across market categories, diagnose overconfidence or weakness, and propose hypothesis-driven experiments.',
  learningStats: {
    totalRuns: 28,
    approvedRuns: 28,
    blockedRuns: 0,
    profitableRuns: 24,
    unprofitableRuns: 4,
    reflectionsCount: 19,
    policyComplianceScore: 100,
  },
  createdAt: 1710000000000,
  lastTrainedAt: 1710000000000,
};

export const COMPETITOR_PROFILES: Record<CompetitorRole, TradingAgentProfile> = {
  alpha: TRADER_ALPHA_PROFILE,
  beta: TRADER_BETA_PROFILE,
  gamma: TRADER_GAMMA_PROFILE,
  manager: PORTFOLIO_MANAGER_PROFILE,
  coach: COACH_EVALUATOR_PROFILE,
};

export const TRADER_ROLES: CompetitorRole[] = ['alpha', 'beta', 'gamma'];

export function getCompetitorProfile(role: CompetitorRole): TradingAgentProfile {
  return COMPETITOR_PROFILES[role] || TRADER_ALPHA_PROFILE;
}
