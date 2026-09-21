// ─── Agent Trading OS — Competition Domain Types ──────────────────────────────
// All core domain contracts for the competitive multi-agent trading laboratory.
// Completely deterministic, pure TypeScript definitions.

export type CompetitorRole = 'alpha' | 'beta' | 'gamma' | 'manager' | 'coach';

export type MarketCategory =
  | 'politics'
  | 'economics'
  | 'crypto'
  | 'tech'
  | 'culture'
  | 'science'
  | 'sports'
  | 'macro';

export type ActionType =
  | 'BUY'
  | 'SELL'
  | 'HOLD'
  | 'ADD'
  | 'REDUCE'
  | 'EXIT'
  | 'CANCEL'
  | 'REVERSE'
  | 'NO_TRADE';

export interface StructuredThesis {
  estimatedProbability?: number;
  marketProbability?: number;
  edge?: number;
  timeframe: string;
  coreThesis: string;
  supportingEvidence: string[];
  keyCatalysts: string[];
  invalidationCriteria: string[];
  expectedResolutionTime?: string;
  confidenceScore: number; // 0.0 to 1.0
}

export interface RiskPlan {
  maxLoss: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  plannedExitCondition: string;
  sizingRationale: string;
}

export interface TradeProposal {
  proposalId: string;
  traderId: CompetitorRole | string;
  ticker: string;
  title: string;
  marketType: 'binary' | 'crypto' | 'equity';
  marketCategory: MarketCategory;
  action: ActionType;
  side: 'yes' | 'no' | 'buy' | 'sell';
  contracts: number;
  proposedPrice: number;
  limitPrice: number;
  thesis: StructuredThesis;
  riskPlan: RiskPlan;
  urgency: 'low' | 'medium' | 'high';
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';
  rejectionReason?: string;
}

export type NoTradeReason =
  | 'insufficient_edge'
  | 'high_uncertainty'
  | 'risk_limit_reached'
  | 'thesis_contradiction'
  | 'spread_too_wide'
  | 'liquidity_insufficient';

export interface NoTradeDecision {
  decisionId: string;
  traderId: CompetitorRole | string;
  ticker: string;
  marketCategory: MarketCategory;
  timestamp: number;
  reason: NoTradeReason;
  explanation: string;
  estimatedProbability?: number;
  marketProbability?: number;
  observedPrice?: number;
  spread?: number;
}

export interface PositionThesis {
  positionId: string;
  ticker: string;
  traderId: string;
  initialThesis: string;
  invalidationCriteria: string[];
  currentStatus: 'intact' | 'strained' | 'invalidated';
  lastReassessed: number;
  notes: string;
}

export interface TraderPosition {
  ticker: string;
  side: 'yes' | 'no' | 'buy' | 'sell';
  contracts: number;
  averageEntryPrice: number;
  currentPrice: number;
  marketCategory: MarketCategory;
  openedAt: number;
  unrealizedPnL: number;
  thesis: PositionThesis;
}

export interface TraderPortfolio {
  traderId: string;
  traderName: string;
  role: CompetitorRole;
  initialCash: number;
  cash: number;
  equity: number;
  realizedPnL: number;
  unrealizedPnL: number;
  peakEquity: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  noTradeCount: number;
  positions: Record<string, TraderPosition>;
  theses: Record<string, PositionThesis>;
  recentProposals: TradeProposal[];
  recentNoTrades: NoTradeDecision[];
  updatedAt: number;
}

export interface SeasonParticipant {
  traderId: string;
  name: string;
  role: CompetitorRole;
  initialBankroll: number;
  strategyStyle: string;
  activeVersion: string;
  enabled: boolean;
}

export interface Season {
  seasonId: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  status: 'active' | 'completed';
  participants: SeasonParticipant[];
  benchmarks: {
    sp500Return: number;
    cashYield: number;
  };
}

export interface CategoryMetric {
  category: MarketCategory;
  trades: number;
  pnl: number;
  winRate: number;
  realizedEdge: number;
}

export interface CompetitionMetrics {
  traderId: string;
  seasonId: string;
  simulatedReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  brierScore: number;
  calibrationError: number;
  realizedEdge: number;
  winRate: number;
  profitFactor: number;
  ruleCompliancePct: number;
  compositeScore: number;
  categoryBreakdown: Record<MarketCategory, CategoryMetric>;
  lastEvaluatedAt: number;
}

export interface ManagerDecisionItem {
  proposalId: string;
  traderId: string;
  ticker: string;
  status: 'approved' | 'rejected';
  adjustedSize?: number;
  reason: string;
}

export interface ManagerDecision {
  decisionId: string;
  timestamp: number;
  reviewedProposals: ManagerDecisionItem[];
  disagreementSummary: string;
  capitalAllocation: Record<string, number>; // traderId -> percentage weight (0.0 to 1.0)
}

export interface ProposedExperiment {
  experimentId: string;
  traderId: string;
  title: string;
  hypothesis: string;
  parameterChanges: Record<string, any>;
  targetMetric: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'running' | 'completed';
  requiresHumanApproval: boolean;
  auditNote: string;
  createdAt: number;
}

export interface CoachEvaluation {
  evaluationId: string;
  traderId: string;
  timestamp: number;
  strengths: string[];
  weaknesses: string[];
  calibrationAssessment: string;
  recommendedSkillAdjustments: string[];
  proposedExperiments: ProposedExperiment[];
}

export interface SystemEvent {
  id: string;
  type:
    | 'market.observed'
    | 'trader.analysis.started'
    | 'trader.proposal.submitted'
    | 'trader.notrade.recorded'
    | 'manager.review.started'
    | 'manager.decision.emitted'
    | 'risk.checked'
    | 'risk.approved'
    | 'risk.rejected'
    | 'broker.order.executed'
    | 'portfolio.updated'
    | 'coach.evaluation.emitted'
    | 'season.score.updated';
  timestamp: number;
  sourceNode: string;
  targetNode?: string;
  payload: any;
}
