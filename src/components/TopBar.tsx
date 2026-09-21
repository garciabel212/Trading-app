// ─── Agent Trading OS — Top Bar ───────────────────────────────────────────────

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
  allowed: 'A: Allowed (5 units)',
  blocked: 'B: Blocked (20 units)',
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
  const statusLabel = isRunning
    ? 'replaying…'
    : hasRunRecord
      ? `recorded (${totalEvents} events)`
      : 'idle';

  const dotClass = [
    'topbar__status-dot',
    isRunning ? 'topbar__status-dot--running' : '',
    (!isRunning && hasRunRecord) ? 'topbar__status-dot--success' : '',
  ].filter(Boolean).join(' ');

  return (
    <header className="topbar" role="banner">
      {/* Logo + title */}
      <div className="topbar__logo">
        <div className="topbar__logo-icon" aria-hidden="true">⟡</div>
        <span className="topbar__title">Agent Trading OS</span>
      </div>

      {/* Main Workspace Navigation */}
      <Navigation
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={onSelectWorkspace}
        openPositionCount={openPositionCount}
      />

      <span className="topbar__badge" role="status" aria-label="Simulation active">
        {activeWorkspace === 'paper-trading'
          ? 'Real Data · Simulated Exec'
          : 'Agent Lab'}
      </span>

      {/* Lab-specific scenario selector */}
      {activeWorkspace === 'agent-lab' && (
        <div
          className="topbar__scenario-group"
          role="group"
          aria-label="Select lab scenario"
        >
          {(Object.keys(SCENARIO_LABELS) as ScenarioKey[]).map((key) => (
            <button
              key={key}
              id={`btn-scenario-${key}`}
              className={[
                'btn',
                scenarioKey === key ? 'btn--scenario-active' : 'btn--scenario',
              ].join(' ')}
              onClick={() => onScenarioChange(key)}
              aria-pressed={scenarioKey === key}
              aria-label={`Scenario ${SCENARIO_LABELS[key]}`}
            >
              {SCENARIO_LABELS[key]}
            </button>
          ))}
        </div>
      )}

      {/* Agent Studio Trigger & Active Agent Badge */}
      {activeWorkspace === 'agent-lab' && activeAgent && (
        <div className="topbar__agent-group">
          <button
            id="btn-open-agent-studio"
            className="btn btn--timeline"
            onClick={onOpenAgentStudio}
            title="Open Agent Studio to create, edit, or configure trading agents"
          >
            🤖 Agent: <strong>{activeAgent.name}</strong>
          </button>
        </div>
      )}

      <div className="topbar__spacer" />

      {/* Status (when in Agent Lab) */}
      {activeWorkspace === 'agent-lab' && (
        <>
          <div className="topbar__status" aria-live="polite" aria-atomic="true">
            <span className={dotClass} aria-hidden="true" />
            {statusLabel}
          </div>

          {onRunTrainingCycle && (
            <button
              id="btn-run-training-cycle"
              className="btn btn--primary"
              onClick={onRunTrainingCycle}
              aria-label="Run episodic learning cycle with memory feedback"
              title={`Execute training cycle for ${activeAgent?.name ?? 'active agent'} with memory feedback`}
            >
              ⚡ Run Learning Cycle
            </button>
          )}

          <button
            id="btn-run-scenario"
            className="btn btn--timeline"
            onClick={onRunScenario}
            aria-label="Run selected scenario and record trace"
            title={`Execute scenario ${SCENARIO_LABELS[scenarioKey]} and record trace`}
          >
            Scenario Run
          </button>

          <button
            id="btn-reset"
            className="btn btn--ghost"
            onClick={onReset}
            aria-label="Reset to initial state"
            title="Reset run record and all nodes to initial state"
          >
            ↺ Reset
          </button>
        </>
      )}
    </header>
  );
});

export default TopBar;
