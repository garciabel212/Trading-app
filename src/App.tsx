// ─── Agent Trading OS — App Root (v5: Living AI Operating System) ────────────
// The graph is the product: 70–80% viewport presence, deep infinite canvas,
// hierarchical node morphologies, smooth camera tweening, progressive cluster disclosure,
// dynamic energy flow edges, sleek bottom command strip, and glassmorphic inspector.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type ReactFlowInstance,
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
import OrchestratorNode from './components/nodes/OrchestratorNode';
import AnimatedEdge from './components/AnimatedEdge';
import TopBar from './components/TopBar';
import NodeInspector from './components/NodeInspector';
import BottomCommandStrip from './components/BottomCommandStrip';
import GraphLegend from './components/GraphLegend';
import PaperTradingWorkspace from './components/PaperTradingWorkspace';
import AgentStudioModal from './components/AgentStudioModal';
import { PRESET_AGENTS, getAllAgents } from './agents/agentRegistry';
import type { TradingAgentProfile } from './agents/types';

type AgentFlowNode = Node<AgentNodeData>;

const NODE_TYPES = {
  agentNode: AgentNode,
  orchestratorNode: OrchestratorNode,
};

const EDGE_TYPES = {
  animatedEdge: AnimatedEdge,
};

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

  // React Flow instance for smooth cinematic camera tweening
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<AgentFlowNode, Edge> | null>(null);

  // Progressive cluster disclosure: tracks which agents have expanded satellites
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    () => new Set(['market-analyst', 'strategy-agent', 'risk-engine', 'paper-execution']),
  );

  const handleToggleCluster = useCallback((nodeId: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

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
    isLiveAutonomous,
    runScenario,
    runTrainingCycle,
    runLiveCycle,
    toggleLiveAutonomous,
    togglePlayPause,
    stepNext,
    stepPrev,
    restartPlayback,
    seekTo,
    loadRecord,
    reset,
  } = useReplayRunner();

  // Autonomous live agent monitoring loop: continuously samples live bets & market data
  useEffect(() => {
    if (!isLiveAutonomous || activeWorkspace !== 'agent-lab') return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const executeCycle = () => {
      if (paperState.snapshot) {
        runLiveCycle(paperState.snapshot, activeAgent);
      }
      timer = setTimeout(executeCycle, 5000);
    };

    executeCycle();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLiveAutonomous, activeWorkspace, paperState.snapshot, activeAgent, runLiveCycle]);

  // ── Derived State from Shared Replay Cursor ─────────────────────────────────
  const activeEvents = useMemo(() => {
    if (!runRecord || cursorIndex < 0) return [];
    return runRecord.events.slice(0, cursorIndex + 1);
  }, [runRecord, cursorIndex]);

  // Derived graph nodes
  const rawNodes = useMemo(() => {
    return deriveNodeStates(INITIAL_NODES, activeEvents);
  }, [activeEvents]);

  // Derived graph edges
  const rawEdges = useMemo(() => {
    return deriveEdgeStates(INITIAL_EDGES, activeEvents);
  }, [activeEvents]);

  // Derived activity ticker events
  const activity = useMemo(() => {
    return deriveActivityEvents(activeEvents, NODE_LABELS);
  }, [activeEvents]);

  // ── Selection & Spatial Focus Highlighting ───────────────────────────────────
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>();
    rawEdges.forEach((e) => {
      if (e.source === selectedNodeId) connected.add(e.target);
      if (e.target === selectedNodeId) connected.add(e.source);
    });
    return connected;
  }, [selectedNodeId, rawEdges]);

  // Apply Progressive Disclosure & Dimming to Nodes
  const displayNodes = useMemo<AgentFlowNode[]>(() => {
    return rawNodes
      .map((n) => {
        const parentId = n.data.parentId;
        // If it's a satellite and its parent cluster is collapsed, hide it
        const isHidden = Boolean(parentId && !expandedClusters.has(parentId));

        return {
          ...n,
          hidden: isHidden,
          selected: n.id === selectedNodeId,
          data: {
            ...n.data,
            isExpanded: expandedClusters.has(n.id),
            onToggleCluster: () => handleToggleCluster(n.id),
            __dimmed:
              selectedNodeId !== null &&
              n.id !== selectedNodeId &&
              !connectedNodeIds.has(n.id),
          },
        };
      })
      .filter((n) => !n.hidden);
  }, [rawNodes, selectedNodeId, connectedNodeIds, expandedClusters, handleToggleCluster]);

  // Apply Dimming & Visibility to Edges
  const displayEdges = useMemo<Edge[]>(() => {
    const visibleNodeIds = new Set(displayNodes.map((n) => n.id));
    return rawEdges
      .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .map((e) => ({
        ...e,
        selected: e.source === selectedNodeId || e.target === selectedNodeId,
      }));
  }, [rawEdges, displayNodes, selectedNodeId]);

  // Point-in-time node for inspector
  const inspectorNode = useMemo<AgentNodeData | null>(() => {
    if (!selectedNodeId) return null;
    const found = rawNodes.find((n) => n.id === selectedNodeId);
    return found ? (found.data as AgentNodeData) : null;
  }, [rawNodes, selectedNodeId]);

  // ── Handlers & Smooth Camera Tweens ──────────────────────────────────────────
  const handleNodeClick: NodeMouseHandler<AgentFlowNode> = useCallback(
    (_evt, node) => {
      const isDeselecting = selectedNodeId === node.id;
      setSelectedNodeId(isDeselecting ? null : node.id);

      // Smooth camera tween toward clicked node
      if (!isDeselecting && rfInstance && node.position) {
        rfInstance.setCenter(node.position.x + 80, node.position.y + 40, {
          duration: 600,
          zoom: 1.15,
        });
      }
    },
    [selectedNodeId, rfInstance],
  );

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
    if (rfInstance) {
      rfInstance.fitView({ padding: 0.2, duration: 600 });
    }
  }, [reset, rfInstance]);

  // Bridge: "Inspect decision" in Paper Trading loads run trace into Agent Lab
  const handleInspectDecision = useCallback(
    (runId: string) => {
      const trace = loadPaperTrace(runId);
      if (trace) {
        loadRecord(trace);
        setSelectedNodeId('risk-engine');
        setActiveWorkspace('agent-lab');
        if (rfInstance) {
          rfInstance.setCenter(850 + 80, 220 + 40, { duration: 600, zoom: 1.2 });
        }
      }
    },
    [loadRecord, rfInstance],
  );

  return (
    <div className="app-shell">
      {/* Sleek Technical Command Bar */}
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
        isLiveAutonomous={isLiveAutonomous}
        onToggleLiveAutonomous={toggleLiveAutonomous}
        liveTicker={paperState.selectedTicker}
      />

      {activeWorkspace === 'paper-trading' ? (
        <PaperTradingWorkspace
          paperState={paperState}
          onInspectDecision={handleInspectDecision}
        />
      ) : (
        <>
          {/* Main 75-80% Canvas Viewport */}
          <main className="app-body" role="main" aria-label="Knowledge graph workspace">
            <div className="canvas-area">
              <ReactFlow<AgentFlowNode, Edge>
                nodes={displayNodes}
                edges={displayEdges}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                onInit={setRfInstance}
                nodeTypes={NODE_TYPES}
                edgeTypes={EDGE_TYPES}
                fitView
                fitViewOptions={{ padding: 0.16, maxZoom: 1.1 }}
                minZoom={0.2}
                maxZoom={2.6}
                proOptions={{ hideAttribution: true }}
                aria-label="Living agent workflow knowledge graph"
              >
                <Controls
                  aria-label="Graph controls: zoom and fit"
                  showInteractive={false}
                  className="graph-controls-custom"
                />
              </ReactFlow>

              {/* Floating Taxonomy & State Legend */}
              <GraphLegend />
            </div>

            {/* Translucent Right-Side System Inspector */}
            <NodeInspector
              node={inspectorNode}
              runRecord={runRecord}
              cursorIndex={cursorIndex}
              activeEvents={activeEvents}
              onClose={() => setSelectedNodeId(null)}
            />
          </main>

          {/* Unified Bottom Command Strip */}
          <BottomCommandStrip
            runRecord={runRecord}
            cursorIndex={cursorIndex}
            isPlaying={isPlaying}
            onTogglePlayPause={togglePlayPause}
            onStepNext={stepNext}
            onStepPrev={stepPrev}
            onRestart={restartPlayback}
            onSeek={seekTo}
            activityEvents={activity}
            isLiveAutonomous={isLiveAutonomous}
            onToggleLiveAutonomous={toggleLiveAutonomous}
          />
        </>
      )}

      {/* Agent Studio & Training Registry Modal */}
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
