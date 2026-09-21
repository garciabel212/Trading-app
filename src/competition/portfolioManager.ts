// ─── Agent Trading OS — Portfolio Manager Agent ──────────────────────────────
// Reviews proposals from Trader Alpha, Beta, and Gamma, manages capital allocations,
// detects consensus vs divergence, enforces weight boundaries, and routes through Risk Engine.

import { runRiskEngine } from '../workflow/stages';
import type { StrategyOutput } from '../workflow/types';
import type { DecisionBundle } from './competitionEngine';
import type {
  ManagerDecision,
  ManagerDecisionItem,
} from './types';
import { recordExecution } from './portfolioStore';
import { eventBus } from './eventBus';

export const MIN_AGENT_WEIGHT = 0.15;
export const MAX_AGENT_WEIGHT = 0.50;

export interface ManagerAllocationConfig {
  alphaWeight: number;
  betaWeight: number;
  gammaWeight: number;
  maxRiskPerTrade: number;
}

export const DEFAULT_ALLOCATION: ManagerAllocationConfig = {
  alphaWeight: 0.35,
  betaWeight: 0.35,
  gammaWeight: 0.30,
  maxRiskPerTrade: 10,
};

export function enforceAllocationBounds(weights: {
  alpha: number;
  beta: number;
  gamma: number;
}): { alpha: number; beta: number; gamma: number } {
  // Clamp between MIN_AGENT_WEIGHT (0.15) and MAX_AGENT_WEIGHT (0.50)
  let a = Math.max(MIN_AGENT_WEIGHT, Math.min(MAX_AGENT_WEIGHT, weights.alpha));
  let b = Math.max(MIN_AGENT_WEIGHT, Math.min(MAX_AGENT_WEIGHT, weights.beta));
  let g = Math.max(MIN_AGENT_WEIGHT, Math.min(MAX_AGENT_WEIGHT, weights.gamma));

  // Distribute remaining difference while strictly keeping all items <= MAX_AGENT_WEIGHT and >= MIN_AGENT_WEIGHT
  let diff = 1.0 - (a + b + g);
  if (diff > 0) {
    if (b < MAX_AGENT_WEIGHT) {
      const addB = Math.min(diff / 2, MAX_AGENT_WEIGHT - b);
      b += addB;
      diff -= addB;
    }
    if (g < MAX_AGENT_WEIGHT) {
      const addG = Math.min(diff, MAX_AGENT_WEIGHT - g);
      g += addG;
      diff -= addG;
    }
    if (diff > 0 && a < MAX_AGENT_WEIGHT) {
      const addA = Math.min(diff, MAX_AGENT_WEIGHT - a);
      a += addA;
      diff -= addA;
    }
  } else if (diff < 0) {
    let excess = -diff;
    if (a > MIN_AGENT_WEIGHT) {
      const subA = Math.min(excess, a - MIN_AGENT_WEIGHT);
      a -= subA;
      excess -= subA;
    }
    if (excess > 0 && b > MIN_AGENT_WEIGHT) {
      const subB = Math.min(excess, b - MIN_AGENT_WEIGHT);
      b -= subB;
      excess -= subB;
    }
    if (excess > 0 && g > MIN_AGENT_WEIGHT) {
      const subG = Math.min(excess, g - MIN_AGENT_WEIGHT);
      g -= subG;
      excess -= subG;
    }
  }

  return {
    alpha: Number(a.toFixed(2)),
    beta: Number(b.toFixed(2)),
    gamma: Number((1.0 - Number(a.toFixed(2)) - Number(b.toFixed(2))).toFixed(2)),
  };
}

export function reviewProposals(
  bundle: DecisionBundle,
  allocations: ManagerAllocationConfig = DEFAULT_ALLOCATION
): ManagerDecision {
  const now = Date.now();
  const decisionId = `mdec-${now}`;

  eventBus.emit({
    id: `evt-mgr-review-${now}`,
    type: 'manager.review.started',
    timestamp: now,
    sourceNode: 'node-portfolio-manager',
    payload: { proposalCount: bundle.proposals.length },
  });

  const reviewedProposals: ManagerDecisionItem[] = [];
  const sidesByTrader: Record<string, string> = {};
  for (const p of bundle.proposals) {
    sidesByTrader[p.traderId] = `${p.action} ${p.side}`;
  }

  // Detect consensus / disagreement
  let disagreementSummary = 'No conflicting proposals.';
  const distinctSides = new Set(Object.values(sidesByTrader));
  if (distinctSides.size > 1) {
    disagreementSummary = `Divergence detected: ${Object.entries(sidesByTrader)
      .map(([t, s]) => `${t.toUpperCase()} -> ${s}`)
      .join(' vs ')}. Allocating based on edge & calibration.`;
  } else if (bundle.proposals.length >= 2) {
    disagreementSummary = `Consensus detected: All active proposals agree on ${[...distinctSides][0]}. High conviction allocation.`;
  }

  for (const proposal of bundle.proposals) {
    // 1. Check allocation weight
    const weight =
      proposal.traderId === 'alpha'
        ? allocations.alphaWeight
        : proposal.traderId === 'beta'
        ? allocations.betaWeight
        : allocations.gammaWeight;

    const adjustedQty = Math.max(1, Math.min(10, Math.round(proposal.contracts * (weight / 0.33))));

    // 2. Route through Risk Engine
    const strategyRepresentation: StrategyOutput = {
      strategyName: `${proposal.traderId.toUpperCase()}-${proposal.marketCategory}`,
      symbol: proposal.ticker,
      proposedQty: adjustedQty,
      side: proposal.side === 'yes' || proposal.side === 'buy' ? 'buy' : 'sell',
      confidenceScore: proposal.thesis.confidenceScore,
      agentId: `trader-${proposal.traderId}`,
    };

    eventBus.emit({
      id: `evt-risk-check-${proposal.proposalId}`,
      type: 'risk.checked',
      timestamp: now,
      sourceNode: 'node-portfolio-manager',
      targetNode: 'risk-engine',
      payload: { proposalId: proposal.proposalId, qty: adjustedQty },
    });

    const riskResult = runRiskEngine(strategyRepresentation, `run-${now}`, 10);

    if (riskResult.approved) {
      proposal.status = 'approved';
      reviewedProposals.push({
        proposalId: proposal.proposalId,
        traderId: String(proposal.traderId),
        ticker: proposal.ticker,
        status: 'approved',
        adjustedSize: adjustedQty,
        reason: `Approved by Manager & Risk Engine (${riskResult.reason})`,
      });

      eventBus.emit({
        id: `evt-risk-app-${proposal.proposalId}`,
        type: 'risk.approved',
        timestamp: now,
        sourceNode: 'risk-engine',
        targetNode: 'paper-execution',
        payload: { proposalId: proposal.proposalId },
      });

      // Execute in Trader Portfolio & Manager Portfolio
      const fee = Number((adjustedQty * 0.01).toFixed(2));
      recordExecution(
        proposal.traderId,
        proposal.ticker,
        proposal.side,
        adjustedQty,
        proposal.proposedPrice,
        fee,
        proposal.marketCategory,
        proposal.thesis.coreThesis
      );

      // Mirror trade into Manager's ensemble portfolio
      recordExecution(
        'manager',
        proposal.ticker,
        proposal.side,
        adjustedQty,
        proposal.proposedPrice,
        fee,
        proposal.marketCategory,
        `Ensemble execution from ${proposal.traderId}: ${proposal.thesis.coreThesis}`
      );

      eventBus.emit({
        id: `evt-exec-${proposal.proposalId}`,
        type: 'broker.order.executed',
        timestamp: now,
        sourceNode: 'paper-execution',
        targetNode: `node-portfolio-${proposal.traderId}`,
        payload: {
          ticker: proposal.ticker,
          qty: adjustedQty,
          price: proposal.proposedPrice,
        },
      });
    } else {
      proposal.status = 'rejected';
      proposal.rejectionReason = riskResult.reason;
      reviewedProposals.push({
        proposalId: proposal.proposalId,
        traderId: String(proposal.traderId),
        ticker: proposal.ticker,
        status: 'rejected',
        reason: `Risk Engine rejected: ${riskResult.reason}`,
      });

      eventBus.emit({
        id: `evt-risk-rej-${proposal.proposalId}`,
        type: 'risk.rejected',
        timestamp: now,
        sourceNode: 'risk-engine',
        payload: { proposalId: proposal.proposalId, reason: riskResult.reason },
      });
    }
  }

  const managerDecision: ManagerDecision = {
    decisionId,
    timestamp: now,
    reviewedProposals,
    disagreementSummary,
    capitalAllocation: {
      alpha: allocations.alphaWeight,
      beta: allocations.betaWeight,
      gamma: allocations.gammaWeight,
    },
  };

  eventBus.emit({
    id: `evt-mgr-dec-${now}`,
    type: 'manager.decision.emitted',
    timestamp: now,
    sourceNode: 'node-portfolio-manager',
    payload: managerDecision,
  });

  return managerDecision;
}
