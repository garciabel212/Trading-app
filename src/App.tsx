// ─── Agent Trading OS — App Root (v4) ─────────────────────────────────────────
// Multi-Workspace Architecture:
// - Agent Lab: Interactive agent graph, deterministic stage trace, inspectable replay
// - Paper Trading: Live Kalshi binary market data, observation chart, simulated execution
// - "Inspect decision" seamlessly bridges real-data paper transactions into Agent Lab traces

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import '@xyflow/react/dist/style.css';

import type { AgentNodeData, ScenarioKey } from './types';
import { INITIAL_NODES, INITIAL_EDGES } from './data/graphData';
import { useReplayRunner } from './hooks/useReplayRunner';
import { usePaperTrading } from './paper/usePaperTrading';
import { loadPaperTrace } from './paper/paperTraceBridge';
import {
  deriveNodeStates,
  deriveEdgeStates,
  deriveActivityEvents,
} from './workflow/replay';

import type { WorkspaceId } from './components/Navigation';
import AgentNode from './components/AgentNode';
import AnimatedEdge from './components/AnimatedEdge';
import TopBar from './components/TopBar';
import NodeInspector from './components/NodeInspector';
import EventTimeline from './components/EventTimeline';
import ActivityStrip from './components/ActivityStrip';
import PaperTradingWorkspace from './components/PaperTradingWorkspace';
import AgentStudioModal from './components/AgentStudioModal';
import { PRESET_AGENTS, getAllAgents } from './agents/agentRegistry';
import type { TradingAgentProfile } from './agents/types';

type AgentFlowNode = Node<AgentNodeData>;

const NODE_TYPES = { agentNode: AgentNode };
const EDGE_TYPES = { animatedEdge: AnimatedEdge };

const NODE_LABELS: Record<string, string> = INITIAL_NODES.reduce(
  (acc, n) => {
    acc[n.id] = n.data.label;
    return acc;
  },
  {} as Record<string, string>,
);

export default function App() {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('agent-lab');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('allowed');

  // Agent State & Studio Modal
  const [activeAgent, setActiveAgent] = useState<TradingAgentProfile>(
    () => getAllAgents()[0] ?? PRESET_AGENTS[0],
  );
  const [isAgentStudioOpen, setIsAgentStudioOpen] = useState(false);
  const [, setAgentVersion] = useState(0);

  // Paper Trading Hook (Live Kalshi market data & paper execution)
  const paperState = usePaperTrading();

  // Replay Hook (Agent Lab trace execution & replay)
  const {
    runRecord,
    cursorIndex,
    isPlaying,
    runScenario,
    runTrainingCycle,
    togglePlayPause,
    stepNext,
    stepPrev,
    restartPlayback,
    seekTo,
    loadRecord,
    reset,
  } = useReplayRunner();

  // ── Derived State from Shared Cursor ─────────────────────────────────────────
  const activeEvents = useMemo(() => {
    if (!runRecord || cursorIndex < 0) return [];
    return runRecord.events.slice(0, cursorIndex + 1);
  }, [runRecord, cursorIndex]);

  // Derived graph nodes
  const nodes = useMemo(() => {
    return deriveNodeStates(INITIAL_NODES, activeEvents);
  }, [activeEvents]);

  // Derived graph edges
  const edges = useMemo(() => {
    return deriveEdgeStates(INITIAL_EDGES, activeEvents);
  }, [activeEvents]);

  // Derived activity strip events
  const activity = useMemo(() => {
    return deriveActivityEvents(activeEvents, NODE_LABELS);
  }, [activeEvents]);

  // ── Selection & Graph Highlighting ───────────────────────────────────────────
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>();
    edges.forEach((e) => {
      if (e.source === selectedNodeId) connected.add(e.target);
      if (e.target === selectedNodeId) connected.add(e.source);
    });
    return connected;
  }, [selectedNodeId, edges]);

  const displayNodes = useMemo<AgentFlowNode[]>(() => {
    return nodes.map((n) => ({
      ...n,
      selected: n.id === selectedNodeId,
      data: {
        ...n.data,
        __dimmed:
          selectedNodeId !== null &&
          n.id !== selectedNodeId &&
          !connectedNodeIds.has(n.id),
      },
    }));
  }, [nodes, selectedNodeId, connectedNodeIds]);

  const displayEdges = useMemo<Edge[]>(() => {
    if (!selectedNodeId) return edges;
    return edges.map((e) => ({
      ...e,
      selected: e.source === selectedNodeId || e.target === selectedNodeId,
    }));
  }, [edges, selectedNodeId]);

  // Point-in-time node for inspector
  const inspectorNode = useMemo<AgentNodeData | null>(() => {
    if (!selectedNodeId) return null;
    const found = nodes.find((n) => n.id === selectedNodeId);
    return found ? (found.data as AgentNodeData) : null;
  }, [nodes, selectedNodeId]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleNodeClick: NodeMouseHandler<AgentFlowNode> = useCallback((_evt, node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const handlePaneClick = useCallback((_evt: ReactMouseEvent) => {
    setSelectedNodeId(null);
  }, []);

  const handleScenarioChange = useCallback(
    (newKey: ScenarioKey) => {
      if (newKey !== scenarioKey) {
        reset();
        setSelectedNodeId(null);
        setScenarioKey(newKey);
      }
    },
    [scenarioKey, reset],
  );

  const handleRunScenario = useCallback(() => {
    runScenario(scenarioKey, activeAgent);
  }, [runScenario, scenarioKey, activeAgent]);

  const handleRunTrainingCycle = useCallback(() => {
    runTrainingCycle(activeAgent);
  }, [runTrainingCycle, activeAgent]);

  const handleReset = useCallback(() => {
    reset();
    setSelectedNodeId(null);
  }, [reset]);

  // Bridge: "Inspect decision" in Paper Trading loads run trace into Agent Lab
  const handleInspectDecision = useCallback(
    (runId: string) => {
      const trace = loadPaperTrace(runId);
      if (trace) {
        loadRecord(trace);
        setSelectedNodeId('risk-engine'); // Immediately highlight the risk decision
        setActiveWorkspace('agent-lab');
      }
    },
    [loadRecord],
  );

  return (
    <div className="app-shell">
      <TopBar
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
        openPositionCount={paperState.account.position ? 1 : 0}
        isRunning={isPlaying}
        scenarioKey={scenarioKey}
        onScenarioChange={handleScenarioChange}
        onRunScenario={handleRunScenario}
        onReset={handleReset}
        hasRunRecord={runRecord !== null}
        totalEvents={runRecord ? runRecord.events.length : 0}
        activeAgent={activeAgent}
        onOpenAgentStudio={() => setIsAgentStudioOpen(true)}
        onRunTrainingCycle={handleRunTrainingCycle}
      />

      {activeWorkspace === 'paper-trading' ? (
        <PaperTradingWorkspace
          paperState={paperState}
          onInspectDecision={handleInspectDecision}
        />
      ) : (
        <>
          <div className="app-body">
            <div className="canvas-area">
              <ReactFlow<AgentFlowNode, Edge>
                nodes={displayNodes}
                edges={displayEdges}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                nodeTypes={NODE_TYPES}
                edgeTypes={EDGE_TYPES}
                fitView
                fitViewOptions={{ padding: 0.18, maxZoom: 1.1 }}
                minZoom={0.2}
                maxZoom={2.5}
                proOptions={{ hideAttribution: true }}
                aria-label="Agent workflow graph"
              >
                <Controls
                  aria-label="Graph controls: zoom and fit"
                  showInteractive={false}
                />
              </ReactFlow>
            </div>

            <NodeInspector
              node={inspectorNode}
              runRecord={runRecord}
              cursorIndex={cursorIndex}
              activeEvents={activeEvents}
              onClose={() => setSelectedNodeId(null)}
            />
          </div>

          <EventTimeline
            runRecord={runRecord}
            cursorIndex={cursorIndex}
            isPlaying={isPlaying}
            onTogglePlayPause={togglePlayPause}
            onStepNext={stepNext}
            onStepPrev={stepPrev}
            onRestart={restartPlayback}
            onSeek={seekTo}
          />

          <ActivityStrip events={activity} />
        </>
      )}

      {/* Agent Studio Modal */}
      <AgentStudioModal
        isOpen={isAgentStudioOpen}
        onClose={() => setIsAgentStudioOpen(false)}
        activeAgent={activeAgent}
        onSelectActiveAgent={setActiveAgent}
        onAgentsChanged={() => setAgentVersion((v) => v + 1)}
      />
    </div>
  );
}
