// ─── Agent Trading OS — Node Inspector (v3) ───────────────────────────────────
// Extended with inspectable execution replay:
// - Point-in-time isolation: strictly reflects state at current replay cursor
// - Unreached indicator: "Not reached at this replay step"
// - Plain-language event summaries before expandable structured data
// - Risk Engine breakdown: proposed qty, limit, comparison, verdict, route
// - Clear separation of run-level metadata from historical state

import { memo, useState } from 'react';
import type { AgentNodeData, NodeKind } from '../types';
import type { TraceEvent, RunRecord, EvaluationCheck } from '../workflow/types';
import { deriveNodeInspectorTrace, type RiskDecisionBreakdown } from '../workflow/replay';
import { loadTraderPortfolio } from '../competition/portfolioStore';
import { evaluateTrader, approveExperiment, loadExperiments } from '../competition/coachEvaluator';
import { computeTraderMetrics } from '../competition/competitionScorer';
import type { CompetitorRole } from '../competition/types';

const KIND_ICONS: Record<NodeKind, string> = {
  'orchestrator':      '⟡',
  'data-source':       '📡',
  'analyst':           '◈',
  'strategy':          '▲',
  'risk':              '⬡',
  'execution':         '⚡',
  'evaluation':        '◎',
  'skill':             '◇',
  'memory':            '□',
  'trader':            '⚔',
  'portfolio-manager': '⚖',
  'coach':             '🧠',
  'portfolio':         '💼',
};

const KIND_LABELS: Record<NodeKind, string> = {
  'orchestrator':      'Orchestrator Core',
  'data-source':       'Data Source',
  'analyst':           'Analyst Agent',
  'strategy':          'Strategy Agent',
  'risk':              'Risk Engine',
  'execution':         'Execution',
  'evaluation':        'Evaluation',
  'skill':             'Skill Module',
  'memory':            'Memory Store',
  'trader':            'Competitor Trader',
  'portfolio-manager': 'Portfolio Manager',
  'coach':             'Coach & Evaluator',
  'portfolio':         'Simulated Portfolio',
};

// ── Helper: render key-value pairs ────────────────────────────────────────────
function KVBlock({ data, label }: { data: Record<string, unknown>; label: string }) {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) {
    return (
      <div className="inspector__trace-value inspector__trace-value--none">Not recorded</div>
    );
  }
  return (
    <div className="inspector__kv-block" aria-label={label}>
      {entries.map(([k, v]) => (
        <div key={k} className="inspector__kv-row">
          <span className="inspector__kv-key">{k}</span>
          <span className="inspector__kv-val">
            {typeof v === 'object' ? JSON.stringify(v, null, 0) : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Helper: rule verdict display ──────────────────────────────────────────────
function VerdictRow({ verdict }: { verdict: TraceEvent['ruleVerdict'] }) {
  if (!verdict) {
    return (
      <div className="inspector__trace-value inspector__trace-value--none">Not recorded</div>
    );
  }
  return (
    <div className="inspector__verdict-block">
      <div className="inspector__kv-row">
        <span className="inspector__kv-key">Rule</span>
        <span className="inspector__kv-val">{verdict.rule}</span>
      </div>
      <div className="inspector__kv-row">
        <span className="inspector__kv-key">Threshold</span>
        <span className="inspector__kv-val">{verdict.threshold}</span>
      </div>
      <div className="inspector__kv-row">
        <span className="inspector__kv-key">Observed</span>
        <span className="inspector__kv-val">{verdict.observed}</span>
      </div>
      <div className="inspector__kv-row">
        <span className="inspector__kv-key">Verdict</span>
        <span
          className={`inspector__verdict-pill ${verdict.passed ? 'inspector__verdict-pill--pass' : 'inspector__verdict-pill--fail'}`}
        >
          {verdict.passed ? '✓ Rule satisfied' : '✗ Rule violated'}
        </span>
      </div>
      {!verdict.passed && (
        <p className="inspector__verdict-note">
          Rejection = successful enforcement. Execution status and rule verdict are separate.
        </p>
      )}
    </div>
  );
}

// ── Helper: Risk Engine decision breakdown ────────────────────────────────────
function RiskBreakdownCard({ breakdown }: { breakdown: RiskDecisionBreakdown }) {
  return (
    <div className="inspector__breakdown-card">
      <div className="inspector__breakdown-title">🛡 Risk Engine Decision Breakdown</div>
      <div className="inspector__kv-row">
        <span className="inspector__kv-key">Proposed Quantity</span>
        <span className="inspector__kv-val font-mono">{breakdown.proposedQty} units</span>
      </div>
      <div className="inspector__kv-row">
        <span className="inspector__kv-key">Configured Limit</span>
        <span className="inspector__kv-val font-mono">{breakdown.configuredLimit} units max</span>
      </div>
      <div className="inspector__kv-row">
        <span className="inspector__kv-key">Comparison</span>
        <span className="inspector__kv-val">{breakdown.comparison}</span>
      </div>
      <div className="inspector__kv-row">
        <span className="inspector__kv-key">Verdict</span>
        <span
          className={`inspector__verdict-pill ${breakdown.passed ? 'inspector__verdict-pill--pass' : 'inspector__verdict-pill--fail'}`}
        >
          {breakdown.verdictLabel}
        </span>
      </div>
      <div className="inspector__kv-row">
        <span className="inspector__kv-key">Resulting Route</span>
        <span className="inspector__kv-val">{breakdown.resultingRoute}</span>
      </div>
      <div className="inspector__kv-row">
        <span className="inspector__kv-key">Validation Token</span>
        <span className="inspector__kv-val">
          {breakdown.validationToken ? (
            <code style={{ fontSize: 11, color: 'var(--status-success)' }}>
              Issued by {breakdown.validationToken.approvedBy} (Amt: {breakdown.validationToken.amount} {breakdown.validationToken.symbol})
            </code>
          ) : (
            <span style={{ color: 'var(--status-failed)' }}>Withheld (Order blocked)</span>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Helper: evaluation checks display ─────────────────────────────────────────
function EvalChecks({ checks }: { checks: EvaluationCheck[] }) {
  return (
    <div className="inspector__eval-checks">
      {checks.map((c, i) => (
        <div
          key={i}
          className={`inspector__eval-check ${c.passed ? 'inspector__eval-check--pass' : 'inspector__eval-check--fail'}`}
        >
          <div className="inspector__eval-check-header">
            <span className="inspector__eval-check-icon">{c.passed ? '✓' : '✗'}</span>
            <span className="inspector__eval-check-desc">{c.description}</span>
          </div>
          <div className="inspector__kv-row">
            <span className="inspector__kv-key">Expected</span>
            <span className="inspector__kv-val">{c.expected}</span>
          </div>
          <div className="inspector__kv-row">
            <span className="inspector__kv-key">Observed</span>
            <span className="inspector__kv-val">{c.observed}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Execution trace section ───────────────────────────────────────────────────
interface TraceSectionProps {
  nodeId: string;
  runRecord: RunRecord | null;
  cursorIndex: number;
  activeEvents: TraceEvent[];
}

function TraceSection({
  nodeId,
  runRecord,
  cursorIndex,
  activeEvents,
}: TraceSectionProps) {
  if (!runRecord) {
    return (
      <section>
        <div className="inspector__section-label">Execution Replay</div>
        <div className="inspector__trace-value inspector__trace-value--none">
          No run recorded yet — click <strong>Run Scenario</strong> to execute and replay.
        </div>
      </section>
    );
  }

  const pointInTime = deriveNodeInspectorTrace(nodeId, activeEvents);
  const totalEvents = runRecord.events.length;
  const currentStep = cursorIndex >= 0 ? cursorIndex + 1 : 0;

  return (
    <section>
      {/* ── 1. Run-Level Metadata (Isolated from historical replay step) ─────── */}
      <div className="inspector__section-label">Run Metadata (Immutable)</div>
      <div className="inspector__meta-box">
        <div className="inspector__kv-row">
          <span className="inspector__kv-key">Run ID</span>
          <span className="inspector__kv-val font-mono">{runRecord.runId}</span>
        </div>
        <div className="inspector__kv-row">
          <span className="inspector__kv-key">Scenario</span>
          <span className="inspector__kv-val font-bold">{runRecord.scenarioKey}</span>
        </div>
        <div className="inspector__kv-row">
          <span className="inspector__kv-key">Execution Status</span>
          <span className="inspector__kv-val" style={{ color: 'var(--status-success)' }}>
            ✓ Executed & Recorded ({totalEvents} trace events)
          </span>
        </div>
      </div>

      {/* ── 2. Point-in-Time Replay State ───────────────────────────────────── */}
      <div className="inspector__section-label" style={{ marginTop: 14 }}>
        Point-in-Time Replay (Step {currentStep} of {totalEvents})
      </div>

      {!pointInTime.reached ? (
        <div className="inspector__unreached-notice">
          <span className="inspector__unreached-icon" aria-hidden="true">⏳</span>
          <div className="inspector__unreached-content">
            <strong>Not reached at this replay step.</strong>
            <p>
              This node has not been invoked yet in the recorded trace prefix (Step {currentStep} of {totalEvents}).
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Plain-Language Event Summary */}
          <div className="inspector__summary-card">
            <span className="inspector__summary-title">Summary at this step</span>
            <p className="inspector__summary-text">{pointInTime.summaryText}</p>
          </div>

          {/* Risk Engine Breakdown */}
          {nodeId === 'risk-engine' && pointInTime.riskBreakdown && (
            <RiskBreakdownCard breakdown={pointInTime.riskBreakdown} />
          )}

          {/* Inputs Received */}
          <div className="inspector__trace-sub-label">Inputs received</div>
          <KVBlock data={pointInTime.input ?? {}} label="Inputs" />

          {/* Skip Notice if skipped */}
          {pointInTime.status === 'skipped' && (
            <div className="inspector__skip-notice">
              ⊘ Skipped — {pointInTime.skipReason ?? 'reason not recorded'}
            </div>
          )}

          {/* Outputs Produced */}
          {pointInTime.status !== 'skipped' && (
            <>
              <div className="inspector__trace-sub-label">Output produced</div>
              {pointInTime.output ? (
                <KVBlock data={pointInTime.output} label="Outputs" />
              ) : (
                <div className="inspector__trace-value inspector__trace-value--none">
                  Not yet produced at this replay step.
                </div>
              )}
            </>
          )}

          {/* Decision */}
          <div className="inspector__trace-sub-label">Decision</div>
          <div className="inspector__trace-value">
            {pointInTime.decision ?? 'Not recorded'}
          </div>

          {/* Rule Verdict */}
          {pointInTime.ruleVerdict && (
            <>
              <div className="inspector__trace-sub-label">Rule verdict</div>
              <VerdictRow verdict={pointInTime.ruleVerdict} />
            </>
          )}

          {/* Evaluation Checks (Evaluation node only) */}
          {nodeId === 'evaluation' && (
            <>
              <div className="inspector__trace-sub-label">Evaluation checks</div>
              {pointInTime.evalOutput?.checks ? (
                <>
                  <EvalChecks checks={pointInTime.evalOutput.checks} />
                  <div
                    className={`inspector__eval-summary ${pointInTime.evalOutput.overallPassed ? 'inspector__eval-summary--pass' : 'inspector__eval-summary--fail'}`}
                  >
                    {pointInTime.evalOutput.summary}
                  </div>
                </>
              ) : (
                <div className="inspector__trace-value inspector__trace-value--none">
                  Evaluation checks not yet performed at this replay step.
                </div>
              )}
            </>
          )}

          {/* Paper orders (Execution node only) */}
          {nodeId === 'paper-execution' && (
            <>
              <div className="inspector__trace-sub-label">Paper orders placed</div>
              {pointInTime.paperOrders.length > 0 ? (
                pointInTime.paperOrders.map((o) => (
                  <div key={o.orderId} className="inspector__order-block">
                    <div className="inspector__kv-row">
                      <span className="inspector__kv-key">Order ID</span>
                      <span className="inspector__kv-val font-mono">{o.orderId}</span>
                    </div>
                    <div className="inspector__kv-row">
                      <span className="inspector__kv-key">Symbol</span>
                      <span className="inspector__kv-val">{o.symbol}</span>
                    </div>
                    <div className="inspector__kv-row">
                      <span className="inspector__kv-key">Side / Qty</span>
                      <span className="inspector__kv-val">
                        {o.side.toUpperCase()} {o.qty}
                      </span>
                    </div>
                    <div className="inspector__kv-row">
                      <span className="inspector__kv-key">Note</span>
                      <span
                        className="inspector__kv-val"
                        style={{ color: 'var(--status-warning)' }}
                      >
                        {o.note}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="inspector__trace-value inspector__trace-value--none">
                  {pointInTime.status === 'skipped'
                    ? 'No paper orders placed (order was blocked by Risk Engine).'
                    : 'No paper orders placed at this replay step.'}
                </div>
              )}
            </>
          )}

          {/* Agent Memory Inspector Card */}
          {nodeId === 'agent-memory' && pointInTime.output && (
            <div className="inspector__memory-card">
              <div className="inspector__breakdown-title">🧠 Episodic Memory Activity</div>
              {Boolean((pointInTime.output as Record<string, unknown>).priorLessonsApplied) && (
                <div className="inspector__memory-query-block">
                  <div className="inspector__kv-row">
                    <span className="inspector__kv-key">Queried Precedents:</span>
                    <span className="inspector__kv-val font-mono">
                      {String((pointInTime.output as Record<string, unknown>).queriedCount ?? 0)} experience(s)
                    </span>
                  </div>
                  <div className="inspector__kv-row">
                    <span className="inspector__kv-key">Conviction Adj:</span>
                    <span className="inspector__kv-val font-mono text-warning">
                      {String((pointInTime.output as Record<string, unknown>).convictionAdjustment ?? 0)}
                    </span>
                  </div>
                  <div className="inspector__memory-lessons">
                    <strong>Applied Historical Lessons:</strong>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                      {((pointInTime.output as Record<string, unknown>).priorLessonsApplied as string[] | undefined)?.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {Boolean((pointInTime.output as Record<string, unknown>).learnedLesson) && (
                <div className="inspector__memory-commit-block">
                  <div className="inspector__kv-row">
                    <span className="inspector__kv-key">Relevance Tag:</span>
                    <span className="inspector__kv-val font-mono">
                      {String((pointInTime.output as Record<string, unknown>).relevanceTag ?? 'standard')}
                    </span>
                  </div>
                  <div className="inspector__memory-lesson-box">
                    <strong>💡 Committed Lesson:</strong>
                    <p style={{ margin: '4px 0 0' }}>{String((pointInTime.output as Record<string, unknown>).learnedLesson)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analysis Skill Inspector Card */}
          {nodeId === 'analysis-skill' && pointInTime.output && (
            <div className="inspector__skill-card">
              <div className="inspector__breakdown-title">🔧 Skill Computation</div>
              <div className="inspector__kv-row">
                <span className="inspector__kv-key">Skill Module:</span>
                <span className="inspector__kv-val font-bold">
                  {String((pointInTime.output as Record<string, unknown>).skillName ?? 'Skill')}
                </span>
              </div>
              <div className="inspector__kv-row">
                <span className="inspector__kv-key">Indicator:</span>
                <span className="inspector__kv-val font-mono">
                  {String((pointInTime.output as Record<string, unknown>).indicator ?? '')}
                </span>
              </div>
              <div className="inspector__kv-row">
                <span className="inspector__kv-key">Evaluated Metric:</span>
                <span className="inspector__kv-val font-mono text-warning">
                  {String((pointInTime.output as Record<string, unknown>).value ?? '')}
                </span>
              </div>
            </div>
          )}

          {/* Strategy Memory Influence */}
          {nodeId === 'strategy-agent' && pointInTime.output && Boolean((pointInTime.output as Record<string, unknown>).memoryInfluence) && (
            <div className="inspector__memory-influence-card">
              <div className="inspector__breakdown-title">🧠 Memory Feedback Integration</div>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                {String((pointInTime.output as Record<string, unknown>).memoryInfluence)}
              </p>
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 14 }}>
        ⚠ All activity is a local simulation — structured validation only, no real trades.
      </p>
    </section>
  );
}

// ── Multi-Agent Competition Inspector Section ─────────────────────────────────

function CompetitorInspectorSection({ node }: { node: AgentNodeData }) {
  const role = (node.traderRole || (node.id.startsWith('trader-') ? node.id.replace('trader-', '') : null)) as CompetitorRole | null;
  const isManager = node.kind === 'portfolio-manager' || role === 'manager';
  const isCoach = node.kind === 'coach' || role === 'coach';
  const isTrader = node.kind === 'trader' || (role && ['alpha', 'beta', 'gamma'].includes(role));
  const isPortfolio = node.kind === 'portfolio';

  const [, setRefresh] = useState(0);

  if (!isManager && !isCoach && !isTrader && !isPortfolio) {
    return null;
  }

  // 1. Trader Inspector
  if (isTrader && role) {
    const portfolio = loadTraderPortfolio(role);
    const metrics = computeTraderMetrics(role);
    const positionsList = Object.values(portfolio.positions || {});

    return (
      <section className="inspector__competition-section" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 12 }}>
        <div className="inspector__section-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>⚔ Competitor Ledger ({role.toUpperCase()})</span>
          <span style={{ color: '#38bdf8' }}>Score: {metrics.compositeScore}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '8px 0' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>EQUITY / CASH</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>
              ${portfolio.equity?.toLocaleString() ?? '10,000'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Cash: ${portfolio.cash?.toLocaleString()}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>BRIER / CALIBRATION</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
              {metrics.brierScore.toFixed(3)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Err: {(metrics.calibrationError * 100).toFixed(1)}% | Win: {metrics.winRate}%
            </div>
          </div>
        </div>

        {/* Positions & Theses */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Open Positions & Invalidation Theses ({positionsList.length})
          </div>
          {positionsList.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No open contracts currently held. Waiting for edge setups.
            </div>
          ) : (
            positionsList.map((pos) => (
              <div key={pos.ticker} style={{ background: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: '4px', marginBottom: 4, fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>{pos.contracts}x {pos.ticker} ({pos.side.toUpperCase()})</span>
                  <span>Avg: ${pos.averageEntryPrice.toFixed(2)}</span>
                </div>
                {pos.thesis?.initialThesis && (
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 2 }}>
                    Thesis: {pos.thesis.initialThesis}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Recent proposals and no-trades */}
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Recent Selectivity (No-Trades: {portfolio.noTradeCount || 0})
          </div>
          {portfolio.recentNoTrades && portfolio.recentNoTrades.length > 0 && (
            <div style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px', borderRadius: '4px', color: '#fca5a5' }}>
              Latest Pass: {portfolio.recentNoTrades[0].explanation}
            </div>
          )}
        </div>
      </section>
    );
  }

  // 2. Portfolio Manager Inspector
  if (isManager) {
    const mgrPortfolio = loadTraderPortfolio('manager');
    return (
      <section className="inspector__competition-section" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 12 }}>
        <div className="inspector__section-label">⚖ Portfolio Manager Ensemble ($50,000)</div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', margin: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
            <span>Ensemble Equity:</span>
            <span style={{ color: '#10b981' }}>${mgrPortfolio.equity?.toLocaleString() ?? '50,000'}</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4 }}>
            Realized P&L: ${mgrPortfolio.realizedPnL?.toFixed(2)} | Peak: ${mgrPortfolio.peakEquity?.toLocaleString()}
          </div>
        </div>

        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
          Active Capital Allocation Boundaries (15% - 50% limit)
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ flex: 1, background: 'rgba(56, 189, 248, 0.1)', padding: '6px', borderRadius: '4px', textAlign: 'center', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>ALPHA</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>35%</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: '4px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>BETA</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>35%</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(245, 158, 11, 0.1)', padding: '6px', borderRadius: '4px', textAlign: 'center', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>GAMMA</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>30%</div>
          </div>
        </div>
      </section>
    );
  }

  // 3. Coach Inspector
  if (isCoach) {
    const alphaEval = evaluateTrader('alpha');
    const experiments = loadExperiments();

    return (
      <section className="inspector__competition-section" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 12 }}>
        <div className="inspector__section-label">🧠 Coach Evaluations & Proposed Experiments</div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '6px 0' }}>
          {alphaEval.calibrationAssessment}
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Pending Experiments ({experiments.filter((e) => e.status === 'pending_review').length})
          </div>
          {experiments.map((exp) => (
            <div key={exp.experimentId} style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', marginBottom: 6, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8' }}>{exp.title}</span>
                <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: exp.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: exp.status === 'approved' ? '#10b981' : '#f59e0b' }}>
                  {exp.status.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '4px 0' }}>{exp.hypothesis}</p>
              {exp.status === 'pending_review' && (
                <button
                  type="button"
                  style={{ fontSize: '10px', padding: '3px 8px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', marginTop: 4 }}
                  onClick={() => {
                    approveExperiment(exp.experimentId);
                    setRefresh((r) => r + 1);
                  }}
                >
                  Approve Experiment
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }

  // 4. Portfolio Inspector
  if (isPortfolio) {
    const pRole = (node.traderRole || 'alpha') as CompetitorRole;
    const p = loadTraderPortfolio(pRole);
    return (
      <section className="inspector__competition-section" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 12 }}>
        <div className="inspector__section-label">💼 Simulated Account Breakdown</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 4 }}>
          Cash: ${p.cash?.toLocaleString()} | Equity: ${p.equity?.toLocaleString()}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
          Peak Equity: ${p.peakEquity?.toLocaleString()} | Max Drawdown: {p.maxDrawdownPct?.toFixed(1)}%
        </div>
      </section>
    );
  }

  return null;
}

// ── Main Inspector Component ──────────────────────────────────────────────────

interface NodeInspectorProps {
  node: AgentNodeData | null;
  runRecord: RunRecord | null;
  cursorIndex: number;
  activeEvents: TraceEvent[];
  onClose: () => void;
}

const NodeInspector = memo(function NodeInspector({
  node,
  runRecord,
  cursorIndex,
  activeEvents,
  onClose,
}: NodeInspectorProps) {
  const isVisible = node !== null;

  return (
    <aside
      className={`inspector${isVisible ? '' : ' inspector--hidden'}`}
      aria-label="Node inspector"
      aria-hidden={!isVisible}
      role="complementary"
    >
      {node ? (
        <>
          {/* Header */}
          <div className="inspector__header">
            <div
              className={`inspector__icon agent-node__icon--${node.kind}`}
              style={{ background: 'var(--bg-surface-2)' }}
              aria-hidden="true"
            >
              {KIND_ICONS[node.kind]}
            </div>
            <div className="inspector__meta">
              <div className="inspector__name">{node.label}</div>
              <div className="inspector__kind">{KIND_LABELS[node.kind]}</div>
            </div>
            <button
              className="inspector__close"
              onClick={onClose}
              aria-label="Close inspector"
              title="Close inspector"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="inspector__body">
            {/* Status at this replay step */}
            <section>
              <div className="inspector__section-label">Node Status (At Current Step)</div>
              <div className="inspector__status-row">
                <span
                  className={`agent-node__status-badge status-badge--${node.status}`}
                  aria-label={`Current status: ${node.status}`}
                >
                  <span className="status-badge__dot" aria-hidden="true" />
                  {node.status}
                </span>
              </div>
            </section>

            {/* Description */}
            <section>
              <div className="inspector__section-label">Description</div>
              <p className="inspector__description">{node.description}</p>
            </section>

            {/* Purpose */}
            <section>
              <div className="inspector__section-label">Purpose</div>
              <p className="inspector__description">{node.purpose}</p>
            </section>

            {/* Relationships */}
            <section>
              <div className="inspector__section-label">Relationships</div>
              <ul className="inspector__relationship-list" aria-label="Node relationships">
                {node.relationships.map((rel, i) => (
                  <li key={i} className="inspector__relationship-item">{rel}</li>
                ))}
              </ul>
            </section>

            {/* Competitor / Manager / Coach Live Metrics */}
            <CompetitorInspectorSection node={node} />

            {/* Execution Replay Trace */}
            <TraceSection
              nodeId={node.id}
              runRecord={runRecord}
              cursorIndex={cursorIndex}
              activeEvents={activeEvents}
            />
          </div>
        </>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 8,
            padding: 24,
          }}
        >
          <span style={{ fontSize: 28 }}>◎</span>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Click any node to inspect its execution trace
          </p>
        </div>
      )}
    </aside>
  );
});

export default NodeInspector;
