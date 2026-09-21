// ─── Agent Trading OS — Node Inspector (v3) ───────────────────────────────────
// Extended with inspectable execution replay:
// - Point-in-time isolation: strictly reflects state at current replay cursor
// - Unreached indicator: "Not reached at this replay step"
// - Plain-language event summaries before expandable structured data
// - Risk Engine breakdown: proposed qty, limit, comparison, verdict, route
// - Clear separation of run-level metadata from historical state

import { memo } from 'react';
import type { AgentNodeData, NodeKind } from '../types';
import type { TraceEvent, RunRecord, EvaluationCheck } from '../workflow/types';
import { deriveNodeInspectorTrace, type RiskDecisionBreakdown } from '../workflow/replay';

const KIND_ICONS: Record<NodeKind, string> = {
  'data-source': '📡',
  'analyst':     '🔍',
  'strategy':    '♟',
  'risk':        '🛡',
  'execution':   '⚡',
  'evaluation':  '📊',
  'skill':       '🔧',
  'memory':      '🧠',
};

const KIND_LABELS: Record<NodeKind, string> = {
  'data-source': 'Data Source',
  'analyst':     'Analyst Agent',
  'strategy':    'Strategy Agent',
  'risk':        'Risk Engine',
  'execution':   'Execution',
  'evaluation':  'Evaluation',
  'skill':       'Skill Module',
  'memory':      'Memory Store',
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
