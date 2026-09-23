// ─── Agent Trading OS — Redesigned Agent Node ─────────────────────────────────
// Visual Taxonomy: Cognitive Agents, System Mechanical Nodes, Satellite Skills,
// and Data/Tool Beacons. Removes heavy rectangular card containers in favor of
// high-hierarchy, organic, living AI system morphologies.

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentNodeData, NodeKind, NodeStatus } from '../types';
import MessageBubble from './MessageBubble';

// ── Kind Taxonomy Definitions ────────────────────────────────────────────────
const KIND_ICONS: Record<NodeKind, string> = {
  'orchestrator':      '⟡',
  'data-source':       '📡',
  'analyst':           '◈',
  'strategy':          '▲',
  'risk':              '⬡',
  'execution':         '⚡',
  'evaluation':        '◎',
  'skill':             '◇',
  'memory':            '□',
  'trader':            '⚔',
  'portfolio-manager': '⚖',
  'coach':             '🧠',
  'portfolio':         '💼',
};

const KIND_ROLES: Record<NodeKind, string> = {
  'orchestrator':      'COORDINATOR',
  'data-source':       'FEED BEACON',
  'analyst':           'SIGNAL PERCEPTION',
  'strategy':          'DELIBERATION',
  'risk':              'SAFETY BOUNDARY',
  'execution':         'PAPER ROUTER',
  'evaluation':        'AUDIT & REFLECTION',
  'skill':             'SKILL SATELLITE',
  'memory':            'EPISODIC STORE',
  'trader':            'COMPETITOR AGENT',
  'portfolio-manager': 'SUPERVISOR & ALLOCATOR',
  'coach':             'COACH & AUDITOR',
  'portfolio':         'SIMULATED PORTFOLIO',
};

const AgentNode = memo(function AgentNode({ data, selected }: NodeProps) {
  const nodeData = data as AgentNodeData;
  const {
    label,
    kind,
    status,
    latestActivity,
    __dimmed,
    isSatellite,
    isExpanded,
    equity,
  } = nodeData;

  const nodeKind = (kind as NodeKind) || 'analyst';
  const nodeStatus = (status as NodeStatus) || 'idle';

  // Determine structural variant class
  let variantClass = 'agent-node--agent';
  if (nodeKind === 'risk' || nodeKind === 'execution' || nodeKind === 'evaluation') {
    variantClass = 'agent-node--system';
  } else if (nodeKind === 'skill') {
    variantClass = 'agent-node--skill';
  } else if (nodeKind === 'data-source' || nodeKind === 'memory') {
    variantClass = 'agent-node--data';
  } else if (nodeKind === 'trader') {
    variantClass = 'agent-node--trader';
  } else if (nodeKind === 'portfolio-manager' || nodeKind === 'coach') {
    variantClass = 'agent-node--supervisor';
  } else if (nodeKind === 'portfolio') {
    variantClass = 'agent-node--portfolio';
  }

  const isExecuting = nodeStatus === 'running';

  return (
    <div
      className={[
        'agent-node',
        variantClass,
        `node-status--${nodeStatus}`,
        selected ? 'agent-node--selected' : '',
        __dimmed ? 'agent-node--dimmed' : '',
        isSatellite ? 'agent-node--satellite' : '',
      ].filter(Boolean).join(' ')}
      tabIndex={0}
      role="button"
      aria-label={`${label}, ${KIND_ROLES[nodeKind]}, Status: ${nodeStatus}`}
    >
      {/* Universal Handles for organic connections */}
      <Handle type="target" position={Position.Left}   id="left"   className="node-handle" />
      <Handle type="target" position={Position.Top}    id="top"    className="node-handle" />
      <Handle type="source" position={Position.Right}  id="right"  className="node-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="node-handle" />

      {/* Luminous aura behind active/selected node */}
      <div className="agent-node__aura" aria-hidden="true" />

      {/* Primary Node Frame */}
      <div className="agent-node__frame">
        {/* State Ring & Core Indicator */}
        <div className="agent-node__glyph-ring" aria-hidden="true">
          <span className="agent-node__glyph">{KIND_ICONS[nodeKind]}</span>
          {isExecuting && <span className="agent-node__ring-pulse" />}
        </div>

        {/* Content Body */}
        <div className="agent-node__body">
          <div className="agent-node__role-bar">
            <span className="agent-node__role">{KIND_ROLES[nodeKind]}</span>
            <span className={`agent-node__state-dot state-dot--${nodeStatus}`} />
          </div>

          <div className="agent-node__title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <span className="agent-node__label" title={String(label)}>
              {String(label)}
            </span>
            {equity !== undefined && (
              <span className="agent-node__equity-pill" style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontFamily: 'monospace' }}>
                ${equity.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Cluster expansion toggle if node has satellites */}
        {nodeData.parentId === undefined && (nodeKind === 'analyst' || nodeKind === 'strategy' || nodeKind === 'risk') && (
          <button
            type="button"
            className={`agent-node__cluster-toggle ${isExpanded ? 'agent-node__cluster-toggle--expanded' : ''}`}
            title={isExpanded ? 'Collapse satellite nodes' : 'Expand satellite nodes'}
            aria-label={isExpanded ? 'Collapse satellite nodes' : 'Expand satellite nodes'}
            onClick={(e) => {
              e.stopPropagation();
              if (typeof nodeData.onToggleCluster === 'function') {
                nodeData.onToggleCluster();
              }
            }}
          >
            <span>{isExpanded ? '−' : '+'}</span>
          </button>
        )}
      </div>

      {/* Inspectable Thought Communication Bubble */}
      {nodeData.showMessageBubbles !== false && nodeData.latestMessage && (
        <MessageBubble
          message={nodeData.latestMessage}
          onClick={nodeData.onBubbleClick}
        />
      )}

      {/* Hover activity beacon: only appears on hover or active step, NOT taking permanent card space */}
      {latestActivity && (
        <div className="agent-node__micro-activity" title={String(latestActivity)}>
          <span className="agent-node__micro-activity-dot" />
          <span className="agent-node__micro-activity-text">{String(latestActivity)}</span>
        </div>
      )}
    </div>
  );
});

export default AgentNode;
