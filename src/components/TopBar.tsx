// ─── Agent Trading OS — Sleek Command TopBar ──────────────────────────────────
// Technical command center header with compact typography, clean workspace switching,
// scenario triggers, agent studio integration, and minimal chrome.

import { memo } from 'react';
import type { ScenarioKey } from '../workflow/types';
import Navigation, { type WorkspaceId } from './Navigation';
import type { TradingAgentProfile } from '../agents/types';

interface TopBarProps {
  activeWorkspace: WorkspaceId;
  onSelectWorkspace: (id: WorkspaceId) => void;
  openPositionCount: number;
  isRunning: boolean;
  scenarioKey: ScenarioKey;
  onScenarioChange: (key: ScenarioKey) => void;
  onRunScenario: () => void;
  onReset: () => void;
  hasRunRecord: boolean;
  totalEvents: number;
  activeAgent?: TradingAgentProfile;
  onOpenAgentStudio?: () => void;
  onRunTrainingCycle?: () => void;
}

const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  allowed: 'A: ALLOWED (5)',
  blocked: 'B: BLOCKED (20)',
};

const TopBar = memo(function TopBar({
  activeWorkspace,
  onSelectWorkspace,
  openPositionCount,
  isRunning,
  scenarioKey,
  onScenarioChange,
  onRunScenario,
  onReset,
  hasRunRecord,
  totalEvents,
  activeAgent,
  onOpenAgentStudio,
  onRunTrainingCycle,
}: TopBarProps) {
  return (
    <header className="topbar" role="banner">
      {/* Brand & System Status */}
      <div className="topbar__brand">
        <span className="topbar__emblem" aria-hidden="true">⟡</span>
        <span className="topbar__title font-mono">AGENT TRADING OS</span>
        <span className="topbar__online-tag font-mono">
          <span className="online-dot" />
          ONLINE
        </span>
      </div>

      {/* Main Workspace Navigation (Agent Lab / Paper Trading) */}
      <Navigation
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={onSelectWorkspace}
        openPositionCount={openPositionCount}
      />

      {/* Lab Actions & Triggers */}
      {activeWorkspace === 'agent-lab' && (
        <div className="topbar__lab-controls" role="group" aria-label="Lab scenario and training controls">
          {/* Scenario Selector */}
          <div className="topbar__scenario-group">
            {(Object.keys(SCENARIO_LABELS) as ScenarioKey[]).map((key) => (
              <button
                key={key}
                id={`btn-scenario-${key}`}
                className={`scenario-btn ${scenarioKey === key ? 'scenario-btn--active' : ''} font-mono`}
                onClick={() => onScenarioChange(key)}
                aria-pressed={scenarioKey === key}
              >
                {SCENARIO_LABELS[key]}
              </button>
            ))}
          </div>

          {/* Agent Studio Trigger */}
          {activeAgent && onOpenAgentStudio && (
            <button
              id="btn-agent-studio"
              className="agent-profile-btn font-mono"
              onClick={onOpenAgentStudio}
              title={`Active Agent: ${activeAgent.name} (${activeAgent.strategyType})`}
            >
              <span className="agent-profile-btn__icon">🤖</span>
              <span className="agent-profile-btn__name">{activeAgent.name}</span>
            </button>
          )}

          {/* Training Cycle Action */}
          {onRunTrainingCycle && (
            <button
              id="btn-run-learning-cycle"
              className="topbar-action-btn topbar-action-btn--train font-mono"
              onClick={onRunTrainingCycle}
              title="Run end-to-end learning cycle with episodic reflection"
              disabled={isRunning}
            >
              ⚡ RUN CYCLE
            </button>
          )}

          {/* Scenario Run Button */}
          <button
            id="btn-run-scenario"
            className="topbar-action-btn topbar-action-btn--run font-mono"
            onClick={onRunScenario}
            title="Execute selected scenario"
            disabled={isRunning}
          >
            {isRunning ? '▶ RUNNING...' : '▶ EXECUTE'}
          </button>

          {/* Reset */}
          <button
            id="btn-reset"
            className="topbar-action-btn topbar-action-btn--reset font-mono"
            onClick={onReset}
            title="Clear run and return to idle"
          >
            ↺
          </button>
        </div>
      )}

      {/* Right Telemetry Badge */}
      <div className="topbar__telemetry">
        <span className="topbar__mode-badge font-mono">
          {activeWorkspace === 'paper-trading'
            ? 'KALSHI LIVE · SIMULATED EXEC'
            : hasRunRecord
            ? `RECORDED · ${totalEvents} EVENTS`
            : 'GRAPH WORKSPACE · READY'}
        </span>
      </div>
    </header>
  );
});

export default TopBar;
