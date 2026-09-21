// ─── Agent Trading OS — Replay State Derivation Engine ────────────────────────
// Pure functions for deriving application state from an immutable trace prefix.
// Invariant: Given a RunRecord and a cursorIndex (0..N-1), the returned state
// is completely deterministic. Moving backward clears later outputs. No future
// events or evaluations leak into earlier steps.

import type { Node, Edge } from '@xyflow/react';
import type { AgentNodeData, ActivityEvent, NodeStatus } from '../types';
import type {
  TraceEvent,
  RunRecord,
  RuleVerdict,
  Approval,
  EvaluationOutput,
  MockOrder,
  StrategyOutput,
  RiskOutput,
} from './types';
import { MAX_ORDER_QTY } from './scenarios';

type AgentFlowNode = Node<AgentNodeData>;

export const EDGE_FOR_NODE: Record<string, string> = {
  'analysis-skill':  'e-skill-analyst',
  'market-analyst':  'e-feed-analyst',
  'agent-memory':    'e-memory-analyst',
  'strategy-agent':  'e-analyst-strategy',
  'risk-engine':     'e-strategy-risk',
  'paper-execution': 'e-risk-execution',
  'evaluation':      'e-execution-eval',
};

/** Convert a TraceEventType to a graph NodeStatus */
export function traceEventToNodeStatus(eventType: TraceEvent['eventType']): NodeStatus {
  switch (eventType) {
    case 'node-start':    return 'running';
    case 'node-complete': return 'success';
    case 'node-skipped':  return 'skipped';
    case 'node-error':    return 'failed';
  }
}

/**
 * Derives node statuses and latest activity messages from activeEvents prefix.
 * Nodes that have not yet had any event are reset to 'idle' with latestActivity: null.
 */
export function deriveNodeStates(
  baseNodes: AgentFlowNode[],
  activeEvents: TraceEvent[],
): AgentFlowNode[] {
  // Map of nodeId -> latest event
  const latestEventByNode = new Map<string, TraceEvent>();
  for (const ev of activeEvents) {
    latestEventByNode.set(ev.nodeId, ev);
  }

  return baseNodes.map((node) => {
    const ev = latestEventByNode.get(node.id);
    if (!ev) {
      return {
        ...node,
        data: {
          ...node.data,
          status: 'idle' as NodeStatus,
          latestActivity: null,
        },
      };
    }

    return {
      ...node,
      data: {
        ...node.data,
        status: traceEventToNodeStatus(ev.eventType),
        latestActivity: ev.decision,
      },
    };
  });
}

/**
 * Derives animated edge status from the most recent event.
 * If the current event is a 'node-start', the incoming edge to that node is animated.
 */
export function deriveEdgeStates(
  baseEdges: Edge[],
  activeEvents: TraceEvent[],
): Edge[] {
  if (activeEvents.length === 0) {
    return baseEdges.map((e) => ({
      ...e,
      data: { ...(e.data as Record<string, unknown>), animated: false },
    }));
  }

  const latest = activeEvents[activeEvents.length - 1];
  const activeEdgeId =
    latest.eventType === 'node-start' ? EDGE_FOR_NODE[latest.nodeId] : undefined;

  return baseEdges.map((e) => ({
    ...e,
    data: {
      ...(e.data as Record<string, unknown>),
      animated: activeEdgeId !== undefined && e.id === activeEdgeId,
    },
  }));
}

/**
 * Derives visible activity events from activeEvents (excludes 'node-start' events).
 */
export function deriveActivityEvents(
  activeEvents: TraceEvent[],
  nodeLabels: Record<string, string>,
): ActivityEvent[] {
  return activeEvents
    .filter((e) => e.eventType !== 'node-start')
    .map((e) => ({
      id: e.eventId,
      nodeId: e.nodeId,
      nodeLabel: nodeLabels[e.nodeId] ?? e.nodeId,
      message: e.decision,
      timestamp: e.timestamp,
      status: traceEventToNodeStatus(e.eventType),
    }));
}

// ── Point-in-Time Inspector Trace Model ───────────────────────────────────────

export interface RiskDecisionBreakdown {
  proposedQty: number;
  configuredLimit: number;
  comparison: string;
  passed: boolean;
  verdictLabel: string;
  resultingRoute: string;
  validationToken: Approval | null;
}

export interface NodePointInTimeTrace {
  reached: boolean;
  status: 'unreached' | 'running' | 'completed' | 'skipped' | 'failed';
  startEvent: TraceEvent | null;
  completeEvent: TraceEvent | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  decision: string | null;
  ruleVerdict: RuleVerdict | null;
  skipReason: string | null;
  summaryText: string;
  riskBreakdown: RiskDecisionBreakdown | null;
  evalOutput: EvaluationOutput | null;
  paperOrders: MockOrder[];
}

/**
 * Derives the point-in-time trace for a specific node at cursor position.
 * Future outputs and unreached nodes are strictly hidden.
 */
export function deriveNodeInspectorTrace(
  nodeId: string,
  activeEvents: TraceEvent[],
): NodePointInTimeTrace {
  const nodeEvents = activeEvents.filter((e) => e.nodeId === nodeId);

  if (nodeEvents.length === 0) {
    return {
      reached: false,
      status: 'unreached',
      startEvent: null,
      completeEvent: null,
      input: null,
      output: null,
      decision: null,
      ruleVerdict: null,
      skipReason: null,
      summaryText: 'Not reached at this replay step.',
      riskBreakdown: null,
      evalOutput: null,
      paperOrders: [],
    };
  }

  const startEvent = nodeEvents.find((e) => e.eventType === 'node-start') ?? null;
  const completeEvent =
    nodeEvents.find(
      (e) =>
        e.eventType === 'node-complete' ||
        e.eventType === 'node-skipped' ||
        e.eventType === 'node-error',
    ) ?? null;

  if (!completeEvent) {
    // Node is currently executing (only start event present)
    return {
      reached: true,
      status: 'running',
      startEvent,
      completeEvent: null,
      input: startEvent?.input ?? {},
      output: null, // Future output not yet produced
      decision: startEvent?.decision ?? 'Stage in progress…',
      ruleVerdict: null,
      skipReason: null,
      summaryText: 'This stage has started and is currently processing inputs at this replay step.',
      riskBreakdown: null,
      evalOutput: null,
      paperOrders: [],
    };
  }

  const isSkipped = completeEvent.eventType === 'node-skipped';
  const isError = completeEvent.eventType === 'node-error';
  const status = isSkipped ? 'skipped' : isError ? 'failed' : 'completed';

  // Build plain-language summary
  let summaryText = completeEvent.decision;
  let riskBreakdown: RiskDecisionBreakdown | null = null;
  let evalOutput: EvaluationOutput | null = null;
  const paperOrders: MockOrder[] = [];

  // Plain-language summary & Risk Engine breakdown
  if (nodeId === 'risk-engine') {
    const riskOut = completeEvent.output as Partial<RiskOutput> | undefined;
    const verdict = completeEvent.ruleVerdict ?? riskOut?.verdict;
    const stratIn = completeEvent.input as Partial<StrategyOutput> | undefined;
    const proposedQty = verdict?.observed ?? stratIn?.proposedQty ?? 0;
    const configuredLimit = verdict?.threshold ?? MAX_ORDER_QTY;
    const passed = verdict?.passed ?? (proposedQty <= configuredLimit);

    const comparison = passed
      ? `${proposedQty} <= ${configuredLimit} (Within policy limit)`
      : `${proposedQty} > ${configuredLimit} (Exceeds policy limit by ${proposedQty - configuredLimit})`;

    const verdictLabel = passed ? 'Approved' : 'Blocked';
    const resultingRoute = passed
      ? 'Route order to Paper Execution with structured local validation token'
      : 'Route to Paper Execution as SKIPPED (order blocked by risk rules)';

    summaryText = passed
      ? `Risk Engine evaluated the proposed order of ${proposedQty} units. Since it satisfies the maximum order size rule (<= ${configuredLimit}), the order is approved and a structured local validation token was issued.`
      : `Risk Engine evaluated the proposed order of ${proposedQty} units. Since it violates the maximum order size rule (> ${configuredLimit}), the order is blocked and the validation token was withheld.`;

    riskBreakdown = {
      proposedQty,
      configuredLimit,
      comparison,
      passed,
      verdictLabel,
      resultingRoute,
      validationToken: riskOut?.approval ?? null,
    };
  } else if (nodeId === 'market-feed') {
    summaryText = 'Market Feed ingested simulated tick data and identified top symbol.';
  } else if (nodeId === 'market-analyst') {
    summaryText = 'Market Analyst computed technical indicators and identified top directional signal.';
  } else if (nodeId === 'strategy-agent') {
    summaryText = `Strategy Agent generated a momentum order proposal based on analyst signals.`;
  } else if (nodeId === 'paper-execution') {
    if (isSkipped) {
      summaryText = `Paper Execution was skipped because no valid approval token was provided: ${completeEvent.skipReason ?? 'Blocked by Risk Engine'}.`;
    } else {
      const execOut = completeEvent.output as { order?: MockOrder } | undefined;
      if (execOut?.order) {
        paperOrders.push(execOut.order);
        summaryText = `Paper Execution validated the structured approval token and recorded simulated order ${execOut.order.orderId}.`;
      } else {
        summaryText = `Paper Execution completed: ${completeEvent.decision}.`;
      }
    }
  } else if (nodeId === 'evaluation') {
    evalOutput = completeEvent.output as unknown as EvaluationOutput;
    summaryText = evalOutput?.overallPassed
      ? `Evaluation verified all pipeline invariants and independent policy limits: All checks passed.`
      : `Evaluation detected invariant or policy limit failures: Checks failed.`;
  }

  return {
    reached: true,
    status,
    startEvent,
    completeEvent,
    input: completeEvent.input ?? startEvent?.input ?? {},
    output: completeEvent.output ?? {},
    decision: completeEvent.decision,
    ruleVerdict: completeEvent.ruleVerdict ?? null,
    skipReason: completeEvent.skipReason ?? null,
    summaryText,
    riskBreakdown,
    evalOutput,
    paperOrders,
  };
}

/**
 * Returns snapshot of replay state for a given cursorIndex.
 */
export function deriveReplaySnapshot(runRecord: RunRecord | null, cursorIndex: number) {
  if (!runRecord || cursorIndex < 0 || runRecord.events.length === 0) {
    return {
      cursorIndex: -1,
      totalEvents: runRecord ? runRecord.events.length : 0,
      activeEvents: [] as TraceEvent[],
      currentEvent: null as TraceEvent | null,
      isAtStart: true,
      isAtEnd: false,
    };
  }

  const clampedCursor = Math.min(cursorIndex, runRecord.events.length - 1);
  const activeEvents = runRecord.events.slice(0, clampedCursor + 1);
  const currentEvent = activeEvents[activeEvents.length - 1] ?? null;

  return {
    cursorIndex: clampedCursor,
    totalEvents: runRecord.events.length,
    activeEvents,
    currentEvent,
    isAtStart: clampedCursor === 0,
    isAtEnd: clampedCursor === runRecord.events.length - 1,
  };
}
