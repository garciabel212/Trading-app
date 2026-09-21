// ─── Agent Trading OS — Event Timeline & Replay Controls ──────────────────────
// Interactive timeline displaying ordered events with playback controls.
// Strictly displays pre-recorded events. Clicking seeks the cursor without re-executing.

import { memo, useEffect, useRef } from 'react';
import type { RunRecord, TraceEventType } from '../workflow/types';

interface EventTimelineProps {
  runRecord: RunRecord | null;
  cursorIndex: number;
  isPlaying: boolean;
  onTogglePlayPause: () => void;
  onStepNext: () => void;
  onStepPrev: () => void;
  onRestart: () => void;
  onSeek: (index: number) => void;
}

const NODE_SHORT_LABELS: Record<string, { label: string; icon: string }> = {
  'market-feed':     { label: 'Feed',      icon: '📡' },
  'market-analyst':  { label: 'Analyst',   icon: '🔍' },
  'strategy-agent':  { label: 'Strategy',  icon: '♟' },
  'risk-engine':     { label: 'Risk',      icon: '🛡' },
  'paper-execution': { label: 'Execution', icon: '⚡' },
  'evaluation':      { label: 'Eval',      icon: '📊' },
};

function eventTypeBadge(type: TraceEventType): { label: string; className: string } {
  switch (type) {
    case 'node-start':
      return { label: 'start', className: 'timeline__badge--start' };
    case 'node-complete':
      return { label: 'done', className: 'timeline__badge--complete' };
    case 'node-skipped':
      return { label: 'skipped', className: 'timeline__badge--skipped' };
    case 'node-error':
      return { label: 'failed', className: 'timeline__badge--error' };
  }
}

const EventTimeline = memo(function EventTimeline({
  runRecord,
  cursorIndex,
  isPlaying,
  onTogglePlayPause,
  onStepNext,
  onStepPrev,
  onRestart,
  onSeek,
}: EventTimelineProps) {
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll active event into view on step change
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [cursorIndex]);

  const hasEvents = runRecord !== null && runRecord.events.length > 0;
  const totalEvents = hasEvents ? runRecord.events.length : 0;
  const currentStep = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const isAtEnd = hasEvents && cursorIndex >= totalEvents - 1;
  const isAtStart = cursorIndex <= 0;

  return (
    <section
      className="timeline-panel"
      role="region"
      aria-label="Execution replay timeline and playback controls"
    >
      {/* ── Control Bar ──────────────────────────────────────────────────────── */}
      <div className="timeline-panel__header">
        <div className="timeline-panel__badge-group">
          <span className="timeline-panel__label">Recorded run playback</span>
          {hasEvents && (
            <span className="timeline-panel__step-info" aria-live="polite">
              Step <strong>{currentStep}</strong> of <strong>{totalEvents}</strong>
              {isAtEnd && ' · (End of trace)'}
              {isPlaying && ' · Playing (900ms)'}
              {!isPlaying && hasEvents && ' · Paused'}
            </span>
          )}
        </div>

        {/* Playback action buttons */}
        <div className="timeline-panel__controls" role="group" aria-label="Playback controls">
          <button
            id="btn-replay-restart"
            className="btn btn--timeline"
            onClick={onRestart}
            disabled={!hasEvents || isAtStart}
            title="Restart playback from step 1 (without re-executing)"
            aria-label="Restart playback"
          >
            ⏮ Restart
          </button>

          <button
            id="btn-replay-prev"
            className="btn btn--timeline"
            onClick={onStepPrev}
            disabled={!hasEvents || isAtStart}
            title="Previous event (rewind state)"
            aria-label="Previous event"
          >
            ◀ Prev
          </button>

          <button
            id="btn-replay-playpause"
            className={`btn ${isPlaying ? 'btn--scenario-active' : 'btn--timeline-primary'}`}
            onClick={onTogglePlayPause}
            disabled={!hasEvents}
            title={isPlaying ? 'Pause recorded playback' : 'Play recorded events'}
            aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <button
            id="btn-replay-next"
            className="btn btn--timeline"
            onClick={onStepNext}
            disabled={!hasEvents || isAtEnd}
            title="Next event (advance state)"
            aria-label="Next event"
          >
            Next ▶
          </button>
        </div>
      </div>

      {/* ── Scrollable Track of Event Chips ─────────────────────────────────── */}
      <div
        className="timeline-track"
        role="tablist"
        aria-label="Execution trace events"
        tabIndex={0}
      >
        {!hasEvents ? (
          <div className="timeline-track__empty">
            Select a scenario and click <strong>Run Scenario</strong> to record an execution trace.
          </div>
        ) : (
          runRecord.events.map((ev, index) => {
            const isActive = index === cursorIndex;
            const isFuture = index > cursorIndex;
            const badge = eventTypeBadge(ev.eventType);
            const nodeMeta = NODE_SHORT_LABELS[ev.nodeId] ?? {
              label: ev.nodeId,
              icon: '•',
            };

            const chipClasses = [
              'timeline-chip',
              isActive ? 'timeline-chip--active' : '',
              isFuture ? 'timeline-chip--future' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={ev.eventId}
                ref={isActive ? activeItemRef : null}
                className={chipClasses}
                onClick={() => onSeek(index)}
                role="tab"
                aria-selected={isActive}
                aria-label={`Step ${index + 1}: ${nodeMeta.label} ${badge.label} — ${ev.decision}`}
                title={`Click to scrub to step ${index + 1}: ${ev.decision}`}
              >
                <div className="timeline-chip__top">
                  <span className="timeline-chip__seq">#{index + 1}</span>
                  <span className="timeline-chip__icon" aria-hidden="true">
                    {nodeMeta.icon}
                  </span>
                  <span className="timeline-chip__node">{nodeMeta.label}</span>
                  <span className={`timeline-chip__badge ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="timeline-chip__desc" title={ev.decision}>
                  {ev.decision}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
});

export default EventTimeline;
