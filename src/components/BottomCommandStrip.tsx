// ─── Agent Trading OS — Bottom Command Strip ─────────────────────────────────
// Sleek, minimal persistent command strip consolidating playback controls,
// timeline scrubbing, telemetry metrics, and real-time activity ticker.

import { memo } from 'react';
import type { RunRecord } from '../workflow/types';
import type { ActivityEvent } from '../types';

interface BottomCommandStripProps {
  runRecord: RunRecord | null;
  cursorIndex: number;
  isPlaying: boolean;
  onTogglePlayPause: () => void;
  onStepNext: () => void;
  onStepPrev: () => void;
  onRestart: () => void;
  onSeek: (index: number) => void;
  activityEvents: ActivityEvent[];
}

const BottomCommandStrip = memo(function BottomCommandStrip({
  runRecord,
  cursorIndex,
  isPlaying,
  onTogglePlayPause,
  onStepNext,
  onStepPrev,
  onRestart,
  onSeek,
  activityEvents,
}: BottomCommandStripProps) {
  const hasRun = runRecord !== null;
  const totalEvents = hasRun ? runRecord.events.length : 0;
  const currentStep = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const isAtStart = cursorIndex <= 0;
  const isAtEnd = hasRun && cursorIndex >= totalEvents - 1;

  // Active event message
  const latestActivity = activityEvents.length > 0 ? activityEvents[activityEvents.length - 1] : null;

  return (
    <footer className="command-strip" role="region" aria-label="System execution replay and telemetry">
      {/* Interactive Micro-Scrubber Track */}
      {hasRun && (
        <div className="command-strip__scrubber" role="slider" aria-valuemin={1} aria-valuemax={totalEvents} aria-valuenow={currentStep}>
          <div
            className="command-strip__progress-bar"
            style={{ width: `${(currentStep / Math.max(1, totalEvents)) * 100}%` }}
          />
          <div className="command-strip__ticks">
            {runRecord.events.map((ev, idx) => {
              const isPassed = idx <= cursorIndex;
              const isCurrent = idx === cursorIndex;
              return (
                <button
                  key={ev.eventId}
                  className={[
                    'command-strip__tick',
                    isPassed ? 'command-strip__tick--passed' : '',
                    isCurrent ? 'command-strip__tick--current' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => onSeek(idx)}
                  title={`#${idx + 1} ${ev.nodeId}: ${ev.eventType}`}
                  aria-label={`Step ${idx + 1} of ${totalEvents}: ${ev.nodeId}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Main Command Bar */}
      <div className="command-strip__bar">
        {/* Left: Telemetry & Run Identification */}
        <div className="command-strip__telemetry">
          <span className="command-strip__run-id font-mono">
            {hasRun ? `RUN #${runRecord.runId.slice(-6)}` : 'IDLE / READY'}
          </span>

          <span className="command-strip__sep">·</span>

          <span className={`command-strip__status-dot ${isPlaying ? 'command-strip__status-dot--live' : ''}`} />
          <span className="command-strip__status-text">
            {!hasRun ? 'NO RECORD' : isPlaying ? 'LIVE PLAYBACK' : isAtEnd ? 'RUN COMPLETE' : `STEP ${currentStep}/${totalEvents}`}
          </span>

          <span className="command-strip__sep">·</span>

          <span className="command-strip__metric font-mono">08 NODES</span>
          <span className="command-strip__metric font-mono">{totalEvents} EVENTS</span>
          <span className="command-strip__badge font-mono">DETERMINISTIC</span>
        </div>

        {/* Center: Live Activity One-Liner */}
        <div className="command-strip__activity" title={latestActivity?.message ?? ''}>
          {latestActivity ? (
            <>
              <span className="command-strip__activity-node font-mono">{latestActivity.nodeLabel}</span>
              <span className="command-strip__activity-arrow">→</span>
              <span className="command-strip__activity-msg">{latestActivity.message}</span>
            </>
          ) : (
            <span className="command-strip__activity-empty">Awaiting workflow execution or playback start…</span>
          )}
        </div>

        {/* Right: Sleek Playback Controls */}
        <div className="command-strip__controls">
          <button
            className="ctrl-btn"
            onClick={onRestart}
            disabled={!hasRun || isAtStart}
            title="Restart playback"
            aria-label="Restart playback"
          >
            ⏮
          </button>

          <button
            className="ctrl-btn"
            onClick={onStepPrev}
            disabled={!hasRun || isAtStart || isPlaying}
            title="Step previous event"
            aria-label="Previous step"
          >
            ◀
          </button>

          <button
            className={`ctrl-btn ctrl-btn--play ${isPlaying ? 'ctrl-btn--playing' : ''}`}
            onClick={onTogglePlayPause}
            disabled={!hasRun}
            title={isPlaying ? 'Pause playback' : isAtEnd ? 'Replay from start' : 'Play playback'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸ PAUSE' : isAtEnd ? '↺ REPLAY' : '▶ PLAY'}
          </button>

          <button
            className="ctrl-btn"
            onClick={onStepNext}
            disabled={!hasRun || isAtEnd || isPlaying}
            title="Step next event"
            aria-label="Next step"
          >
            ▶
          </button>
        </div>
      </div>
    </footer>
  );
});

export default BottomCommandStrip;
