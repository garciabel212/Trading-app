// ─── Agent Trading OS — Agent Message & Communication Contracts ───────────────
// Defines explicit message schemas passing between Alpha, Beta, Gamma,
// Portfolio Manager, Risk Engine, Paper Execution, and Coach Evaluator.

export type AgentNodeId =
  | 'trader-alpha'
  | 'trader-beta'
  | 'trader-gamma'
  | 'portfolio-manager'
  | 'risk-engine'
  | 'paper-execution'
  | 'coach-evaluator'
  | 'human-operator';

export type AgentMessageType =
  | 'proposal'
  | 'skip'
  | 'selection'
  | 'no_trade'
  | 'risk_validation'
  | 'risk_verdict'
  | 'execution_notice'
  | 'coach_record';

export interface EvidenceReference {
  indicatorOrRule: string;
  measuredValue: string | number;
  threshold?: string | number;
  sourceField?: string;
  verdictPassed?: boolean;
}

export interface AgentMessage {
  messageId: string;
  runId: string;
  snapshotId: string;
  sequence: number;
  timestamp: number;
  sender: AgentNodeId;
  recipient: AgentNodeId;
  messageType: AgentMessageType;
  conciseSummary: string;
  evidenceReferences: EvidenceReference[];
  strategyVersion: string;
  instrumentType: 'binary_contract' | 'equity_etf';
  profileKey: 'daily-weather' | 'nasdaq-oneq';
  status: 'delivered' | 'blocked' | 'pending';
}
