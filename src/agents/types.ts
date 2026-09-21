// ─── Agent Trading OS — Agent & Memory Data Contracts ──────────────────────────
// Defines custom agent profiles, skill definitions, episodic memories,
// and learning statistics for the Agent Lab environment.

export type TradingAgentRole = 'strategy' | 'analyst' | 'risk' | 'evaluator';

export type StrategyType =
  | 'momentum'
  | 'spread-arbitrage'
  | 'contrarian'
  | 'conservative'
  | 'custom';

export interface AgentSkillDefinition {
  id: string;
  name: string;
  description: string;
  indicator: string;
  domain: string;
  defaultWeight: number;
}

export interface AgentLearningStats {
  totalRuns: number;
  approvedRuns: number;
  blockedRuns: number;
  profitableRuns: number;
  unprofitableRuns: number;
  reflectionsCount: number;
  policyComplianceScore: number; // 0 - 100%
}

export interface AgentParameters {
  convictionThreshold: number; // e.g. 0.70 (70%)
  targetOrderSize: number;     // 1 - 10 units (enforced by Risk Engine)
  maxSpreadTolerance: number;  // max acceptable spread in dollars (e.g. 0.03)
  preferredSide: 'buy' | 'sell' | 'dynamic';
}

export interface TradingAgentProfile {
  id: string;
  name: string;
  role: TradingAgentRole;
  strategyType: StrategyType;
  isPreset: boolean;
  skills: string[]; // Skill IDs
  parameters: AgentParameters;
  systemPrompt: string;
  learningStats: AgentLearningStats;
  createdAt: number;
  lastTrainedAt: number | null;
}

export type MemoryRelevanceTag =
  | 'high-spread'
  | 'oversized'
  | 'winning-trend'
  | 'risk-rejection'
  | 'standard';

export interface EpisodicMemoryItem {
  id: string;
  timestamp: number;
  agentId: string;
  runId: string;
  ticker: string;
  marketContext: {
    bid: number;
    ask: number;
    spread: number;
    action: 'buy' | 'sell' | 'close';
    proposedQty: number;
    conviction: number;
  };
  outcome: {
    approved: boolean;
    executed: boolean;
    fillPrice?: number;
    fee?: number;
    estimatedPnl?: number;
    rejectionReason?: string;
  };
  reflection: string;
  learnedLesson: string;
  relevanceTag: MemoryRelevanceTag;
}

export interface SkillExecutionOutput {
  skillId: string;
  skillName: string;
  indicator: string;
  value: number | string;
  summary: string;
  timestamp: number;
}

export interface MemoryQueryOutput {
  agentId: string;
  queriedCount: number;
  relevantMemories: EpisodicMemoryItem[];
  priorLessonsApplied: string[];
  convictionAdjustment: number; // e.g. -0.10 if high spread caused prior loss
  summary: string;
}
