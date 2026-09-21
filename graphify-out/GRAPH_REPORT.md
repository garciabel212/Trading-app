# Graph Report - trading app  (2026-09-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 269 nodes · 599 edges · 12 communities (9 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- account.ts
- package.json
- workflow/types.ts
- runner.ts
- App.tsx
- useDemoRunner.ts
- compilerOptions
- compilerOptions
- .oxlintrc.json
- tsconfig.json
- ref_vitest_config

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `RunRecord` - 17 edges
3. `runWorkflow()` - 17 edges
4. `react` - 15 edges
5. `compilerOptions` - 15 edges
6. `usePaperTrading()` - 14 edges
7. `MockExecutionAdapter` - 11 edges
8. `TraceEvent` - 10 edges
9. `validatePaperOrder()` - 10 edges
10. `ScenarioKey` - 9 edges

## Surprising Connections (you probably didn't know these)
- `PaperTradingWorkspaceProps` --references--> `usePaperTrading()`  [EXTRACTED]
  src/components/PaperTradingWorkspace.tsx → src/paper/usePaperTrading.ts
- `EventTimelineProps` --references--> `RunRecord`  [EXTRACTED]
  src/components/EventTimeline.tsx → src/workflow/types.ts
- `NodeInspectorProps` --references--> `AgentNodeData`  [EXTRACTED]
  src/components/NodeInspector.tsx → src/types/index.ts
- `NodePointInTimeTrace` --references--> `MockOrder`  [EXTRACTED]
  src/workflow/replay.ts → src/workflow/types.ts
- `UseDemoRunnerOptions` --references--> `RunRecord`  [EXTRACTED]
  src/hooks/useDemoRunner.ts → src/workflow/types.ts

## Import Cycles
- None detected.

## Communities (12 total, 3 thin omitted)

### Community 0 - "account.ts"
Cohesion: 0.10
Nodes (46): PaperTradingWorkspace, PaperTradingWorkspaceProps, PriceChart, PriceChartProps, executePaperTrade(), INITIAL_CASH, INITIAL_PAPER_ACCOUNT, loadPersistedAccount() (+38 more)

### Community 1 - "package.json"
Cohesion: 0.05
Nodes (35): dependencies, react, react-dom, @xyflow/react, devDependencies, oxlint, @types/node, @types/react (+27 more)

### Community 2 - "workflow/types.ts"
Cohesion: 0.10
Nodes (28): EventTimeline, EventTimelineProps, eventTypeBadge(), NODE_SHORT_LABELS, KIND_ICONS, KIND_LABELS, NodeInspector, NodeInspectorProps (+20 more)

### Community 3 - "runner.ts"
Cohesion: 0.15
Nodes (24): vitest, PLAYBACK_STEP_MS, UseReplayRunnerResult, freshAdapter(), executionAdapter, MockExecutionAdapter, completeEvent(), newEventId() (+16 more)

### Community 4 - "App.tsx"
Cohesion: 0.12
Nodes (24): react, ref_react_dom_client, @xyflow/react, ref_xyflow_react_dist_style_css, AgentFlowNode, App(), EDGE_TYPES, NODE_LABELS (+16 more)

### Community 5 - "useDemoRunner.ts"
Cohesion: 0.12
Nodes (21): ActivityStrip, ActivityStripProps, AgentNode, KIND_ICONS, KIND_LABELS, STATUS_LABELS, INITIAL_EDGES, INITIAL_NODES (+13 more)

### Community 6 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 7 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 8 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

## Knowledge Gaps
- **94 isolated node(s):** `PositionValuation`, `OrderOrigin`, `OrderSide`, `OrderStatus`, `AgentFlowNode` (+89 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 109 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `account.ts`, `package.json`, `workflow/types.ts`, `runner.ts`, `useDemoRunner.ts`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `vitest` connect `runner.ts` to `account.ts`, `package.json`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `PositionValuation`, `OrderOrigin`, `OrderSide` to the rest of the system?**
  _94 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `account.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09853249475890985 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `workflow/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0990990990990991 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11576354679802955 - nodes in this community are weakly interconnected._