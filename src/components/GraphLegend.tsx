// ─── Agent Trading OS — Minimalist Graph Legend ──────────────────────────────
// Ultra-compact floating legend indicating node taxonomy and execution states.

import { memo } from 'react';

const GraphLegend = memo(function GraphLegend() {
  return (
    <div className="graph-legend" role="complementary" aria-label="Graph visual legend">
      <div className="graph-legend__group">
        <span className="graph-legend__title">TAXONOMY</span>
        <span className="graph-legend__item"><span className="legend-sym legend-sym--orch">⟡</span> Core</span>
        <span className="graph-legend__item"><span className="legend-sym legend-sym--agent">◈</span> Agent</span>
        <span className="graph-legend__item"><span className="legend-sym legend-sym--system">⬡</span> System</span>
        <span className="graph-legend__item"><span className="legend-sym legend-sym--skill">◇</span> Skill</span>
        <span className="graph-legend__item"><span className="legend-sym legend-sym--data">□</span> Data</span>
      </div>

      <div className="graph-legend__divider" />

      <div className="graph-legend__group">
        <span className="graph-legend__title">STATE</span>
        <span className="graph-legend__item"><span className="legend-dot legend-dot--running" /> Active</span>
        <span className="graph-legend__item"><span className="legend-dot legend-dot--success" /> Done</span>
        <span className="graph-legend__item"><span className="legend-dot legend-dot--warn" /> Veto</span>
        <span className="graph-legend__item"><span className="legend-dot legend-dot--failed" /> Err</span>
      </div>
    </div>
  );
});

export default GraphLegend;
