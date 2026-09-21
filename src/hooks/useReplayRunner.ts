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
  toggleLiveAutonomous: () => void;
  togglePlayPause: () => void;
  stepNext: () => void;
  stepPrev: () => void;
  restartPlayback: () => void;
  seekTo: (index: number) => void;
  loadRecord: (record: RunRecord) => void;
  reset: () => void;
}

export function useReplayRunner(): UseReplayRunnerResult {
  const [runRecord, setRunRecord] = useState<RunRecord | null>(null);
  const [cursorIndex, setCursorIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLiveAutonomous, setIsLiveAutonomous] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Reached the end of the recorded trace — stop playing
      setIsPlaying(false);
      clearTimer();
      return;
    }

    timerRef.current = setTimeout(() => {
      setCursorIndex((prev) => {
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
    setCursorIndex((prev) => Math.max(prev - 1, 0));
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
      const clamped = Math.max(0, Math.min(index, runRecord.events.length - 1));
      setCursorIndex(clamped);
    },
    [runRecord, clearTimer],
  );

  /** Load an existing RunRecord (e.g. from Paper Trading) into replay state */
  const loadRecord = useCallback(
    (record: RunRecord) => {
      clearTimer();
      setIsPlaying(false);
      setRunRecord(record);
      // Position cursor at final step so the complete decision is visible
      setCursorIndex(record.events.length - 1);
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
