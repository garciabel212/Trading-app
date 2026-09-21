// ─── Agent Trading OS — Core Types ────────────────────────────────────────────

export type NodeStatus = 'idle' | 'running' | 'success' | 'warning' | 'failed' | 'skipped';

export type NodeKind =
  | 'data-source'
  | 'analyst'
  | 'strategy'
  | 'risk'
  | 'execution'
  | 'evaluation'
  | 'skill'
  | 'memory';

export type EdgeKind = 'workflow' | 'dependency';

// React Flow v12 requires node data to extend Record<string, unknown>
export interface AgentNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  kind: NodeKind;
  status: NodeStatus;
  description: string;
  purpose: string;
  relationships: string[];
  latestActivity: string | null;
  /** Internal: set by App for dimming unrelated nodes */
  __dimmed?: boolean;
}

export interface ActivityEvent {
  id: string;
  nodeId: string;
  nodeLabel: string;
  message: string;
  timestamp: number;
  status: NodeStatus;
}

// Re-export workflow trace types so components can import from a single place
export type {
  TraceEvent,
  RunRecord,
  RuleVerdict,
  Approval,
  ScenarioKey,
  EvaluationCheck,
} from '../workflow/types';
