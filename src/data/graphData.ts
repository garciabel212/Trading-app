// ─── Agent Trading OS — Graph Data ────────────────────────────────────────────
// Typed node/edge definitions — separate from rendering components.
// Extend this file to add new domains; keep IDs stable.

import type { Node, Edge } from '@xyflow/react';
import type { AgentNodeData, NodeStatus } from '../types';

// ── Initial node statuses ──────────────────────────────────────────────────────
export const INITIAL_STATUSES: Record<string, NodeStatus> = {
  'market-feed': 'idle',
  'market-analyst': 'idle',
  'strategy-agent': 'idle',
  'risk-engine': 'idle',
  'paper-execution': 'idle',
  'evaluation': 'idle',
  'analysis-skill': 'idle',
  'agent-memory': 'idle',
};

// ── Node definitions ───────────────────────────────────────────────────────────
export const INITIAL_NODES: Node<AgentNodeData>[] = [
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
      purpose: 'Streams tick data into the analysis pipeline. In production this would connect to exchange APIs and normalise data formats.',
      relationships: ['Sends data → Market Analyst'],
      latestActivity: null,
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
    },
  },
  {
    id: 'strategy-agent',
    type: 'agentNode',
    position: { x: 560, y: 220 },
    data: {
      id: 'strategy-agent',
      label: 'Strategy Agent',
      kind: 'strategy',
      status: 'idle',
      description: 'Selects and parameterises a trading strategy from the signal set.',
      purpose: 'Evaluates incoming signals against a library of strategies and outputs a parameterised trade intent. No real orders are generated here.',
      relationships: [
        'Receives signals ← Market Analyst',
        'Sends intent → Risk Engine',
      ],
      latestActivity: null,
    },
  },
  {
    id: 'risk-engine',
    type: 'agentNode',
    position: { x: 810, y: 220 },
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
    },
  },
  {
    id: 'paper-execution',
    type: 'agentNode',
    position: { x: 1060, y: 220 },
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
    },
  },
  {
    id: 'evaluation',
    type: 'agentNode',
    position: { x: 1310, y: 220 },
    data: {
      id: 'evaluation',
      label: 'Evaluation',
      kind: 'evaluation',
      status: 'idle',
      description: 'Scores workflow quality and logs demo run completion.',
      purpose: 'Measures latency, signal quality, and rule adherence across the pipeline. Reports demo completion only — no investment performance is inferred.',
      relationships: ['Receives fill report ← Paper Execution'],
      latestActivity: null,
    },
  },
  {
    id: 'analysis-skill',
    type: 'agentNode',
    position: { x: 310, y: 440 },
    data: {
      id: 'analysis-skill',
      label: 'Analysis Skill',
      kind: 'skill',
      status: 'idle',
      description: 'Reusable pattern-recognition skill module.',
      purpose: 'Provides RSI, MACD, and momentum indicator computations to the Market Analyst. Skills are composable and domain-agnostic.',
      relationships: ['Used by → Market Analyst'],
      latestActivity: null,
    },
  },
  {
    id: 'agent-memory',
    type: 'agentNode',
    position: { x: 310, y: 20 },
    data: {
      id: 'agent-memory',
      label: 'Agent Memory',
      kind: 'memory',
      status: 'idle',
      description: 'Persistent context store for the analyst agent.',
      purpose: 'Holds recent signal history, prior run summaries, and contextual embeddings. Read on each analysis cycle to improve consistency.',
      relationships: ['Read by → Market Analyst'],
      latestActivity: null,
    },
  },
];

// ── Edge definitions ───────────────────────────────────────────────────────────
export const INITIAL_EDGES: Edge[] = [
  // Workflow edges (main pipeline)
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
  // Dependency edges (support connections)
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
];
