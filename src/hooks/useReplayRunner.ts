// ─── Agent Trading OS — Replay Runner Hook ────────────────────────────────────
// Manages recorded run playback.
//
// Key Invariants:
// 1. Workflow stages execute synchronously ONCE when runScenario() is called.
//    The resulting RunRecord is completely frozen and immutable.
// 2. Playback controls (Play, Pause, Prev, Next, Restart, Seek) manipulate ONLY
//    the cursorIndex. They NEVER invoke workflow stages or create mock orders.
// 3. Cancelling/pausing/restarting immediately clears any pending timers,
//    preventing stale updates.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScenarioKey, RunRecord } from '../workflow/types';
import { runWorkflow } from '../workflow/runner';
import { executionAdapter } from '../workflow/adapter';
import { SCENARIOS } from '../workflow/scenarios';

import type { TradingAgentProfile } from '../agents/types';
import type { NormalizedMarketSnapshot } from '../paper/types';
import { runIndependentPhase, type DecisionBundle } from '../competition/competitionEngine';
import { reviewProposals } from '../competition/portfolioManager';
import type { ManagerDecision } from '../competition/types';
import { runProposalOnlyRound, type ProposalRoundResult } from '../competition/proposalRoundEngine';
import type { ProfileKey } from '../competition/researchProfiles';

export const PLAYBACK_STEP_MS = 900;

export interface UseReplayRunnerResult {
  runRecord: RunRecord | null;
  cursorIndex: number;
  isPlaying: boolean;
  isRunComplete: boolean;
  isPlaybackComplete: boolean;
  isLiveAutonomous: boolean;
  runScenario: (key: ScenarioKey, activeAgent?: TradingAgentProfile) => void;
  runTrainingCycle: (agent: TradingAgentProfile) => void;
  runLiveCycle: (snapshot: NormalizedMarketSnapshot, agent: TradingAgentProfile) => RunRecord;
  runCompetitiveCycle: (snapshot: NormalizedMarketSnapshot) => {
    bundle: DecisionBundle;
    decision: ManagerDecision;
    record: RunRecord;
  };
  runProposalRound: (profileKey?: ProfileKey, customSnapshot?: NormalizedMarketSnapshot) => ProposalRoundResult;
  toggleLiveAutonomous: () => void;
  togglePlayPause: () => void;
  stepNext: () => void;
  stepPrev: () => void;
  restartPlayback: () => void;
  seekTo: (index: number) => void;
  loadRecord: (record: RunRecord, initialCursor?: number) => void;
  reset: () => void;
}

export function useReplayRunner(): UseReplayRunnerResult {
  const [runRecord, setRunRecord] = useState<RunRecord | null>(null);
  const [cursorIndex, setCursorIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLiveAutonomous, setIsLiveAutonomous] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const runRecordRef = useRef(runRecord);
  runRecordRef.current = runRecord;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // Handle play step advance
  useEffect(() => {
    if (!isPlaying || !runRecord) {
      clearTimer();
      return;
    }

    if (cursorIndex >= runRecord.events.length - 1) {
      clearTimer();
      return;
    }

    const currentRunId = runRecord.runId;
    timerRef.current = setTimeout(() => {
      if (!isPlayingRef.current || runRecordRef.current?.runId !== currentRunId) {
        return;
      }
      setCursorIndex((prev) => {
        if (!isPlayingRef.current || runRecordRef.current?.runId !== currentRunId) {
          return prev;
        }
        const next = prev + 1;
        if (next >= runRecord.events.length - 1) {
          setIsPlaying(false);
        }
        return next;
      });
    }, PLAYBACK_STEP_MS);

    return () => clearTimer();
  }, [isPlaying, cursorIndex, runRecord, clearTimer]);

  /** Execute workflow once synchronously, freeze trace, and begin playback at step 0 */
  const runScenario = useCallback(
    (key: ScenarioKey, activeAgent?: TradingAgentProfile) => {
      clearTimer();
      setIsPlaying(false);

      // Reset mock adapter for fresh run
      executionAdapter.reset();

      // ── Step 1: Execute full pipeline synchronously ────────────────────────
      const input = SCENARIOS[key];
      const record = runWorkflow(input, executionAdapter, undefined, activeAgent);

      // Freeze record and set cursor to start
      setRunRecord(record);
      setCursorIndex(0);

      // Begin playback automatically
      setIsPlaying(true);
    },
    [clearTimer],
  );

  /** Execute a specialized training / learning cycle with memory feedback */
  const runTrainingCycle = useCallback(
    (agent: TradingAgentProfile) => {
      clearTimer();
      setIsPlaying(false);

      executionAdapter.reset();

      const input = {
        scenarioKey: 'allowed' as ScenarioKey,
        description: `Learning Cycle — ${agent.name} (${agent.strategyType})`,
        symbol: 'KXELONMARS-99',
        proposedQty: agent.parameters.targetOrderSize,
      };

      const record = runWorkflow(input, executionAdapter, undefined, agent);

      setRunRecord(record);
      setCursorIndex(0);
      setIsPlaying(true);
    },
    [clearTimer],
  );

  /** Execute a live cycle against a real-time market/bet snapshot */
  const runLiveCycle = useCallback(
    (snapshot: NormalizedMarketSnapshot, agent: TradingAgentProfile) => {
      clearTimer();
      setIsPlaying(false);

      executionAdapter.reset();

      const input = {
        scenarioKey: 'allowed' as ScenarioKey,
        description: `Live Market Cycle — ${snapshot.ticker} (${snapshot.marketTitle.slice(0, 36)})`,
        symbol: snapshot.ticker,
        proposedQty: agent.parameters.targetOrderSize,
        liveSnapshot: snapshot,
      };

      const record = runWorkflow(input, executionAdapter, undefined, agent);

      setRunRecord(record);
      setCursorIndex(0);
      setIsPlaying(true);
      return record;
    },
    [clearTimer],
  );

  /** Runs the multi-agent competition cycle across Alpha, Beta, Gamma, and Manager */
  const runCompetitiveCycle = useCallback(
    (snapshot: NormalizedMarketSnapshot) => {
      clearTimer();
      const bundle = runIndependentPhase(snapshot);
      const decision = reviewProposals(bundle);

      const topProposal = bundle.proposals[0];
      const input = {
        scenarioKey: (topProposal ? 'allowed' : 'blocked') as ScenarioKey,
        description: `Competitive Cycle — 3 Traders on ${snapshot.ticker} (${decision.disagreementSummary})`,
        symbol: snapshot.ticker,
        proposedQty: topProposal?.contracts || 1,
        liveSnapshot: snapshot,
        seasonId: 'season-1',
      };

      const record = runWorkflow(input, executionAdapter);
      setRunRecord(record);
      setCursorIndex(record.events.length - 1);
      return { bundle, decision, record };
    },
    [clearTimer],
  );

  /** Runs an explicit proposal-only round across Alpha, Beta, Gamma, Manager, Risk, and Coach */
  const runProposalRound = useCallback(
    (profileKey: ProfileKey = 'daily-weather', customSnapshot?: NormalizedMarketSnapshot) => {
      clearTimer();
      setIsPlaying(false);

      const snapshot: NormalizedMarketSnapshot = customSnapshot ?? (
        profileKey === 'nasdaq-oneq'
          ? {
              snapshotId: `snap-oneq-${Date.now()}`,
              ticker: 'ONEQ',
              marketTitle: 'Fidelity Nasdaq Composite Tracking Stock ETF',
              status: 'active',
              bestYesBid: 180.25,
              bestYesBidSize: 200,
              bestYesAsk: 180.50,
              bestYesAskSize: 150,
              spread: 0.25,
              lastPrice: 180.40,
              sourceTimestamp: Date.now(),
              localReceiptTimestamp: Date.now(),
              isStale: false,
              depth: {
                yesBids: [{ price: 180.25, size: 200 }],
                noBids: [{ price: 180.50, size: 150 }],
              },
            }
          : {
              snapshotId: `snap-weather-${Date.now()}`,
              ticker: 'KXWARMING-50',
              marketTitle: 'Will Global Temperature Anomaly exceed +1.5C in 2026?',
              status: 'active',
              bestYesBid: 0.48,
              bestYesBidSize: 50,
              bestYesAsk: 0.51,
              bestYesAskSize: 45,
              spread: 0.03,
              lastPrice: 0.50,
              sourceTimestamp: Date.now(),
              localReceiptTimestamp: Date.now(),
              isStale: false,
              depth: {
                yesBids: [{ price: 0.48, size: 50 }],
                noBids: [{ price: 0.49, size: 45 }],
              },
            }
      );

      const result = runProposalOnlyRound(snapshot, profileKey, 200.0);
      setRunRecord(result.runRecord);
      setCursorIndex(0);
      setIsPlaying(true);
      return result;
    },
    [clearTimer],
  );

  const toggleLiveAutonomous = useCallback(() => {
    setIsLiveAutonomous((prev) => !prev);
  }, []);

  /** Toggle play / pause */
  const togglePlayPause = useCallback(() => {
    if (!runRecord) return;

    if (isPlaying) {
      clearTimer();
      setIsPlaying(false);
    } else {
      // If at end, loop to beginning before playing
      if (cursorIndex >= runRecord.events.length - 1) {
        setCursorIndex(0);
      }
      setIsPlaying(true);
    }
  }, [runRecord, isPlaying, cursorIndex, clearTimer]);

  /** Step forward one event */
  const stepNext = useCallback(() => {
    if (!runRecord) return;
    clearTimer();
    setIsPlaying(false);
    setCursorIndex((prev) => Math.min(prev + 1, runRecord.events.length - 1));
  }, [runRecord, clearTimer]);

  /** Step backward one event */
  const stepPrev = useCallback(() => {
    if (!runRecord) return;
    clearTimer();
    setIsPlaying(false);
    setCursorIndex((prev) => Math.max(prev - 1, -1));
  }, [runRecord, clearTimer]);

  /** Restart playback at step 0 without executing or creating orders */
  const restartPlayback = useCallback(() => {
    if (!runRecord) return;
    clearTimer();
    setIsPlaying(false);
    setCursorIndex(0);
  }, [runRecord, clearTimer]);

  /** Seek directly to a specific event in the recorded trace */
  const seekTo = useCallback(
    (index: number) => {
      if (!runRecord) return;
      clearTimer();
      setIsPlaying(false);
      const clamped = Math.max(-1, Math.min(index, runRecord.events.length - 1));
      setCursorIndex(clamped);
    },
    [runRecord, clearTimer],
  );

  /** Load an existing RunRecord (e.g. from Paper Trading) into replay state */
  const loadRecord = useCallback(
    (record: RunRecord, initialCursor?: number) => {
      clearTimer();
      setIsPlaying(false);
      setRunRecord(record);
      // Position cursor at initialCursor if provided, else at final step so the complete decision is visible
      const startCursor = initialCursor !== undefined ? initialCursor : record.events.length - 1;
      setCursorIndex(startCursor);
    },
    [clearTimer],
  );

  /** Reset all state to uninitialized */
  const reset = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setRunRecord(null);
    setCursorIndex(-1);
    executionAdapter.reset();
  }, [clearTimer]);

  const isRunComplete = runRecord !== null;
  const isPlaybackComplete =
    runRecord !== null && cursorIndex >= runRecord.events.length - 1;

  return {
    runRecord,
    cursorIndex,
    isPlaying,
    isRunComplete,
    isPlaybackComplete,
    isLiveAutonomous,
    runScenario,
    runTrainingCycle,
    runLiveCycle,
    runCompetitiveCycle,
    runProposalRound,
    toggleLiveAutonomous,
    togglePlayPause,
    stepNext,
    stepPrev,
    restartPlayback,
    seekTo,
    loadRecord,
    reset,
  };
}
