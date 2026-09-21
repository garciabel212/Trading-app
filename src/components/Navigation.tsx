// ─── Agent Trading OS — Workspace Navigation ──────────────────────────────────
// Switches between Agent Lab (graph, trace, replay) and Paper Trading (live Kalshi data).

import { memo } from 'react';

export type WorkspaceId = 'agent-lab' | 'paper-trading' | 'competition';

interface NavigationProps {
  activeWorkspace: WorkspaceId;
  onSelectWorkspace: (id: WorkspaceId) => void;
  openPositionCount: number;
}

const Navigation = memo(function Navigation({
  activeWorkspace,
  onSelectWorkspace,
  openPositionCount,
}: NavigationProps) {
  return (
    <nav className="workspace-nav" aria-label="Main workspaces">
      <button
        id="nav-tab-agent-lab"
        className={`workspace-nav__tab ${activeWorkspace === 'agent-lab' ? 'workspace-nav__tab--active' : ''}`}
        onClick={() => onSelectWorkspace('agent-lab')}
        role="tab"
        aria-selected={activeWorkspace === 'agent-lab'}
        title="Agent Lab: Multi-Agent Hierarchy, Traces & Live Replay"
      >
        <span className="workspace-nav__icon" aria-hidden="true">⟡</span>
        <span className="workspace-nav__title">Agent Lab</span>
      </button>

      <button
        id="nav-tab-competition"
        className={`workspace-nav__tab ${activeWorkspace === 'competition' ? 'workspace-nav__tab--active' : ''}`}
        onClick={() => onSelectWorkspace('competition')}
        role="tab"
        aria-selected={activeWorkspace === 'competition'}
        title="Arena Mode: Competitive Multi-Agent Trading Tournament"
      >
        <span className="workspace-nav__icon" aria-hidden="true">🏆</span>
        <span className="workspace-nav__title">Arena Mode</span>
        <span
          className="workspace-nav__badge"
          style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}
        >
          3 Traders
        </span>
      </button>

      <button
        id="nav-tab-paper-trading"
        className={`workspace-nav__tab ${activeWorkspace === 'paper-trading' ? 'workspace-nav__tab--active' : ''}`}
        onClick={() => onSelectWorkspace('paper-trading')}
        role="tab"
        aria-selected={activeWorkspace === 'paper-trading'}
        title="Paper Trading: Real Kalshi Market Data & Simulated Execution"
      >
        <span className="workspace-nav__icon" aria-hidden="true">📈</span>
        <span className="workspace-nav__title">Paper Trading</span>
        {openPositionCount > 0 && (
          <span
            className="workspace-nav__badge"
            title={`${openPositionCount} open position`}
          >
            {openPositionCount} pos
          </span>
        )}
      </button>
    </nav>
  );
});

export default Navigation;
