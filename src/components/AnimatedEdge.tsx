// ─── Agent Trading OS — Dynamic Animated Edge ────────────────────────────────
// Organic directional energy flow connections:
// - Idle: hairline stroke, low opacity (0.18-0.25), visible but quiet.
// - Active: luminous highlight with SVG animateMotion traveling energy particle.
// - Complete: momentarily brightens to emerald, then settles.
// - Warning: warm amber trace.
// - Failed: subtle ruby trace.

import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

export type EdgeExecutionState = 'idle' | 'active' | 'complete' | 'warning' | 'failed';

interface AnimatedEdgeData extends Record<string, unknown> {
  kind?: 'workflow' | 'dependency' | 'coordination';
  status?: EdgeExecutionState;
  animated?: boolean;
}

const AnimatedEdge = memo(function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  selected,
  markerEnd,
}: EdgeProps) {
  const edgeData = data as AnimatedEdgeData | undefined;
  const kind = edgeData?.kind ?? 'workflow';
  const isActive = Boolean(edgeData?.animated || edgeData?.status === 'active');
  const edgeStatus: EdgeExecutionState = edgeData?.status ?? (isActive ? 'active' : 'idle');

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: kind === 'coordination' ? 0.35 : 0.22,
  });

  // Determine stroke color by state and kind
  let strokeColor = 'rgba(148, 163, 184, 0.18)'; // Idle neutral
  let glowColor = 'transparent';
  let particleColor = '#38bdf8';
  let strokeWidth = 1;
  let strokeDasharray: string | undefined = undefined;

  if (kind === 'dependency') {
    strokeDasharray = '3 4';
  } else if (kind === 'coordination') {
    strokeDasharray = '4 6';
    strokeColor = 'rgba(129, 140, 248, 0.22)';
  }

  if (edgeStatus === 'active' || isActive) {
    strokeColor = kind === 'coordination' ? '#818cf8' : '#38bdf8';
    glowColor = kind === 'coordination' ? 'rgba(129, 140, 248, 0.35)' : 'rgba(56, 189, 248, 0.35)';
    strokeWidth = 1.75;
    particleColor = kind === 'coordination' ? '#a5b4fc' : '#7dd3fc';
  } else if (edgeStatus === 'complete') {
    strokeColor = 'rgba(16, 185, 129, 0.55)';
    glowColor = 'rgba(16, 185, 129, 0.25)';
    strokeWidth = 1.25;
  } else if (edgeStatus === 'warning') {
    strokeColor = 'rgba(245, 158, 11, 0.65)';
    glowColor = 'rgba(245, 158, 11, 0.25)';
    strokeWidth = 1.5;
  } else if (edgeStatus === 'failed') {
    strokeColor = 'rgba(239, 68, 68, 0.65)';
    glowColor = 'rgba(239, 68, 68, 0.25)';
    strokeWidth = 1.5;
  }

  if (selected) {
    strokeColor = '#38bdf8';
    strokeWidth = 2;
    glowColor = 'rgba(56, 189, 248, 0.4)';
  }

  return (
    <>
      {/* Glow path behind active or selected connections */}
      {(glowColor !== 'transparent' || selected) && (
        <path
          d={edgePath}
          fill="none"
          stroke={glowColor}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          style={{ transition: 'stroke 0.3s ease, stroke-width 0.3s ease' }}
        />
      )}

      {/* Main connection line */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
          transition: 'stroke 0.25s ease, stroke-width 0.25s ease, opacity 0.25s ease',
        }}
      />

      {/* Directional Traveling Energy Particle on Active Edges */}
      {isActive && (
        <circle r={2.5} fill={particleColor} className="edge-energy-particle">
          <animateMotion
            dur="1.1s"
            repeatCount="indefinite"
            path={edgePath}
            keyPoints="0;1"
            keyTimes="0;1"
          />
        </circle>
      )}

      {/* Micro-label along path */}
      {label && (
        <EdgeLabelRenderer>
          <div
            className={[
              'edge-label',
              `edge-label--${kind}`,
              isActive ? 'edge-label--active' : '',
              selected ? 'edge-label--selected' : '',
            ].filter(Boolean).join(' ')}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
          >
            <span>{String(label)}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export default AnimatedEdge;
