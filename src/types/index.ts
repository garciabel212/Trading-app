// ─── Agent Trading OS — Core Types ────────────────────────────────────────────

export type NodeStatus = 'idle' | 'running' | 'success' | 'warning' | 'failed' | 'skipped';

export type NodeKind =
  | 'orchestrator'
  | 'data-source'
  | 'analyst'
  | 'strategy'
  | 'risk'
  | 'execution'
  | 'evaluation'
  | 'skill'
  | 'memory'
  | 'trader'
  | 'portfolio-manager'
  | 'coach'
  | 'portfolio';

export type EdgeKind = 'workflow' | 'dependency' | 'coordination';

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
  /** Architectural cluster */
  cluster?: 'core' | 'perception' | 'deliberation' | 'execution' | 'competition';
  /** Parent node ID for satellites */
  parentId?: string;
  /** Whether node is a secondary satellite */
  isSatellite?: boolean;
  /** Satellite expansion state */
  isExpanded?: boolean;
  /** Callback to toggle expansion of satellite nodes */
  onToggleCluster?: () => void;
  /** Multi-agent competition fields */
  traderRole?: 'alpha' | 'beta' | 'gamma' | 'manager' | 'coach';
  equity?: number;
  lastDecision?: string;
  activePositionsCount?: number;
  compositeScore?: number;
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
