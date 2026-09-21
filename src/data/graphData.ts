// ─── Agent Trading OS — Graph Data ────────────────────────────────────────────
// Hierarchical Knowledge Graph: Central Orchestrator, Perception Cluster,
// Deliberation Cluster, and Execution Cluster with orbital satellites.

import type { Node, Edge } from '@xyflow/react';
import type { AgentNodeData, NodeStatus } from '../types';

// ── Initial node statuses ──────────────────────────────────────────────────────
export const INITIAL_STATUSES: Record<string, NodeStatus> = {
  'orchestrator': 'idle',
  'market-feed': 'idle',
  'market-analyst': 'idle',
  'strategy-agent': 'idle',
  'risk-engine': 'idle',
  'paper-execution': 'idle',
  'evaluation': 'idle',
  'analysis-skill': 'idle',
  'agent-memory': 'idle',
};

// ── Node definitions with Living AI System Hierarchy ──────────────────────────
export const INITIAL_NODES: Node<AgentNodeData>[] = [
  // ── Central Orchestrator Core ──────────────────────────────────────────────
  {
    id: 'orchestrator',
    type: 'orchestratorNode',
    position: { x: 580, y: 30 },
    data: {
      id: 'orchestrator',
      label: 'Orchestrator Core',
      kind: 'orchestrator',
      status: 'idle',
      description: 'Central intelligence coordinator managing agent clusters, cognitive workflows, and risk guardrails.',
      purpose: 'Coordinates multi-agent deliberations, aligns perception and execution clusters, and maintains operating system integrity.',
      relationships: [
        'Directs → Market Analyst',
        'Guides → Strategy Agent',
        'Monitors → Risk Engine',
      ],
      latestActivity: null,
      cluster: 'core',
    },
  },

  // ── Perception Cluster (Left) ──────────────────────────────────────────────
  {
    id: 'market-feed',
    type: 'agentNode',
    position: { x: 60, y: 220 },
    data: {
      id: 'market-feed',
      label: 'Market Feed',
      kind: 'data-source',
      status: 'idle',
      description: 'Real-time price and volume data ingestion layer.',
      purpose: 'Streams tick data into the analysis pipeline. Connects to live exchange orderbooks and normalizes tick structures.',
      relationships: ['Streams data → Market Analyst'],
      latestActivity: null,
      cluster: 'perception',
      isSatellite: true,
      parentId: 'market-analyst',
    },
  },
  {
    id: 'market-analyst',
    type: 'agentNode',
    position: { x: 310, y: 220 },
    data: {
      id: 'market-analyst',
      label: 'Market Analyst',
      kind: 'analyst',
      status: 'idle',
      description: 'AI agent that analyses market signals and detects patterns.',
      purpose: 'Consumes market data, applies pattern-recognition skills, and reads historical context from memory before emitting signals to the strategy layer.',
      relationships: [
        'Receives data ← Market Feed',
        'Uses → Analysis Skill',
        'Reads from → Agent Memory',
        'Sends signals → Strategy Agent',
      ],
      latestActivity: null,
      cluster: 'perception',
      isExpanded: true,
    },
  },
  {
    id: 'analysis-skill',
    type: 'agentNode',
    position: { x: 310, y: 410 },
    data: {
      id: 'analysis-skill',
      label: 'Analysis Skill',
      kind: 'skill',
      status: 'idle',
      description: 'Reusable pattern-recognition skill module.',
      purpose: 'Provides RSI, MACD, and momentum indicator computations to the Market Analyst. Skills are composable and domain-agnostic.',
      relationships: ['Used by → Market Analyst'],
      latestActivity: null,
      cluster: 'perception',
      isSatellite: true,
      parentId: 'market-analyst',
    },
  },

  // ── Deliberation Cluster (Center) ──────────────────────────────────────────
  {
    id: 'strategy-agent',
    type: 'agentNode',
    position: { x: 580, y: 220 },
    data: {
      id: 'strategy-agent',
      label: 'Strategy Agent',
      kind: 'strategy',
      status: 'idle',
      description: 'Selects and parameterises a trading strategy from the signal set.',
      purpose: 'Evaluates incoming signals against a library of strategies and outputs a parameterised trade intent. Incorporates episodic memory feedback.',
      relationships: [
        'Receives signals ← Market Analyst',
        'Queries → Agent Memory',
        'Sends intent → Risk Engine',
      ],
      latestActivity: null,
      cluster: 'deliberation',
      isExpanded: true,
    },
  },
  {
    id: 'agent-memory',
    type: 'agentNode',
    position: { x: 580, y: 410 },
    data: {
      id: 'agent-memory',
      label: 'Agent Memory',
      kind: 'memory',
      status: 'idle',
      description: 'Persistent context store for episodic reflections.',
      purpose: 'Holds recent signal history, prior run summaries, and contextual lessons. Informs sizing and conviction adaptation on each cycle.',
      relationships: [
        'Read by → Strategy Agent',
        'Committed by → Evaluation',
      ],
      latestActivity: null,
      cluster: 'deliberation',
      isSatellite: true,
      parentId: 'strategy-agent',
    },
  },

  // ── Execution Cluster (Right) ──────────────────────────────────────────────
  {
    id: 'risk-engine',
    type: 'agentNode',
    position: { x: 850, y: 220 },
    data: {
      id: 'risk-engine',
      label: 'Risk Engine',
      kind: 'risk',
      status: 'idle',
      description: 'Validates trade intent against position limits and exposure rules.',
      purpose: 'Checks sizing, drawdown, and concentration before forwarding a vetted order to execution. Hard stop on any breach.',
      relationships: [
        'Receives intent ← Strategy Agent',
        'Forwards vetted order → Paper Execution',
      ],
      latestActivity: null,
      cluster: 'execution',
      isExpanded: true,
    },
  },
  {
    id: 'paper-execution',
    type: 'agentNode',
    position: { x: 1100, y: 220 },
    data: {
      id: 'paper-execution',
      label: 'Paper Execution',
      kind: 'execution',
      status: 'idle',
      description: 'Simulated order routing — no real money, no real broker.',
      purpose: 'Records fictional paper trades for backtesting and evaluation purposes only. All orders are clearly labelled DEMO/SIMULATED.',
      relationships: [
        'Receives vetted order ← Risk Engine',
        'Reports fill → Evaluation',
      ],
      latestActivity: null,
      cluster: 'execution',
    },
  },
  {
    id: 'evaluation',
    type: 'agentNode',
    position: { x: 1100, y: 410 },
    data: {
      id: 'evaluation',
      label: 'Evaluation',
      kind: 'evaluation',
      status: 'idle',
      description: 'Scores workflow quality and logs demo run completion.',
      purpose: 'Measures latency, signal quality, and rule adherence across the pipeline. Commits post-execution reflection into Agent Memory.',
      relationships: [
        'Receives fill report ← Paper Execution',
        'Commits lesson → Agent Memory',
      ],
      latestActivity: null,
      cluster: 'execution',
      isSatellite: true,
      parentId: 'paper-execution',
    },
  },
];

// ── Edge definitions ───────────────────────────────────────────────────────────
export const INITIAL_EDGES: Edge[] = [
  // ── Orchestrator Coordination Radial Edges ─────────────────────────────────
  {
    id: 'e-orch-analyst',
    source: 'orchestrator',
    target: 'market-analyst',
    type: 'animatedEdge',
    data: { kind: 'coordination' },
    label: 'directs',
  },
  {
    id: 'e-orch-strategy',
    source: 'orchestrator',
    target: 'strategy-agent',
    type: 'animatedEdge',
    data: { kind: 'coordination' },
    label: 'guides',
  },
  {
    id: 'e-orch-risk',
    source: 'orchestrator',
    target: 'risk-engine',
    type: 'animatedEdge',
    data: { kind: 'coordination' },
    label: 'monitors',
  },

  // ── Main Pipeline Workflow Edges ───────────────────────────────────────────
  {
    id: 'e-feed-analyst',
    source: 'market-feed',
    target: 'market-analyst',
    type: 'animatedEdge',
    data: { kind: 'workflow' },
    label: 'market data',
  },
  {
    id: 'e-analyst-strategy',
    source: 'market-analyst',
    target: 'strategy-agent',
    type: 'animatedEdge',
    data: { kind: 'workflow' },
    label: 'signals',
  },
  {
    id: 'e-strategy-risk',
    source: 'strategy-agent',
    target: 'risk-engine',
    type: 'animatedEdge',
    data: { kind: 'workflow' },
    label: 'trade intent',
  },
  {
    id: 'e-risk-execution',
    source: 'risk-engine',
    target: 'paper-execution',
    type: 'animatedEdge',
    data: { kind: 'workflow' },
    label: 'vetted order',
  },
  {
    id: 'e-execution-eval',
    source: 'paper-execution',
    target: 'evaluation',
    type: 'animatedEdge',
    data: { kind: 'workflow' },
    label: 'fill report',
  },

  // ── Satellite Dependency Edges ─────────────────────────────────────────────
  {
    id: 'e-skill-analyst',
    source: 'analysis-skill',
    target: 'market-analyst',
    type: 'animatedEdge',
    data: { kind: 'dependency' },
    label: 'uses',
  },
  {
    id: 'e-memory-analyst',
    source: 'agent-memory',
    target: 'market-analyst',
    type: 'animatedEdge',
    data: { kind: 'dependency' },
    label: 'reads from',
  },
  {
    id: 'e-memory-strategy',
    source: 'agent-memory',
    target: 'strategy-agent',
    type: 'animatedEdge',
    data: { kind: 'dependency' },
    label: 'context',
  },
];
