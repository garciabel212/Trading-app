// ─── Agent Trading OS — Agent & Skill Registry ─────────────────────────────────
// Manages preset and custom agent configurations, skill definitions,
// and local persistence in Agent Lab.

import type {
  AgentSkillDefinition,
  TradingAgentProfile,
  AgentLearningStats,
} from './types';

export const AVAILABLE_SKILLS: AgentSkillDefinition[] = [
  {
    id: 'kalshi-spread-analyzer',
    name: 'Kalshi Spread Analyzer',
    description: 'Computes bid/ask spread ratio and liquidity depth across reciprocal YES/NO ladders.',
    indicator: 'Spread-to-Price Ratio',
    domain: 'Market Microstructure',
    defaultWeight: 0.85,
  },
  {
    id: 'momentum-trend',
    name: 'Momentum Trend Tracker',
    description: 'Tracks exponential directional momentum across recent price observations.',
    indicator: 'EMA Momentum',
    domain: 'Technical Analysis',
    defaultWeight: 0.75,
  },
  {
    id: 'mean-reversion-rsi',
    name: 'Mean Reversion RSI',
    description: 'Flags overextended probabilities on binary contracts (<15¢ or >85¢).',
    indicator: 'RSI-14 Range',
    domain: 'Statistical Arbitrage',
    defaultWeight: 0.7,
  },
  {
    id: 'volatility-guard',
    name: 'Volatility Safety Guard',
    description: 'Calculates volatility spikes and down-weights conviction during rapid shifts.',
    indicator: 'Rolling Volatility Band',
    domain: 'Risk Management',
    defaultWeight: 0.9,
  },
];

const INITIAL_STATS: AgentLearningStats = {
  totalRuns: 0,
  approvedRuns: 0,
  blockedRuns: 0,
  profitableRuns: 0,
  unprofitableRuns: 0,
  reflectionsCount: 0,
  policyComplianceScore: 100,
};

export const PRESET_AGENTS: TradingAgentProfile[] = [
  {
    id: 'agent-alpha-scalper',
    name: 'Alpha Scalper',
    role: 'strategy',
    strategyType: 'momentum',
    isPreset: true,
    skills: ['momentum-trend', 'kalshi-spread-analyzer'],
    parameters: {
      convictionThreshold: 0.74,
      targetOrderSize: 5,
      maxSpreadTolerance: 0.04,
      preferredSide: 'buy',
    },
    systemPrompt:
      'Identify short-term directional momentum on active contracts. Seek tight spreads (<$0.04) and exit on volatility deceleration.',
    learningStats: { ...INITIAL_STATS },
    createdAt: 1710000000000,
    lastTrainedAt: null,
  },
  {
    id: 'agent-spread-arb',
    name: 'Spread Arbitrageur',
    role: 'strategy',
    strategyType: 'spread-arbitrage',
    isPreset: true,
    skills: ['kalshi-spread-analyzer', 'volatility-guard'],
    parameters: {
      convictionThreshold: 0.8,
      targetOrderSize: 3,
      maxSpreadTolerance: 0.05,
      preferredSide: 'dynamic',
    },
    systemPrompt:
      'Exploit temporary dislocations between YES and NO resting orderbooks. Only execute when net reward exceeds taker fee cost basis.',
    learningStats: { ...INITIAL_STATS },
    createdAt: 1710000000000,
    lastTrainedAt: null,
  },
  {
    id: 'agent-conservative',
    name: 'Conservative Sentinel',
    role: 'strategy',
    strategyType: 'conservative',
    isPreset: true,
    skills: ['volatility-guard', 'kalshi-spread-analyzer'],
    parameters: {
      convictionThreshold: 0.88,
      targetOrderSize: 2,
      maxSpreadTolerance: 0.02,
      preferredSide: 'buy',
    },
    systemPrompt:
      'Capital preservation first. Refuse execution when spread exceeds 2¢ or conviction falls below 88%. Never risk excess drawdown.',
    learningStats: { ...INITIAL_STATS },
    createdAt: 1710000000000,
    lastTrainedAt: null,
  },
  {
    id: 'agent-aggressive',
    name: 'Aggressive Breakout',
    role: 'strategy',
    strategyType: 'momentum',
    isPreset: true,
    skills: ['momentum-trend'],
    parameters: {
      convictionThreshold: 0.62,
      targetOrderSize: 10,
      maxSpreadTolerance: 0.06,
      preferredSide: 'buy',
    },
    systemPrompt:
      'Maximize position size up to the strict Risk Engine 10-unit limit. Capture high-impact breakout events.',
    learningStats: { ...INITIAL_STATS },
    createdAt: 1710000000000,
    lastTrainedAt: null,
  },
];

const CUSTOM_AGENTS_STORAGE_KEY = 'agent_trading_os_custom_agents_v1';
let _inMemoryCustomAgents: TradingAgentProfile[] = [];

export function loadCustomAgents(): TradingAgentProfile[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(CUSTOM_AGENTS_STORAGE_KEY);
      if (raw) {
        _inMemoryCustomAgents = JSON.parse(raw) as TradingAgentProfile[];
        return _inMemoryCustomAgents;
      }
    } catch {
      // Fall through to memory
    }
  }
  return _inMemoryCustomAgents;
}

export function saveCustomAgents(agents: TradingAgentProfile[]): void {
  _inMemoryCustomAgents = [...agents];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CUSTOM_AGENTS_STORAGE_KEY, JSON.stringify(agents));
    } catch {
      // Ignore storage quota
    }
  }
}

export function getAllAgents(): TradingAgentProfile[] {
  const custom = loadCustomAgents();
  return [...PRESET_AGENTS, ...custom];
}

export function getAgentById(id: string): TradingAgentProfile {
  const all = getAllAgents();
  return all.find((a) => a.id === id) ?? PRESET_AGENTS[0];
}

export function createCustomAgent(
  data: Omit<TradingAgentProfile, 'id' | 'isPreset' | 'createdAt' | 'lastTrainedAt' | 'learningStats'>,
): TradingAgentProfile {
  const newAgent: TradingAgentProfile = {
    ...data,
    id: `custom-agent-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    isPreset: false,
    createdAt: Date.now(),
    lastTrainedAt: null,
    learningStats: { ...INITIAL_STATS },
  };

  const custom = loadCustomAgents();
  saveCustomAgents([...custom, newAgent]);
  return newAgent;
}

export function deleteCustomAgent(id: string): boolean {
  const custom = loadCustomAgents();
  const filtered = custom.filter((a) => a.id !== id);
  if (filtered.length === custom.length) return false;
  saveCustomAgents(filtered);
  return true;
}

export function updateAgentStats(
  agentId: string,
  approved: boolean,
  profitable: boolean,
  newReflectionsCount: number,
): void {
  const custom = loadCustomAgents();
  const index = custom.findIndex((a) => a.id === agentId);

  if (index >= 0) {
    const agent = custom[index];
    const totalRuns = agent.learningStats.totalRuns + 1;
    const approvedRuns = agent.learningStats.approvedRuns + (approved ? 1 : 0);
    const blockedRuns = agent.learningStats.blockedRuns + (!approved ? 1 : 0);
    const profitableRuns = agent.learningStats.profitableRuns + (profitable ? 1 : 0);
    const unprofitableRuns = agent.learningStats.unprofitableRuns + (!profitable ? 1 : 0);
    const reflectionsCount = agent.learningStats.reflectionsCount + newReflectionsCount;

    custom[index] = {
      ...agent,
      lastTrainedAt: Date.now(),
      learningStats: {
        totalRuns,
        approvedRuns,
        blockedRuns,
        profitableRuns,
        unprofitableRuns,
        reflectionsCount,
        policyComplianceScore: 100, // Enforced by Risk Engine invariant
      },
    };
    saveCustomAgents(custom);
  }
}
