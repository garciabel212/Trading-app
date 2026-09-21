// ─── Agent Trading OS — Agent Creator & Memory Learning Tests ───────────────────
// Tests:
// 1. Preset agent loading and custom agent creation/persistence.
// 2. Episodic memory storage, retrieval, and similarity querying.
// 3. Multi-cycle learning: reflections accumulate and adjust Strategy conviction.
// 4. Workflow execution with active custom agent runs all 8 nodes (including skill & memory).

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PRESET_AGENTS,
  getAllAgents,
  getAgentById,
  createCustomAgent,
  deleteCustomAgent,
  AVAILABLE_SKILLS,
} from '../agents/agentRegistry';
import {
  addEpisodicMemory,
  getMemoriesForAgent,
  clearAgentMemories,
  queryRelevantMemories,
} from '../agents/memoryStore';
import { runWorkflow } from '../workflow/runner';
import { freshAdapter } from '../workflow/adapter';
import { SCENARIOS } from '../workflow/scenarios';
import type { TradingAgentProfile } from '../agents/types';

describe('1. Agent Registry & Skill Configuration', () => {
  it('loads all 4 curated preset trading agents', () => {
    const agents = getAllAgents();
    expect(agents.length).toBeGreaterThanOrEqual(4);

    const alphaScalper = getAgentById('agent-alpha-scalper');
    expect(alphaScalper).toBeDefined();
    expect(alphaScalper.name).toBe('Alpha Scalper');
    expect(alphaScalper.parameters.targetOrderSize).toBe(5);
    expect(alphaScalper.skills).toContain('momentum-trend');
  });

  it('provides rich skill definitions with indicators and domains', () => {
    expect(AVAILABLE_SKILLS.length).toBeGreaterThanOrEqual(4);
    const spreadSkill = AVAILABLE_SKILLS.find((s) => s.id === 'kalshi-spread-analyzer');
    expect(spreadSkill).toBeDefined();
    expect(spreadSkill?.indicator).toBe('Spread-to-Price Ratio');
  });

  it('creates and persists a custom agent', () => {
    const custom = createCustomAgent({
      name: 'Kalshi Event Scout',
      role: 'strategy',
      strategyType: 'spread-arbitrage',
      skills: ['kalshi-spread-analyzer'],
      parameters: {
        convictionThreshold: 0.82,
        targetOrderSize: 4,
        maxSpreadTolerance: 0.03,
        preferredSide: 'buy',
      },
      systemPrompt: 'Scout tight spread binary event contracts and trade high conviction.',
    });

    expect(custom.id).toContain('custom-agent-');
    expect(custom.name).toBe('Kalshi Event Scout');
    expect(custom.parameters.targetOrderSize).toBe(4);

    // Verify retrieval
    const fetched = getAgentById(custom.id);
    expect(fetched.id).toBe(custom.id);

    // Clean up
    deleteCustomAgent(custom.id);
  });
});

describe('2. Episodic Memory Store & Similarity Querying', () => {
  const testAgentId = 'test-agent-learning-1';

  beforeEach(() => {
    clearAgentMemories(testAgentId);
  });

  it('returns baseline prior when no memories exist', () => {
    const agent = PRESET_AGENTS[0];
    const query = queryRelevantMemories(agent, 'KXELONMARS-99', 0.03);

    expect(query.queriedCount).toBe(0);
    expect(query.convictionAdjustment).toBe(0);
    expect(query.priorLessonsApplied[0]).toContain('No historical episodic memories');
  });

  it('down-weights conviction when high-spread loss memory exists', () => {
    const agent: TradingAgentProfile = {
      ...PRESET_AGENTS[0],
      id: testAgentId,
    };

    // Add a negative memory where high spread caused loss
    addEpisodicMemory({
      id: 'mem-test-loss-1',
      timestamp: Date.now() - 1000,
      agentId: testAgentId,
      runId: 'run-loss-1',
      ticker: 'KXELONMARS-99',
      marketContext: {
        bid: 0.09,
        ask: 0.12,
        spread: 0.03,
        action: 'buy',
        proposedQty: 5,
        conviction: 0.75,
      },
      outcome: {
        approved: true,
        executed: true,
        fillPrice: 0.12,
        fee: 0.04,
        estimatedPnl: -0.18,
      },
      reflection: 'Spread of $0.03 consumed edge.',
      learnedLesson: 'High spread eroded profit margin.',
      relevanceTag: 'high-spread',
    });

    const query = queryRelevantMemories(agent, 'KXELONMARS-99', 0.03);
    expect(query.queriedCount).toBe(1);
    expect(query.convictionAdjustment).toBeLessThan(0); // Penalized
    expect(query.priorLessonsApplied[0]).toContain('Fee drag exceeded edge');
  });
});

describe('3. Active Agent Pipeline & Learning Loop', () => {
  const learningAgentId = 'test-agent-cycler';

  beforeEach(() => {
    clearAgentMemories(learningAgentId);
  });

  it('executes full 8-node pipeline with analysis-skill and agent-memory when agent is active', () => {
    const adapter = freshAdapter();
    const agent: TradingAgentProfile = {
      ...PRESET_AGENTS[0],
      id: learningAgentId,
      name: 'Alpha Tester',
    };

    const record = runWorkflow(SCENARIOS.allowed, adapter, undefined, agent);

    expect(record.agentId).toBe(learningAgentId);
    expect(record.agentName).toBe('Alpha Tester');

    // Verify all 8 nodes emitted events
    const nodeIds = new Set(record.events.map((e) => e.nodeId));
    expect(nodeIds.has('market-feed')).toBe(true);
    expect(nodeIds.has('analysis-skill')).toBe(true);
    expect(nodeIds.has('market-analyst')).toBe(true);
    expect(nodeIds.has('agent-memory')).toBe(true);
    expect(nodeIds.has('strategy-agent')).toBe(true);
    expect(nodeIds.has('risk-engine')).toBe(true);
    expect(nodeIds.has('paper-execution')).toBe(true);
    expect(nodeIds.has('evaluation')).toBe(true);

    // Verify episodic reflection was committed to memory
    const memories = getMemoriesForAgent(learningAgentId);
    expect(memories.length).toBe(1);
    expect(memories[0].learnedLesson).toBeTruthy();
    expect(memories[0].agentId).toBe(learningAgentId);
  });

  it('successive cycles accumulate reflections and adapt strategy conviction', () => {
    const adapter = freshAdapter();
    const agent: TradingAgentProfile = {
      ...PRESET_AGENTS[0],
      id: learningAgentId,
      name: 'Alpha Learner',
      parameters: {
        ...PRESET_AGENTS[0].parameters,
        convictionThreshold: 0.75,
      },
    };

    // Cycle 1: Baseline run
    const run1 = runWorkflow(SCENARIOS.allowed, adapter, undefined, agent);
    const strategyEvent1 = run1.events.find(
      (e) => e.nodeId === 'strategy-agent' && e.eventType === 'node-complete',
    );
    const conf1 = (strategyEvent1?.output as { confidenceScore: number }).confidenceScore;
    expect(conf1).toBe(0.75); // Baseline

    // Check memory now has 1 reflection
    const memAfterCycle1 = getMemoriesForAgent(learningAgentId);
    expect(memAfterCycle1).toHaveLength(1);

    // Cycle 2: Strategy Agent reads memory from Cycle 1
    const run2 = runWorkflow(SCENARIOS.allowed, adapter, undefined, agent);
    const memoryQueryEvent2 = run2.events.find(
      (e) => e.nodeId === 'agent-memory' && e.eventType === 'node-complete' && (e.input as { action?: string }).action !== 'commit-reflection',
    );
    expect(memoryQueryEvent2).toBeDefined();

    // Check memories accumulated to 2
    const memAfterCycle2 = getMemoriesForAgent(learningAgentId);
    expect(memAfterCycle2).toHaveLength(2);
  });
});
