// ─── Agent Trading OS — Thought-Style Message Bubble Component ──────────────
// Compact, accessible glassmorphic thought bubble rendered beside an agent node
// displaying concise decision summaries grounded in recorded inputs/outputs.

import { memo } from 'react';
import type { AgentMessage } from '../competition/messageTypes';

interface MessageBubbleProps {
  message: AgentMessage;
  onClick?: (message: AgentMessage) => void;
}

const TYPE_BADGES: Record<AgentMessage['messageType'], { label: string; color: string }> = {
  proposal:         { label: 'PROPOSAL', color: '#10b981' }, // green
  skip:             { label: 'SKIP', color: '#64748b' },     // muted slate
  selection:        { label: 'SELECT', color: '#38bdf8' },   // sky blue
  no_trade:         { label: 'NO TRADE', color: '#f59e0b' }, // amber
  risk_validation:  { label: 'VETTING', color: '#a855f7' },  // purple
  risk_verdict:     { label: 'VERDICT', color: '#ec4899' },  // pink
  execution_notice: { label: 'NOTICE', color: '#94a3b8' },   // silver
  coach_record:     { label: 'AUDIT', color: '#6366f1' },    // indigo
};

const RECIPIENT_SHORT: Record<string, string> = {
  'portfolio-manager': 'Manager',
  'risk-engine': 'Risk',
  'paper-execution': 'Execution',
  'coach-evaluator': 'Coach',
  'trader-alpha': 'Alpha',
  'trader-beta': 'Beta',
  'trader-gamma': 'Gamma',
  'human-operator': 'Human',
};

const MessageBubble = memo(function MessageBubble({ message, onClick }: MessageBubbleProps) {
  const badge = TYPE_BADGES[message.messageType] || { label: 'MSG', color: '#64748b' };
  const recipientName = RECIPIENT_SHORT[message.recipient] || message.recipient;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onClick?.(message);
    }
  };

  return (
    <div
      className="agent-message-bubble"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title="Click to inspect grounded evidence in the Node Inspector"
      aria-label={`Message to ${recipientName}: ${message.conciseSummary}`}
    >
      <div className="agent-message-bubble__header">
        <span
          className="agent-message-bubble__type-pill font-mono"
          style={{
            backgroundColor: `${badge.color}20`,
            borderColor: `${badge.color}60`,
            color: badge.color,
          }}
        >
          {badge.label}
        </span>
        <span className="agent-message-bubble__route font-mono">
          → {recipientName}
        </span>
      </div>

      <div className="agent-message-bubble__body">
        {message.conciseSummary}
      </div>

      <div className="agent-message-bubble__footer">
        <span className="agent-message-bubble__hint font-mono">
          🔍 Inspect Evidence
        </span>
      </div>
    </div>
  );
});

export default MessageBubble;
