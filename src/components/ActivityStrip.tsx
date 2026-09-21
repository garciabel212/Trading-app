// ─── Agent Trading OS — Activity Strip ────────────────────────────────────────

import { memo } from 'react';
import type { ActivityEvent } from '../types';

interface ActivityStripProps {
  events: ActivityEvent[];
}

/** Show last 2 events in the compact bottom strip */
const ActivityStrip = memo(function ActivityStrip({ events }: ActivityStripProps) {
  const visible = events.slice(-2).reverse();

  return (
    <footer className="activity-strip" role="status" aria-label="Recent activity" aria-live="polite">
      <span className="activity-strip__label">Activity</span>

      {visible.length === 0 ? (
        <span className="activity-strip__empty">
          No activity yet — click Run Demo to start.
        </span>
      ) : (
        <div className="activity-strip__list">
          {visible.map((ev) => (
            <div key={ev.id} className="activity-strip__event">
              <span className="activity-strip__event-node">
                {ev.nodeLabel}
              </span>
              <span className="activity-strip__event-msg" title={ev.message}>
                {ev.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <span className="activity-strip__sim-badge" title="All events are simulated">
          SIMULATED
        </span>
      )}
    </footer>
  );
});

export default ActivityStrip;
