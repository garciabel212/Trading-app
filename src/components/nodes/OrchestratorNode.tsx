// ─── Agent Trading OS — Orchestrator Node ────────────────────────────────────
// Central intelligence coordinator: largest node, luminous ring, breathing animation,
// focal presence at the apex of cognitive and execution clusters.

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentNodeData } from '../../types';

const OrchestratorNode = memo(function OrchestratorNode({ data, selected }: NodeProps) {
  const nodeData = data as AgentNodeData;
  const { label, status, latestActivity, __dimmed } = nodeData;

  const statusClass = `node-status--${status}`;

  return (
    <div
      className={[
        'node-orchestrator',
        statusClass,
        selected ? 'node-orchestrator--selected' : '',
        __dimmed ? 'node-orchestrator--dimmed' : '',
      ].filter(Boolean).join(' ')}
      tabIndex={0}
      role="button"
      aria-label={`Orchestrator: ${label}, Status: ${status}`}
    >
      {/* Handles around the coordinator */}
      <Handle type="target" position={Position.Top} id="top" className="orch-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="orch-handle" />
      <Handle type="source" position={Position.Left} id="left" className="orch-handle" />
      <Handle type="source" position={Position.Right} id="right" className="orch-handle" />

      {/* Luminous aura & outer breathing ring */}
      <div className="node-orchestrator__halo" aria-hidden="true" />
      <div className="node-orchestrator__ring" aria-hidden="true" />

      {/* Internal core */}
      <div className="node-orchestrator__core">
        <span className="node-orchestrator__emblem" aria-hidden="true">⟡</span>
        <div className="node-orchestrator__pulse" aria-hidden="true" />
      </div>

      {/* Coordinator Identity */}
      <div className="node-orchestrator__meta">
        <span className="node-orchestrator__tag">INTELLIGENCE CORE</span>
        <span className="node-orchestrator__title">{String(label)}</span>
        <div className="node-orchestrator__status">
          <span className="node-orchestrator__status-dot" />
          <span className="node-orchestrator__status-label">
            {status === 'running' ? 'COORDINATING' : status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Subtle activity tooltip on hover or active step */}
      {latestActivity && (
        <div className="node-orchestrator__activity" title={String(latestActivity)}>
          {String(latestActivity)}
        </div>
      )}
    </div>
  );
});

export default OrchestratorNode;
