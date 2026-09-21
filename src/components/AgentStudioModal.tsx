// ─── Agent Trading OS — Agent Studio Modal ─────────────────────────────────────
// Interactive modal for creating custom trading agents, inspecting skills,
// viewing episodic memory logs, and managing learning stats.

import { useState } from 'react';
import type { TradingAgentProfile, StrategyType } from '../agents/types';
import {
  AVAILABLE_SKILLS,
  createCustomAgent,
  deleteCustomAgent,
  getAllAgents,
} from '../agents/agentRegistry';
import { getMemoriesForAgent, clearAgentMemories } from '../agents/memoryStore';

interface AgentStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAgent: TradingAgentProfile;
  onSelectActiveAgent: (agent: TradingAgentProfile) => void;
  onAgentsChanged: () => void;
}

type StudioTab = 'agents' | 'create' | 'memories';

export default function AgentStudioModal({
  isOpen,
  onClose,
  activeAgent,
  onSelectActiveAgent,
  onAgentsChanged,
}: AgentStudioModalProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>('agents');

  // Form State for creating custom agents
  const [name, setName] = useState('');
  const [strategyType, setStrategyType] = useState<StrategyType>('momentum');
  const [conviction, setConviction] = useState(0.75);
  const [orderSize, setOrderSize] = useState(5);
  const [spreadTolerance, setSpreadTolerance] = useState(0.04);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    'kalshi-spread-analyzer',
    'momentum-trend',
  ]);
  const [systemPrompt, setSystemPrompt] = useState(
    'Identify short-term directional momentum. Seek tight spreads (<$0.04) and execute high conviction.',
  );
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const agents = getAllAgents();
  const memories = getMemoriesForAgent(activeAgent.id);

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId],
    );
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Agent name is required.');
      return;
    }
    if (selectedSkills.length === 0) {
      setFormError('Select at least one skill module.');
      return;
    }

    const newAgent = createCustomAgent({
      name: name.trim(),
      role: 'strategy',
      strategyType,
      skills: selectedSkills,
      parameters: {
        convictionThreshold: Math.round(conviction * 100) / 100,
        targetOrderSize: Math.max(1, Math.min(10, Math.floor(orderSize))),
        maxSpreadTolerance: Math.round(spreadTolerance * 100) / 100,
        preferredSide: 'buy',
      },
      systemPrompt: systemPrompt.trim(),
    });

    onAgentsChanged();
    onSelectActiveAgent(newAgent);
    setActiveTab('agents');
    setFormError(null);
    setName('');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomAgent(id);
    onAgentsChanged();
    if (activeAgent.id === id) {
      const remaining = getAllAgents();
      onSelectActiveAgent(remaining[0]);
    }
  };

  const handleClearMemories = () => {
    if (confirm(`Clear all episodic memories for ${activeAgent.name}?`)) {
      clearAgentMemories(activeAgent.id);
      onAgentsChanged();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="agent-studio-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="agent-studio-modal__header">
          <div className="agent-studio-modal__title-group">
            <span className="badge badge--preset">Agent Studio</span>
            <h2 className="agent-studio-modal__title">Agent Creation & Learning Memory</h2>
            <p className="agent-studio-modal__subtitle">
              Configure specialized trading agents, assign modular skills, and inspect episodic learning feedback.
            </p>
          </div>
          <button className="btn btn--icon" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="agent-studio-modal__tabs" role="tablist">
          <button
            className={`studio-tab ${activeTab === 'agents' ? 'studio-tab--active' : ''}`}
            onClick={() => setActiveTab('agents')}
            role="tab"
            aria-selected={activeTab === 'agents'}
          >
            Agent Profiles ({agents.length})
          </button>
          <button
            className={`studio-tab ${activeTab === 'create' ? 'studio-tab--active' : ''}`}
            onClick={() => setActiveTab('create')}
            role="tab"
            aria-selected={activeTab === 'create'}
          >
            + Create New Agent
          </button>
          <button
            className={`studio-tab ${activeTab === 'memories' ? 'studio-tab--active' : ''}`}
            onClick={() => setActiveTab('memories')}
            role="tab"
            aria-selected={activeTab === 'memories'}
          >
            🧠 Episodic Memory ({memories.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="agent-studio-modal__content">
          {/* TAB 1: Agent Profiles */}
          {activeTab === 'agents' && (
            <div className="studio-agents-grid">
              {agents.map((agent) => {
                const isActive = agent.id === activeAgent.id;
                const agentMemories = getMemoriesForAgent(agent.id);
                return (
                  <div
                    key={agent.id}
                    className={`agent-card ${isActive ? 'agent-card--active' : ''}`}
                    onClick={() => onSelectActiveAgent(agent)}
                  >
                    <div className="agent-card__header">
                      <div>
                        <div className="agent-card__badges">
                          <span className={`badge ${agent.isPreset ? 'badge--preset' : 'badge--custom'}`}>
                            {agent.isPreset ? 'Preset' : 'Custom'}
                          </span>
                          <span className="badge badge--neutral font-mono">{agent.strategyType}</span>
                          {isActive && <span className="badge badge--success">✓ Active Agent</span>}
                        </div>
                        <h3 className="agent-card__name">{agent.name}</h3>
                      </div>
                      {!agent.isPreset && (
                        <button
                          className="btn btn--danger btn--xs"
                          onClick={(e) => handleDelete(agent.id, e)}
                          title="Delete custom agent"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    <p className="agent-card__prompt">{agent.systemPrompt}</p>

                    <div className="agent-card__specs">
                      <div className="inspector__kv-row">
                        <span className="inspector__kv-key">Target Size:</span>
                        <span className="inspector__kv-val font-mono">{agent.parameters.targetOrderSize} contracts</span>
                      </div>
                      <div className="inspector__kv-row">
                        <span className="inspector__kv-key">Conviction Req:</span>
                        <span className="inspector__kv-val font-mono">
                          {(agent.parameters.convictionThreshold * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="inspector__kv-row">
                        <span className="inspector__kv-key">Max Spread:</span>
                        <span className="inspector__kv-val font-mono">
                          ${agent.parameters.maxSpreadTolerance.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Assigned Skills */}
                    <div className="agent-card__skills">
                      <span className="agent-card__skills-label">Assigned Skills:</span>
                      <div className="agent-card__skill-chips">
                        {agent.skills.map((sId) => {
                          const skill = AVAILABLE_SKILLS.find((s) => s.id === sId);
                          return (
                            <span key={sId} className="skill-chip" title={skill?.description}>
                              ⟡ {skill?.name ?? sId}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Learning & Memory Stats */}
                    <div className="agent-card__footer">
                      <span>🧠 {agentMemories.length} memories</span>
                      <span>⚖ Risk Compliance: 100%</span>
                      <button
                        className={`btn btn--xs ${isActive ? 'btn--primary' : 'btn--ghost'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectActiveAgent(agent);
                        }}
                      >
                        {isActive ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Create New Agent Form */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateAgent} className="studio-create-form">
              {formError && <div className="paper-alert paper-alert--error">{formError}</div>}

              <div className="studio-form-grid">
                {/* Agent Name */}
                <div className="ticket-field">
                  <label className="ticket-field__label">Agent Name</label>
                  <input
                    type="text"
                    className="input font-mono"
                    placeholder="e.g. Kalshi Event Scout"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Strategy Archetype */}
                <div className="ticket-field">
                  <label className="ticket-field__label">Strategy Archetype</label>
                  <select
                    className="input"
                    value={strategyType}
                    onChange={(e) => setStrategyType(e.target.value as StrategyType)}
                  >
                    <option value="momentum">Momentum Trend</option>
                    <option value="spread-arbitrage">Spread Arbitrage</option>
                    <option value="conservative">Conservative Sentinel</option>
                    <option value="contrarian">Contrarian Reversal</option>
                    <option value="custom">Custom Rule</option>
                  </select>
                </div>

                {/* Target Order Size */}
                <div className="ticket-field">
                  <label className="ticket-field__label">
                    Target Order Size (Contracts)
                    <span className="ticket-field__hint">Max 10 (enforced by Risk Engine)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="input input--number font-mono"
                    value={orderSize}
                    onChange={(e) => setOrderSize(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>

                {/* Conviction Threshold */}
                <div className="ticket-field">
                  <label className="ticket-field__label">
                    Conviction Threshold: <strong>{(conviction * 100).toFixed(0)}%</strong>
                  </label>
                  <input
                    type="range"
                    min="0.50"
                    max="0.95"
                    step="0.01"
                    className="range-slider"
                    value={conviction}
                    onChange={(e) => setConviction(parseFloat(e.target.value))}
                  />
                </div>

                {/* Spread Tolerance */}
                <div className="ticket-field">
                  <label className="ticket-field__label">
                    Max Spread Tolerance: <strong>${spreadTolerance.toFixed(2)}</strong>
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="0.10"
                    step="0.01"
                    className="range-slider"
                    value={spreadTolerance}
                    onChange={(e) => setSpreadTolerance(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              {/* Modular Skills Selection */}
              <div className="ticket-field">
                <label className="ticket-field__label">Assign Modular Skills</label>
                <div className="studio-skills-checklist">
                  {AVAILABLE_SKILLS.map((skill) => {
                    const isChecked = selectedSkills.includes(skill.id);
                    return (
                      <label key={skill.id} className={`skill-toggle-card ${isChecked ? 'skill-toggle-card--selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSkill(skill.id)}
                          style={{ marginRight: '8px' }}
                        />
                        <div>
                          <strong>{skill.name}</strong>
                          <span className="skill-indicator-tag">{skill.indicator}</span>
                          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '11px' }}>
                            {skill.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* System Instructions */}
              <div className="ticket-field">
                <label className="ticket-field__label">Agent Behavioral Prompt / Strategy Rationale</label>
                <textarea
                  className="input input--textarea font-mono"
                  rows={3}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Define the analytical criteria and decision boundaries for this agent..."
                  required
                />
              </div>

              <div className="studio-form-actions">
                <button type="submit" className="btn btn--primary">
                  ✓ Save & Activate Agent
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Episodic Memory Ledger */}
          {activeTab === 'memories' && (
            <div className="studio-memories-view">
              <div className="studio-memories-header">
                <div>
                  <h3 className="section-title">
                    Episodic Experiences for <strong>{activeAgent.name}</strong>
                  </h3>
                  <p className="text-muted" style={{ fontSize: '12px', margin: 0 }}>
                    Post-trade reflections committed by the Evaluation Agent and read by the Strategy Agent on future market evaluations.
                  </p>
                </div>
                {memories.length > 0 && (
                  <button className="btn btn--ghost btn--xs" onClick={handleClearMemories}>
                    Clear Memory Store
                  </button>
                )}
              </div>

              {memories.length === 0 ? (
                <div className="empty-state-box">
                  <p>No episodic memories recorded for this agent yet.</p>
                  <p className="text-muted">
                    Run learning cycles using <strong>"⚡ Run Training Cycle"</strong> in Agent Lab to generate trade reflections.
                  </p>
                </div>
              ) : (
                <div className="studio-memories-list">
                  {memories.map((m) => (
                    <div key={m.id} className="memory-card">
                      <div className="memory-card__header">
                        <span className="font-mono font-bold">{m.ticker}</span>
                        <span className="badge badge--neutral">{new Date(m.timestamp).toLocaleTimeString()}</span>
                        <span className={`badge ${m.outcome.approved ? 'badge--success' : 'badge--danger'}`}>
                          {m.outcome.approved ? 'Approved' : 'Risk Blocked'}
                        </span>
                        {m.relevanceTag && (
                          <span className="badge badge--preset font-mono">{m.relevanceTag}</span>
                        )}
                      </div>

                      <div className="memory-card__reflection">
                        <strong>Reflection:</strong> {m.reflection}
                      </div>

                      <div className="memory-card__lesson">
                        <strong>💡 Lesson Learned:</strong> {m.learnedLesson}
                      </div>

                      <div className="memory-card__meta font-mono">
                        Quote: Bid ${m.marketContext.bid.toFixed(2)} / Ask ${m.marketContext.ask.toFixed(2)} · Spread: ${m.marketContext.spread.toFixed(2)} · Sizing: {m.marketContext.proposedQty} units
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
