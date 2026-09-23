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
  isLiveAutonomous?: boolean;
  onToggleLiveAutonomous?: () => void;
  liveTicker?: string;
  activeProfileKey?: 'daily-weather' | 'nasdaq-oneq';
  onProfileChange?: (key: 'daily-weather' | 'nasdaq-oneq') => void;
  onRunProposalRound?: () => void;
  showMessageBubbles?: boolean;
  onToggleMessageBubbles?: () => void;
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
  isLiveAutonomous,
  onToggleLiveAutonomous,
  liveTicker,
  activeProfileKey,
  onProfileChange,
  onRunProposalRound,
  showMessageBubbles,
  onToggleMessageBubbles,
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
        <div className="topbar__lab-controls" role="group" aria-label="Lab scenario, research profile, and communication controls">
          {/* Research Profile Selector */}
          {activeProfileKey && onProfileChange && (
            <div className="topbar__scenario-group">
              <button
                type="button"
                id="btn-profile-weather"
                className={`scenario-btn ${activeProfileKey === 'daily-weather' ? 'scenario-btn--active' : ''} font-mono`}
                onClick={() => onProfileChange('daily-weather')}
                title="Daily Weather Profile: Kalshi binary weather contracts ($200 model)"
                aria-pressed={activeProfileKey === 'daily-weather'}
              >
                🌦 WEATHER
              </button>
              <button
                type="button"
                id="btn-profile-oneq"
                className={`scenario-btn ${activeProfileKey === 'nasdaq-oneq' ? 'scenario-btn--active' : ''} font-mono`}
                onClick={() => onProfileChange('nasdaq-oneq')}
                title="Nasdaq Composite Research Profile: ONEQ equity ETF whole-share research ($200 model)"
                aria-pressed={activeProfileKey === 'nasdaq-oneq'}
              >
                📈 ONEQ (ETF)
              </button>
            </div>
          )}

          {/* Proposal-Only Decision Round Trigger */}
          {onRunProposalRound && (
            <button
              id="btn-proposal-round"
              className="topbar-action-btn topbar-action-btn--train font-mono"
              style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(168, 85, 247, 0.2))',
                borderColor: 'rgba(56, 189, 248, 0.45)',
                color: '#38bdf8',
                fontWeight: 600,
              }}
              onClick={onRunProposalRound}
              title="Run explicit proposal-only round: Alpha/Beta/Gamma freeze submissions independently, Manager reviews, Risk validates, Execution disabled, Coach records"
              disabled={isRunning || isLiveAutonomous}
            >
              ⚡ PROPOSAL ROUND
            </button>
          )}

          {/* Inspectable Message Bubbles Toggle */}
          {onToggleMessageBubbles && (
            <button
              id="btn-toggle-bubbles"
              className={`topbar-action-btn font-mono ${showMessageBubbles ? 'scenario-btn--active' : ''}`}
              style={{ fontSize: '11px', padding: '4px 8px' }}
              onClick={onToggleMessageBubbles}
              title={showMessageBubbles ? 'Hide agent thought bubbles' : 'Show agent thought bubbles'}
              aria-pressed={showMessageBubbles}
            >
              💬 {showMessageBubbles ? 'BUBBLES ON' : 'BUBBLES OFF'}
            </button>
          )}

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

          {/* Live Autonomous Monitor Action */}
          {onToggleLiveAutonomous && (
            <button
              id="btn-live-monitor"
              className={`topbar-action-btn ${isLiveAutonomous ? 'topbar-action-btn--live-active' : 'topbar-action-btn--train'} font-mono`}
              onClick={onToggleLiveAutonomous}
              title={isLiveAutonomous ? 'Autonomous live agent monitoring is running (click to pause)' : 'Start continuous autonomous live monitoring on real prediction bets'}
            >
              {isLiveAutonomous ? '● LIVE MONITOR (5s)' : '⚡ LIVE MONITOR'}
            </button>
          )}

          {/* Training Cycle Action */}
          {onRunTrainingCycle && (
            <button
              id="btn-run-learning-cycle"
              className="topbar-action-btn topbar-action-btn--train font-mono"
              onClick={onRunTrainingCycle}
              title="Run end-to-end learning cycle with episodic reflection"
              disabled={isRunning || isLiveAutonomous}
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
            disabled={isRunning || isLiveAutonomous}
          >
            {isRunning ? '▶ RUNNING...' : '▶ EXECUTE'}
          </button>

          {/* Reset */}
          <button
            id="btn-reset"
            className="topbar-action-btn topbar-action-btn--reset font-mono"
            onClick={onReset}
            title="Clear run and return to idle"
            disabled={isLiveAutonomous}
          >
            ↺
          </button>
        </div>
      )}

      {/* Right Telemetry Badge */}
      <div className="topbar__telemetry">
        <span className="topbar__mode-badge font-mono">
          {activeWorkspace === 'paper-trading'
            ? 'KALSHI BETS · COINBASE CRYPTO · SIMULATED EXEC'
            : isLiveAutonomous
            ? `LIVE MONITORING · ${liveTicker ?? 'KXOAIANTH-40-ANTH'}`
            : hasRunRecord
            ? `RECORDED · ${totalEvents} EVENTS`
            : 'GRAPH WORKSPACE · READY'}
        </span>
      </div>
    </header>
  );
});

export default TopBar;
