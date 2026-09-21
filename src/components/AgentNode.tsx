// ─── Agent Trading OS — Custom Agent Node ─────────────────────────────────────

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentNodeData, NodeKind, NodeStatus } from '../types';

// ── Kind → icon emoji map ──────────────────────────────────────────────────────
const KIND_ICONS: Record<NodeKind, string> = {
  'data-source': '📡',
  'analyst':     '🔍',
  'strategy':    '♟',
  'risk':        '🛡',
  'execution':   '⚡',
  'evaluation':  '📊',
  'skill':       '🔧',
  'memory':      '🧠',
};

// ── Kind → human label ─────────────────────────────────────────────────────────
const KIND_LABELS: Record<NodeKind, string> = {
  'data-source': 'data source',
  'analyst':     'analyst agent',
  'strategy':    'strategy agent',
  'risk':        'risk engine',
  'execution':   'execution',
  'evaluation':  'evaluation',
  'skill':       'skill module',
  'memory':      'memory store',
};

// ── Status badge label ─────────────────────────────────────────────────────────
const STATUS_LABELS: Record<NodeStatus, string> = {
  idle:    'idle',
  running: 'running',
  success: 'done',
  warning: 'warn',
  failed:  'failed',
  skipped: 'skipped',
};

// ── Status badge component ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: NodeStatus }) {
  return (
    <span className={`agent-node__status-badge status-badge--${status}`} aria-label={`Status: ${status}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Main Node Component ────────────────────────────────────────────────────────
const AgentNode = memo(function AgentNode({ data, selected }: NodeProps) {
  // Cast data to typed shape (React Flow v12 requires data extends Record<string,unknown>)
  const nodeData = data as AgentNodeData;
  const { label, kind, status, latestActivity, __dimmed } = nodeData;

  return (
    <div
      className={[
        'agent-node',
        selected ? 'agent-node--selected' : '',
        __dimmed ? 'agent-node--dimmed' : '',
      ].filter(Boolean).join(' ')}
      data-status={status}
      tabIndex={0}
      aria-label={`${label}, ${KIND_LABELS[kind as NodeKind]}, status: ${status}`}
      role="button"
    >
      {/* Source / Target handles — all sides for flexible layouts */}
      <Handle type="target" position={Position.Left}   id="left"   style={{ top: '50%' }} />
      <Handle type="target" position={Position.Top}    id="top"    style={{ left: '50%' }} />
      <Handle type="source" position={Position.Right}  id="right"  style={{ top: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ left: '50%' }} />

      {/* Header row: icon + label */}
      <div className="agent-node__header">
        <span
          className={`agent-node__icon agent-node__icon--${kind}`}
          aria-hidden="true"
        >
          {KIND_ICONS[kind as NodeKind]}
        </span>
        <span className="agent-node__label" title={String(label)}>
          {String(label)}
        </span>
      </div>

      {/* Status badge */}
      <StatusBadge status={status as NodeStatus} />

      {/* Kind sub-label */}
      <div className="agent-node__kind">{KIND_LABELS[kind as NodeKind]}</div>

      {/* Latest activity snippet */}
      {latestActivity && (
        <div className="agent-node__activity" title={String(latestActivity)}>
          {String(latestActivity)}
        </div>
      )}
    </div>
  );
});

export default AgentNode;
