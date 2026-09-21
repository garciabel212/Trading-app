// ─── Agent Trading OS — Episodic Memory Store ──────────────────────────────────
// Manages post-trade reflections, memory similarity querying,
// and behavioral feedback loops for the Strategy Agent.

import type {
  EpisodicMemoryItem,
  MemoryQueryOutput,
  TradingAgentProfile,
} from './types';
import type {
  RiskOutput,
  ExecutionOutput,
  EvaluationOutput,
} from '../workflow/types';

const MEMORY_STORAGE_KEY = 'agent_trading_os_episodic_memory_v1';
let _inMemoryAllMemories: EpisodicMemoryItem[] = [];

export function loadAllMemories(): EpisodicMemoryItem[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (raw) {
        _inMemoryAllMemories = JSON.parse(raw) as EpisodicMemoryItem[];
        return _inMemoryAllMemories;
      }
    } catch {
      // Fall through to memory
    }
  }
  return _inMemoryAllMemories;
}

export function saveAllMemories(memories: EpisodicMemoryItem[]): void {
  _inMemoryAllMemories = [...memories];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories));
    } catch {
      // Ignore quota errors
    }
  }
}

export function getMemoriesForAgent(agentId: string): EpisodicMemoryItem[] {
  const all = loadAllMemories();
  return all
    .filter((m) => m.agentId === agentId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function addEpisodicMemory(memory: EpisodicMemoryItem): void {
  const all = loadAllMemories();
  // Keep up to 200 most recent memories
  const updated = [memory, ...all.filter((m) => m.id !== memory.id)].slice(0, 200);
  saveAllMemories(updated);
}

export function clearAgentMemories(agentId: string): void {
  const all = loadAllMemories();
  saveAllMemories(all.filter((m) => m.agentId !== agentId));
}

/**
 * Queries relevant historical memories for an agent given current market conditions.
 * Employs heuristic similarity: matching ticker, spread magnitude, and past outcomes.
 */
export function queryRelevantMemories(
  agent: TradingAgentProfile,
  ticker: string,
  currentSpread: number,
): MemoryQueryOutput {
  const agentMemories = getMemoriesForAgent(agent.id);

  if (agentMemories.length === 0) {
    return {
      agentId: agent.id,
      queriedCount: 0,
      relevantMemories: [],
      priorLessonsApplied: [
        'No historical episodic memories on record. Operating with default strategy prior.',
      ],
      convictionAdjustment: 0,
      summary: 'Memory store checked: 0 prior experiences found. Baseline conviction applied.',
    };
  }

  // Filter memories matching either the ticker or similar spread conditions
  const relevant = agentMemories.filter(
    (m) =>
      m.ticker === ticker ||
      Math.abs(m.marketContext.spread - currentSpread) <= 0.02 ||
      m.relevanceTag === 'risk-rejection' ||
      m.relevanceTag === 'high-spread',
  ).slice(0, 3); // Take top 3 most relevant

  const priorLessons: string[] = [];
  let adjustment = 0;

  for (const item of relevant) {
    if (item.relevanceTag === 'risk-rejection') {
      priorLessons.push(
        `Precedent (${new Date(item.timestamp).toLocaleTimeString()}): Order was blocked by Risk Engine (${item.outcome.rejectionReason}). Sizing discipline required.`,
      );
    } else if (item.relevanceTag === 'high-spread' || (item.outcome.estimatedPnl !== undefined && item.outcome.estimatedPnl < 0)) {
      priorLessons.push(
        `Precedent: Prior trade at spread $${item.marketContext.spread.toFixed(2)} resulted in negative return ($${item.outcome.estimatedPnl?.toFixed(2)}). Fee drag exceeded edge.`,
      );
      adjustment -= 0.06; // Penalize conviction due to historical spread loss
    } else if (item.outcome.estimatedPnl !== undefined && item.outcome.estimatedPnl > 0) {
      priorLessons.push(
        `Precedent: Profitable fill (+${item.outcome.estimatedPnl.toFixed(2)}) recorded at spread $${item.marketContext.spread.toFixed(2)}. Reinforced setup pattern.`,
      );
      adjustment += 0.04; // Boost conviction on validated pattern
    } else {
      priorLessons.push(`Precedent: ${item.learnedLesson}`);
    }
  }

  if (priorLessons.length === 0) {
    priorLessons.push('Prior trade history found, but market context differs. Applying default prior.');
  }

  // Clamp adjustment between -0.15 and +0.10
  const clampedAdjustment = Math.max(-0.15, Math.min(0.1, Math.round(adjustment * 100) / 100));

  return {
    agentId: agent.id,
    queriedCount: relevant.length,
    relevantMemories: relevant,
    priorLessonsApplied: priorLessons,
    convictionAdjustment: clampedAdjustment,
    summary: `Retrieved ${relevant.length} episodic memory precedent(s). Conviction adjusted by ${clampedAdjustment >= 0 ? '+' : ''}${(clampedAdjustment * 100).toFixed(0)}%.`,
  };
}

/**
 * Synthesizes a structured episodic memory reflection from stage outcomes.
 */
export function buildEpisodicReflection(
  agent: TradingAgentProfile,
  runId: string,
  ticker: string,
  bid: number,
  ask: number,
  spread: number,
  proposedQty: number,
  baseConviction: number,
  riskOutput: RiskOutput,
  executionOutput: ExecutionOutput,
  evaluationOutput: EvaluationOutput,
): EpisodicMemoryItem {
  const approved = riskOutput.approved;
  const executed = executionOutput.order !== null;
  const fillPrice = ask;
  const fee = 0;

  // Estimate theoretical outcome or paper P&L
  let estimatedPnl: number | undefined;
  let relevanceTag: EpisodicMemoryItem['relevanceTag'] = 'standard';
  let reflection = '';
  let learnedLesson = '';

  if (!approved) {
    relevanceTag = 'risk-rejection';
    reflection = `Order for ${proposedQty} contracts on ${ticker} was blocked: ${riskOutput.reason}`;
    learnedLesson = `Risk boundary enforced: maximum allowable order size is ${riskOutput.verdict.threshold} units. Strategy must respect hard constraints.`;
  } else if (executed) {
    // Model theoretical outcome: if bid is available, theoretical exit at bid net of fee
    const exitProceeds = Math.max(0, proposedQty * bid - fee);
    const costBasis = proposedQty * fillPrice + fee;
    estimatedPnl = Math.round((exitProceeds - costBasis) * 100) / 100;

    if (spread >= agent.parameters.maxSpreadTolerance) {
      relevanceTag = 'high-spread';
      reflection = `Executed ${proposedQty} YES on ${ticker} at ask $${fillPrice.toFixed(2)} with wide spread $${spread.toFixed(2)}. Taker fee debit: $${fee.toFixed(2)}.`;
      learnedLesson = `Spread of $${spread.toFixed(2)} represents high friction relative to contract value. Require higher conviction or wait for spread contraction.`;
    } else if (estimatedPnl >= 0) {
      relevanceTag = 'winning-trend';
      reflection = `Filled ${proposedQty} YES on ${ticker} at ask $${fillPrice.toFixed(2)} with favorable spread $${spread.toFixed(2)}.`;
      learnedLesson = `Tight spread ($${spread.toFixed(2)}) minimized transaction drag. Signal setup demonstrated positive statistical expectation.`;
    } else {
      reflection = `Filled ${proposedQty} YES on ${ticker} at $${fillPrice.toFixed(2)}. Total transaction cost: $${(proposedQty * fillPrice + fee).toFixed(2)}.`;
      learnedLesson = `Post-execution evaluation: ${evaluationOutput.summary}`;
    }
  } else {
    reflection = `Order approved but execution was skipped. Reason: ${executionOutput.reason}`;
    learnedLesson = 'Ensure execution environment is ready before committing risk tokens.';
  }

  return {
    id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: Date.now(),
    agentId: agent.id,
    runId,
    ticker,
    marketContext: {
      bid,
      ask,
      spread,
      action: 'buy',
      proposedQty,
      conviction: baseConviction,
    },
    outcome: {
      approved,
      executed,
      fillPrice,
      fee,
      estimatedPnl,
      rejectionReason: !approved ? riskOutput.reason : undefined,
    },
    reflection,
    learnedLesson,
    relevanceTag,
  };
}
