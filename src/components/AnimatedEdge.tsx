// ─── Agent Trading OS — Custom Animated Edge ──────────────────────────────────

import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

interface AnimatedEdgeData {
  kind: 'workflow' | 'dependency';
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
  const isAnimating = edgeData?.animated ?? false;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25,
  });

  const isWorkflow = kind === 'workflow';

  const strokeColor = selected
    ? (isWorkflow ? '#22d3ee' : '#a78bfa')
    : (isWorkflow ? 'rgba(6,182,212,0.45)' : 'rgba(139,92,246,0.45)');

  const strokeWidth = selected ? 1.5 : 1;

  const dashArray = isWorkflow ? undefined : '5 4';

  return (
    <>
      {/* Shadow / glow path (only when selected or animating) */}
      {(selected || isAnimating) && (
        <path
          d={edgePath}
          fill="none"
          stroke={isWorkflow ? 'rgba(6,182,212,0.25)' : 'rgba(139,92,246,0.25)'}
          strokeWidth={6}
          strokeLinecap="round"
        />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: isAnimating
            ? '8 4'
            : dashArray,
          animation: isAnimating
            ? 'edge-flow 0.5s linear infinite'
            : undefined,
          transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s',
        }}
      />

      {/* Edge label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                color: selected ? (isWorkflow ? '#22d3ee' : '#a78bfa') : 'rgba(136,146,164,0.8)',
                background: 'rgba(12,14,20,0.85)',
                padding: '1px 5px',
                borderRadius: 3,
                letterSpacing: '0.04em',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                transition: 'color 0.2s',
              }}
            >
              {String(label)}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export default AnimatedEdge;
