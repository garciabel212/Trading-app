// ─── Agent Trading OS — Competition Workspace ────────────────────────────────
// Dedicated multi-agent competition view (Arena Mode).
// Displays live leaderboards, composite scores, per-trader simulated portfolios,
// Brier calibration metrics, selectivity no-trade stats, and season benchmarks.

import { useState, useEffect } from 'react';
import { getCurrentSeason } from '../competition/seasonStore';
import { loadAllPortfolios, resetAllPortfolios } from '../competition/portfolioStore';
import { computeLeaderboard } from '../competition/competitionScorer';
import { loadExperiments, approveExperiment } from '../competition/coachEvaluator';
import { eventBus } from '../competition/eventBus';
import type { CompetitionMetrics, SystemEvent } from '../competition/types';
import { getCompetitorProfile } from '../competition/traderProfiles';

export default function CompetitionWorkspace() {
  const [season] = useState(() => getCurrentSeason());
  const [portfolios, setPortfolios] = useState(() => loadAllPortfolios());
  const [leaderboard, setLeaderboard] = useState<CompetitionMetrics[]>(() => computeLeaderboard(season.seasonId));
  const [experiments, setExperiments] = useState(() => loadExperiments());
  const [recentEvents, setRecentEvents] = useState<SystemEvent[]>(() => eventBus.getRecentEvents());

  const refreshData = () => {
    setPortfolios(loadAllPortfolios());
    setLeaderboard(computeLeaderboard(season.seasonId));
    setExperiments(loadExperiments());
    setRecentEvents(eventBus.getRecentEvents());
  };

  useEffect(() => {
    const unsub = eventBus.subscribe('*', () => {
      refreshData();
    });
    const interval = setInterval(refreshData, 2000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [season.seasonId]);

  const mgrPortfolio = portfolios['manager'];

  return (
    <div className="competition-workspace" style={{ padding: '24px', overflowY: 'auto', height: '100%', color: '#f8fafc', background: '#090d16' }}>
      {/* Top Bar: Season Header & Benchmarks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: '#f1f5f9' }}>
              🏆 {season.name}
            </h2>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
              ACTIVE TOURNAMENT
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Paper-trading laboratory pitting 3 autonomous trader strategies against live market microstructures.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>BENCHMARK S&P 500</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>+{season.benchmarks.sp500Return}%</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>RISK-FREE CASH</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>+{season.benchmarks.cashYield}%</div>
          </div>
          <button
            type="button"
            style={{ fontSize: '11px', padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', cursor: 'pointer' }}
            onClick={() => {
              resetAllPortfolios();
              refreshData();
            }}
          >
            Reset Balances
          </button>
        </div>
      </div>

      {/* Leaderboard Table (Ranked by Composite Score) */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', padding: '16px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', letterSpacing: '0.05em', color: '#38bdf8', textTransform: 'uppercase' }}>
          Live Leaderboard (Multi-Dimensional Composite Scoring)
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={{ padding: '8px 12px' }}>RANK</th>
              <th style={{ padding: '8px 12px' }}>TRADER AGENT</th>
              <th style={{ padding: '8px 12px' }}>PHILOSOPHY</th>
              <th style={{ padding: '8px 12px' }}>EQUITY</th>
              <th style={{ padding: '8px 12px' }}>RETURN</th>
              <th style={{ padding: '8px 12px' }}>MAX DD</th>
              <th style={{ padding: '8px 12px' }}>BRIER SCORE</th>
              <th style={{ padding: '8px 12px' }}>EDGE</th>
              <th style={{ padding: '8px 12px' }}>WIN RATE</th>
              <th style={{ padding: '8px 12px' }}>COMPOSITE SCORE</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((m, idx) => {
              const p = portfolios[m.traderId];
              const profile = getCompetitorProfile(m.traderId as any);
              const rankColor = idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : '#cd7f32';

              return (
                <tr key={m.traderId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx === 0 ? 'rgba(251, 191, 36, 0.03)' : 'transparent' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: rankColor }}>
                    #{idx + 1}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#f8fafc' }}>
                    {profile.name}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '11px', maxWidth: '240px' }}>
                    {profile.strategyPhilosophy}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#10b981' }}>
                    ${p?.equity?.toLocaleString() ?? '10,000'}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: m.simulatedReturnPct >= 0 ? '#10b981' : '#f43f5e' }}>
                    {m.simulatedReturnPct >= 0 ? '+' : ''}{m.simulatedReturnPct.toFixed(2)}%
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#f59e0b' }}>
                    {m.maxDrawdownPct.toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#38bdf8' }}>
                    {m.brierScore.toFixed(3)}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#a78bfa' }}>
                    +{(m.realizedEdge * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>
                    {m.winRate.toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#38bdf8', fontSize: '13px' }}>
                    {m.compositeScore}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Three Competitor Deep-Dive Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {(['alpha', 'beta', 'gamma'] as const).map((role) => {
          const profile = getCompetitorProfile(role);
          const p = portfolios[role];
          const positions = Object.values(p?.positions || {});

          return (
            <div key={role} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#f8fafc' }}>{profile.name}</h4>
                  <div style={{ fontSize: '11px', color: '#38bdf8' }}>{profile.strategyType.toUpperCase()} SPECIALIST</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                    ${p?.equity?.toLocaleString() ?? '10,000'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Base: $10,000</div>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '12px', borderLeft: '2px solid rgba(56, 189, 248, 0.4)', paddingLeft: '8px' }}>
                "{profile.strategyPhilosophy}"
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', marginBottom: '12px' }}>
                <div>Cash: <span style={{ color: '#f8fafc', fontWeight: 600 }}>${p?.cash?.toLocaleString()}</span></div>
                <div>Trades: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{p?.totalTrades || 0}</span></div>
                <div>Realized P&L: <span style={{ color: (p?.realizedPnL || 0) >= 0 ? '#10b981' : '#f43f5e', fontWeight: 600 }}>${p?.realizedPnL?.toFixed(2) || '0.00'}</span></div>
                <div>No-Trades: <span style={{ color: '#f59e0b', fontWeight: 600 }}>{p?.noTradeCount || 0}</span></div>
              </div>

              {/* Held Positions */}
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                Held Positions ({positions.length})
              </div>
              {positions.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '6px 0' }}>
                  No open exposure. Selectively monitoring orderbook.
                </div>
              ) : (
                positions.map((pos) => (
                  <div key={pos.ticker} style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '4px', marginBottom: '4px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{pos.contracts}x {pos.ticker}</span>
                      <span style={{ color: '#38bdf8' }}>${pos.averageEntryPrice.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* Portfolio Manager & Coach Supervisory Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Manager Ensemble */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#f8fafc' }}>
            ⚖ Portfolio Manager Ensemble ($50,000 Base)
          </h4>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 12px 0' }}>
            Allocates capital across Alpha, Beta, and Gamma within 15% - 50% boundary rules.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>ENSEMBLE EQUITY</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981' }}>
                ${mgrPortfolio?.equity?.toLocaleString() ?? '50,000'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>CASH RESERVES</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                ${mgrPortfolio?.cash?.toLocaleString() ?? '50,000'}
              </div>
            </div>
          </div>
        </div>

        {/* Coach & Human In The Loop Experiments */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#f8fafc' }}>
            🧠 Coach Agent: Audit & Proposed Experiments
          </h4>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 12px 0' }}>
            Safety guardrail: Strategy parameters and skill changes require explicit human confirmation.
          </p>
          {experiments.map((exp) => (
            <div key={exp.experimentId} style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8' }}>{exp.title}</span>
                <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: exp.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: exp.status === 'approved' ? '#10b981' : '#f59e0b' }}>
                  {exp.status.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', margin: '4px 0' }}>{exp.hypothesis}</div>
              {exp.status === 'pending_review' && (
                <button
                  type="button"
                  style={{ fontSize: '11px', padding: '4px 10px', background: '#38bdf8', color: '#090d16', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', marginTop: '6px' }}
                  onClick={() => {
                    approveExperiment(exp.experimentId);
                    refreshData();
                  }}
                >
                  Approve Experiment
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live System Events Stream */}
      <div style={{ marginTop: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '13px', color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            ⚡ Live Autonomous Event Stream ({recentEvents.length} events)
          </h4>
          <span style={{ fontSize: '10px', color: '#64748b' }}>Deterministic Event Bus</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
          {recentEvents.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
              No system events recorded yet. Start live monitoring to observe agent deliberations.
            </div>
          ) : (
            recentEvents.slice(0, 10).map((evt) => (
              <div key={evt.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>[{evt.type}]</span>
                <span style={{ color: '#cbd5e1' }}>{evt.sourceNode} → {evt.targetNode || 'all'}</span>
                <span style={{ color: '#64748b', fontSize: '10px' }}>{new Date(evt.timestamp).toLocaleTimeString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
