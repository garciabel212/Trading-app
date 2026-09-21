// ─── Agent Trading OS — Demo Runner Hook (v2) ─────────────────────────────────
// Replaces the scripted DemoStep approach.
//
// Architecture:
//   1. runWorkflow() executes ALL pipeline stages synchronously and returns a
//      complete RunRecord with every TraceEvent already determined.
//   2. This hook then uses timers ONLY to pace delivery of those pre-computed
//      events to React state — one event per ~900ms — for visual playback.
//   3. Decisions are never made inside timer callbacks.
//   4. Reset cancels all pending delivery timers; no events arrive afterward.

import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { AgentNodeData, ActivityEvent, ScenarioKey } from '../types';
import type { TraceEvent, RunRecord } from '../workflow/types';
import { INITIAL_NODES, INITIAL_EDGES } from '../data/graphData';
import { runWorkflow } from '../workflow/runner';
import { executionAdapter } from '../workflow/adapter';
import { SCENARIOS } from '../workflow/scenarios';

// Full React Flow node type
type AgentFlowNode = Node<AgentNodeData>;

/** ms between delivering successive events to the UI */
const EVENT_PACE_MS = 900;

// Map from TraceEventType to NodeStatus for graph display
function traceEventToNodeStatus(eventType: TraceEvent['eventType']): AgentNodeData['status'] {
  switch (eventType) {
    case 'node-start':    return 'running';
    case 'node-complete': return 'success';
    case 'node-skipped':  return 'skipped';
    case 'node-error':    return 'failed';
  }
}

// Which graph edge to animate when transitioning between nodes
const EDGE_FOR_NODE: Record<string, string | undefined> = {
  'market-analyst':  'e-feed-analyst',
  'strategy-agent':  'e-analyst-strategy',
  'risk-engine':     'e-strategy-risk',
  'paper-execution': 'e-risk-execution',
  'evaluation':      'e-execution-eval',
};

interface UseDemoRunnerOptions {
  setNodes: Dispatch<SetStateAction<AgentFlowNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setActivity: Dispatch<SetStateAction<ActivityEvent[]>>;
  setIsRunning: Dispatch<SetStateAction<boolean>>;
  setDemoStatus: (status: 'complete' | null) => void;
  setRunRecord: Dispatch<SetStateAction<RunRecord | null>>;
}

function resetNodes(setNodes: UseDemoRunnerOptions['setNodes']) {
  setNodes(
    INITIAL_NODES.map((n) => ({
      ...n,
      data: { ...n.data, status: 'idle' as const, latestActivity: null, __dimmed: false },
    }))
  );
}

function resetEdges(setEdges: UseDemoRunnerOptions['setEdges']) {
  setEdges(
    INITIAL_EDGES.map((e) => ({
      ...e,
      data: { ...(e.data as Record<string, unknown>), animated: false },
      selected: false,
    }))
  );
}

export function useDemoRunner({
  setNodes,
  setEdges,
  setActivity,
  setIsRunning,
  setDemoStatus,
  setRunRecord,
}: UseDemoRunnerOptions) {
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const cancelAll = useCallback(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  }, []);

  const reset = useCallback(() => {
    cancelAll();
    setIsRunning(false);
    setDemoStatus(null);
    setActivity([]);
    setRunRecord(null);
    executionAdapter.reset();
    resetNodes(setNodes);
    resetEdges(setEdges);
  }, [cancelAll, setIsRunning, setDemoStatus, setActivity, setRunRecord, setNodes, setEdges]);

  const runDemo = useCallback((scenarioKey: ScenarioKey) => {
    cancelAll();
    setIsRunning(true);
    setDemoStatus(null);
    setActivity([]);
    setRunRecord(null);
    executionAdapter.reset();
    resetNodes(setNodes);
    resetEdges(setEdges);

    // ── Step 1: Execute the full pipeline synchronously ──────────────────────
    const input = SCENARIOS[scenarioKey];
    const record = runWorkflow(input, executionAdapter);

    // Make the completed record available immediately (for inspector, tests)
    setRunRecord(record);

    // ── Step 2: Pace delivery of pre-computed events to UI ───────────────────
    record.events.forEach((event, i) => {
      const delay = i * EVENT_PACE_MS;

      const t = setTimeout(() => {
        const status = traceEventToNodeStatus(event.eventType);

        // Update node status + activity snippet
        setNodes((prev) =>
          prev.map((node) =>
            node.id === event.nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    status,
                    latestActivity: event.decision,
                  },
                }
              : node
          )
        );

        // Animate the incoming edge when a node starts
        if (event.eventType === 'node-start') {
          const edgeId = EDGE_FOR_NODE[event.nodeId];
          if (edgeId) {
            setEdges((prev) =>
              prev.map((edge) => ({
                ...edge,
                data: {
                  ...(edge.data as Record<string, unknown>),
                  animated: edge.id === edgeId,
                },
              }))
            );
            // Stop animation after one cycle
            const stopT = setTimeout(() => {
              setEdges((prev) =>
                prev.map((edge) =>
                  edge.id === edgeId
                    ? { ...edge, data: { ...(edge.data as Record<string, unknown>), animated: false } }
                    : edge
                )
              );
            }, EVENT_PACE_MS - 100);
            timerRefs.current.push(stopT);
          }
        }

        // Only push to activity strip for meaningful events (not start)
        if (event.eventType !== 'node-start') {
          const nodeLabel =
            INITIAL_NODES.find((n) => n.id === event.nodeId)?.data.label ?? event.nodeId;
          setActivity((prev) => [
            ...prev,
            {
              id: event.eventId,
              nodeId: event.nodeId,
              nodeLabel,
              message: event.decision,
              timestamp: event.timestamp,
              status,
            },
          ]);
        }
      }, delay);

      timerRefs.current.push(t);
    });

    // Mark complete after all events delivered
    const completionDelay = record.events.length * EVENT_PACE_MS + 200;
    const doneT = setTimeout(() => {
      setIsRunning(false);
      setDemoStatus('complete');
    }, completionDelay);
    timerRefs.current.push(doneT);
  }, [cancelAll, setIsRunning, setDemoStatus, setActivity, setRunRecord, setNodes, setEdges]);

  const cleanup = useCallback(() => cancelAll(), [cancelAll]);

  return { runDemo, reset, cleanup };
}
