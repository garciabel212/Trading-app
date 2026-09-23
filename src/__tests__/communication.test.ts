// ─── Agent Trading OS — Multi-Agent Communication & Proposal Round Tests ───────
// Verifies:
// 1. Explicit communication contracts & grounded evidence (11 message fields, no hallucinations)
// 2. Disagreement round (Alpha proposes, Beta/Gamma skip, Manager selects, Risk approves, Execution disabled, Coach records)
// 3. Blocked / Incomplete round (Stale market data, Risk blocks or flags incomplete)
// 4. Zero mutations invariant (No account balance, position, or paper order modifications)
// 5. Replay temporal isolation (deriveActiveMessages respects cursor, hides future messages)
// 6. Separate research profiles & ETF whole-share mechanics (Daily Weather vs Nasdaq ONEQ)

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import type { NormalizedMarketSnapshot } from '../paper/types';
import { runProposalOnlyRound } from '../competition/proposalRoundEngine';
import {
  RESEARCH_PROFILES,
  checkWholeShareAffordability,
} from '../competition/researchProfiles';
import { deriveActiveMessages } from '../workflow/replay';
import { INITIAL_PAPER_ACCOUNT, loadPersistedAccount, loadPersistedOrders } from '../paper/account';

// Polyfill localStorage & window for Node/Vitest
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

beforeAll(() => {
  if (typeof window === 'undefined') {
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: mockLocalStorage,
      dispatchEvent: () => true,
    };
  }
  if (typeof localStorage === 'undefined') {
    (globalThis as unknown as { localStorage: unknown }).localStorage = mockLocalStorage;
  }
});

beforeEach(() => {
  storageMap.clear();
});

const VALID_WEATHER_SNAPSHOT: NormalizedMarketSnapshot = {
  snapshotId: 'snap-weather-001',
  ticker: 'KXWARMING-50',
  marketTitle: 'Global Temperature Anomaly Exceeding +1.5C in 2026',
  status: 'active',
  bestYesBid: 0.49,
  bestYesBidSize: 100,
  bestYesAsk: 0.52, // spread = 0.03 <= 0.04
  bestYesAskSize: 80,
  spread: 0.03,
  lastPrice: 0.51,
  sourceTimestamp: Date.now(),
  localReceiptTimestamp: Date.now(),
  isStale: false,
  depth: {
    yesBids: [{ price: 0.49, size: 100 }],
    noBids: [{ price: 0.48, size: 80 }],
  },
};

const STALE_WEATHER_SNAPSHOT: NormalizedMarketSnapshot = {
  ...VALID_WEATHER_SNAPSHOT,
  snapshotId: 'snap-weather-stale',
  localReceiptTimestamp: Date.now() - 45000, // 45 seconds old (> 30s threshold)
  isStale: true,
};

const ONEQ_SNAPSHOT: NormalizedMarketSnapshot = {
  snapshotId: 'snap-oneq-001',
  ticker: 'ONEQ',
  marketTitle: 'Fidelity Nasdaq Composite Tracking Stock ETF',
  status: 'active',
  bestYesBid: 180.20,
  bestYesBidSize: 500,
  bestYesAsk: 180.50,
  bestYesAskSize: 450,
  spread: 0.30,
  lastPrice: 180.35,
  sourceTimestamp: Date.now(),
  localReceiptTimestamp: Date.now(),
  isStale: false,
  depth: {
    yesBids: [{ price: 180.20, size: 500 }],
    noBids: [{ price: 180.50, size: 450 }],
  },
};

describe('Agent Trading OS — Communication & Proposal Round Engine', () => {
  describe('Phase 1: Disagreement Round (Alpha proposes, Beta/Gamma skip)', () => {
    it('executes a proposal-only round with explicit messages and frozen submissions', () => {
      const result = runProposalOnlyRound(VALID_WEATHER_SNAPSHOT, 'daily-weather', 200.0);

      expect(result.runId).toBeDefined();
      expect(result.messages.length).toBeGreaterThanOrEqual(7);

      // Verify sequence of sender/recipient communications
      const senders = result.messages.map((m) => m.sender);
      expect(senders).toContain('trader-alpha');
      expect(senders).toContain('trader-beta');
      expect(senders).toContain('trader-gamma');
      expect(senders).toContain('portfolio-manager');
      expect(senders).toContain('risk-engine');
      expect(senders).toContain('paper-execution');
      expect(senders).toContain('coach-evaluator');

      // Alpha submitted proposal
      const alphaMsg = result.messages.find((m) => m.sender === 'trader-alpha');
      expect(alphaMsg?.messageType).toBe('proposal');
      expect(alphaMsg?.recipient).toBe('portfolio-manager');
      expect(alphaMsg?.conciseSummary).toContain('Alpha → Manager:');

      // Beta and Gamma submitted SKIP
      const betaMsg = result.messages.find((m) => m.sender === 'trader-beta');
      const gammaMsg = result.messages.find((m) => m.sender === 'trader-gamma');
      expect(betaMsg?.messageType).toBe('skip');
      expect(gammaMsg?.messageType).toBe('skip');

      // Portfolio Manager selected Alpha's proposal
      expect(result.selectedTraderId).toBe('trader-alpha');
      const mgrMsg = result.messages.find((m) => m.sender === 'portfolio-manager' && m.recipient === 'risk-engine');
      expect(mgrMsg?.messageType).toBe('selection');
      expect(mgrMsg?.conciseSummary).toContain('Selected proposal: ALPHA');

      // Risk Engine validated selection
      expect(result.riskVerdict).toBe('APPROVED');
      const riskMsg = result.messages.find((m) => m.sender === 'risk-engine');
      expect(riskMsg?.messageType).toBe('risk_verdict');
      expect(riskMsg?.conciseSummary).toContain('APPROVED');

      // Execution displays "Proposal only—execution disabled."
      expect(result.executionStatus).toContain('Proposal only—execution disabled.');
      const execMsg = result.messages.find((m) => m.sender === 'paper-execution');
      expect(execMsg?.conciseSummary).toContain('Proposal only—execution disabled.');

      // Coach Evaluator records round
      expect(result.coachStatus).toContain('Outcome pending');
      const coachMsg = result.messages.find((m) => m.sender === 'coach-evaluator');
      expect(coachMsg?.messageType).toBe('coach_record');
    });

    it('enforces grounded evidence references with measured values and thresholds', () => {
      const result = runProposalOnlyRound(VALID_WEATHER_SNAPSHOT, 'daily-weather', 200.0);

      // Check that every message has required fields
      for (const msg of result.messages) {
        expect(msg.messageId).toBeDefined();
        expect(msg.runId).toBe(result.runId);
        expect(msg.sequence).toBeGreaterThan(0);
        expect(msg.timestamp).toBeGreaterThan(0);
        expect(msg.sender).toBeDefined();
        expect(msg.recipient).toBeDefined();
        expect(msg.messageType).toBeDefined();
        expect(msg.conciseSummary.length).toBeGreaterThan(5);
        expect(msg.strategyVersion).toBeDefined();
        expect(msg.instrumentType).toBe('binary_contract');
        expect(msg.profileKey).toBe('daily-weather');
        expect(msg.status).toBe('delivered');
      }

      // Check Alpha's grounded evidence
      const alphaMsg = result.messages.find((m) => m.sender === 'trader-alpha');
      expect(alphaMsg?.evidenceReferences.length).toBeGreaterThanOrEqual(2);
      const spreadEv = alphaMsg?.evidenceReferences.find((e) => e.indicatorOrRule === 'spread_friction');
      expect(spreadEv?.measuredValue).toBe('$0.03');
      expect(spreadEv?.threshold).toBe('<= $0.04');
      expect(spreadEv?.verdictPassed).toBe(true);
    });
  });

  describe('Phase 2: Blocked / Incomplete Round (Stale market data)', () => {
    it('blocks proposal when market snapshot is stale', () => {
      const result = runProposalOnlyRound(STALE_WEATHER_SNAPSHOT, 'daily-weather', 200.0, true);

      expect(result.riskVerdict).toBe('BLOCKED');
      const riskMsg = result.messages.find((m) => m.sender === 'risk-engine');
      expect(riskMsg?.conciseSummary).toContain('BLOCKED');
      expect(riskMsg?.conciseSummary).toContain('stale');

      // Execution remains disabled
      expect(result.executionStatus).toContain('Proposal only—execution disabled.');
      expect(result.runRecord.paperOrders).toHaveLength(0);
    });

    it('marks round as INCOMPLETE when quotes or price are missing', () => {
      const missingDataSnapshot: NormalizedMarketSnapshot = {
        ...VALID_WEATHER_SNAPSHOT,
        lastPrice: null,
        bestYesAsk: null,
        bestYesBid: null,
      };

      const result = runProposalOnlyRound(missingDataSnapshot, 'daily-weather', 200.0);
      expect(result.riskVerdict).toBe('INCOMPLETE');
      const riskMsg = result.messages.find((m) => m.sender === 'risk-engine');
      expect(riskMsg?.conciseSummary).toContain('INCOMPLETE');
    });
  });

  describe('Phase 3: Zero Mutation Invariant', () => {
    it('leaves balances, positions, and order history strictly unchanged', () => {
      const initialAccount = { ...INITIAL_PAPER_ACCOUNT };

      // Run multiple proposal rounds
      runProposalOnlyRound(VALID_WEATHER_SNAPSHOT, 'daily-weather', 200.0);
      runProposalOnlyRound(STALE_WEATHER_SNAPSHOT, 'daily-weather', 200.0);
      runProposalOnlyRound(ONEQ_SNAPSHOT, 'nasdaq-oneq', 200.0);

      // Account & order history must be untouched
      const postAccount = loadPersistedAccount();
      const postOrders = loadPersistedOrders();

      expect(postAccount.cash).toBe(initialAccount.cash);
      expect(postAccount.position).toBeNull();
      expect(postOrders).toHaveLength(0);
    });

    it('produces RunRecords with zero paperOrders', () => {
      const result = runProposalOnlyRound(VALID_WEATHER_SNAPSHOT, 'daily-weather', 200.0);
      expect(result.runRecord.paperOrders).toEqual([]);
    });
  });

  describe('Phase 4: Replay Temporal Isolation', () => {
    it('deriveActiveMessages strictly isolates messages up to the replay cursor', () => {
      const result = runProposalOnlyRound(VALID_WEATHER_SNAPSHOT, 'daily-weather', 200.0);
      const record = result.runRecord;

      // At step 0: only initial messages with sequence <= 1 are visible
      const step0 = deriveActiveMessages(record, 0);
      const step0Senders = Object.keys(step0);
      expect(step0Senders.length).toBeLessThan(record.messages!.length);

      // At intermediate step: future messages are hidden
      const mid = deriveActiveMessages(record, 2);
      expect(mid['coach-evaluator']).toBeUndefined(); // coach is emitted at end

      // At final step: all messages are visible
      const full = deriveActiveMessages(record, record.events.length - 1);
      expect(Object.keys(full).length).toBeGreaterThanOrEqual(6);
      expect(full['coach-evaluator']).toBeDefined();

      // Moving cursor backward hides later messages (deterministic pure function)
      const backward = deriveActiveMessages(record, 1);
      expect(backward['coach-evaluator']).toBeUndefined();
      expect(backward['risk-engine']).toBeUndefined();
    });
  });

  describe('Phase 5: Separate Market Strategy Profiles (Daily Weather vs Nasdaq ONEQ)', () => {
    it('defines distinct profile parameters for Weather and ONEQ', () => {
      const weather = RESEARCH_PROFILES['daily-weather'];
      const oneq = RESEARCH_PROFILES['nasdaq-oneq'];

      expect(weather.instrumentType).toBe('binary_contract');
      expect(weather.capitalBudget).toBe(200.0);
      expect(weather.methods.alpha.status).toBe('implemented');

      expect(oneq.instrumentType).toBe('equity_etf');
      expect(oneq.tradableSymbol).toBe('ONEQ');
      expect(oneq.capitalBudget).toBe(200.0);
      expect(oneq.timezone).toBe('America/New_York');

      // Unimplemented evaluators return status research_candidate
      expect(oneq.methods.alpha.status).toBe('research_candidate');
      expect(oneq.methods.beta.status).toBe('research_candidate');
      expect(oneq.methods.gamma.status).toBe('research_candidate');
    });

    it('returns SKIP as "Not implemented" for ONEQ research profile', () => {
      const result = runProposalOnlyRound(ONEQ_SNAPSHOT, 'nasdaq-oneq', 200.0);

      expect(result.profileKey).toBe('nasdaq-oneq');
      expect(result.selectedTraderId).toBeNull(); // No proposals selected

      const alphaMsg = result.messages.find((m) => m.sender === 'trader-alpha');
      const betaMsg = result.messages.find((m) => m.sender === 'trader-beta');
      const gammaMsg = result.messages.find((m) => m.sender === 'trader-gamma');

      expect(alphaMsg?.messageType).toBe('skip');
      expect(alphaMsg?.conciseSummary).toContain('Not implemented');
      expect(betaMsg?.conciseSummary).toContain('Not implemented');
      expect(gammaMsg?.conciseSummary).toContain('Not implemented');

      // Manager records NO TRADE
      const mgrMsg = result.messages.find((m) => m.sender === 'portfolio-manager');
      expect(mgrMsg?.messageType).toBe('no_trade');
      expect(mgrMsg?.conciseSummary).toContain('NO TRADE');
    });

    it('validates whole-share affordability on $200 capital model', () => {
      const price = 180.00;
      const cash = 200.00;

      // 1 whole share fits ($180.00 <= $200.00)
      const valid = checkWholeShareAffordability(price, cash, 1);
      expect(valid.affordable).toBe(true);
      expect(valid.maxAffordableShares).toBe(1);
      expect(valid.totalCost).toBe(180.00);

      // 2 whole shares exceed $200 cash ($360.00 > $200.00)
      const excess = checkWholeShareAffordability(price, cash, 2);
      expect(excess.affordable).toBe(false);
      expect(excess.reason).toContain('Insufficient cash');

      // Fractional shares are rejected
      const fractional = checkWholeShareAffordability(price, cash, 1.5);
      expect(fractional.affordable).toBe(false);
      expect(fractional.reason).toContain('whole integer');

      // Zero or negative shares are rejected
      const nonPositive = checkWholeShareAffordability(price, cash, 0);
      expect(nonPositive.affordable).toBe(false);
    });
  });
});
