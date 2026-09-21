// ─── Agent Trading OS — usePaperTrading Hook ──────────────────────────────────
// Connects to live Kalshi binary market data, collects genuine observations,
// manages virtual paper account execution, and persists ledger state.

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ConnectionStatus,
  NormalizedMarketSnapshot,
  PaperAccount,
  PaperOrder,
  PriceObservation,
} from './types';
import {
  CURATED_MARKETS,
  KALSHI_POLL_INTERVAL_MS,
  fetchMarketSnapshot,
} from './kalshi';
import {
  INITIAL_PAPER_ACCOUNT,
  executePaperTrade,
  loadPersistedAccount,
  loadPersistedOrders,
  savePersistedAccount,
  savePersistedOrders,
  savePersistedSnapshot,
  validatePaperOrder,
} from './account';
import { buildPaperTradeRunRecord } from './paperTraceBridge';
import type { RunRecord } from '../workflow/types';

export function usePaperTrading() {
  const [selectedTicker, setSelectedTicker] = useState<string>(
    CURATED_MARKETS[0].ticker,
  );
  const [snapshot, setSnapshot] = useState<NormalizedMarketSnapshot | null>(null);
  const [observations, setObservations] = useState<PriceObservation[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('polling');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [account, setAccount] = useState<PaperAccount>(loadPersistedAccount);
  const [orders, setOrders] = useState<PaperOrder[]>(loadPersistedOrders);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<number | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Poll function
  const poll = useCallback(async (ticker: string) => {
    setConnectionStatus('polling');
    const result = await fetchMarketSnapshot(ticker);

    if (!isMountedRef.current) return;

    setLastPollTime(Date.now());

    if (result.error) {
      if (result.error.includes('429') || result.error.includes('rate limit')) {
        setConnectionStatus('rate-limited');
      } else {
        setConnectionStatus('error');
      }
      setErrorMessage(result.error);
      return;
    }

    if (result.snapshot) {
      setConnectionStatus('connected');
      setErrorMessage(null);
      setSnapshot(result.snapshot);
      savePersistedSnapshot(result.snapshot);

      // Record genuine price observation for chart
      setObservations((prev) => {
        const next = [
          ...prev,
          {
            timestamp: result.snapshot!.localReceiptTimestamp,
            bid: result.snapshot!.bestYesBid,
            ask: result.snapshot!.bestYesAsk,
            lastPrice: result.snapshot!.lastPrice,
          },
        ];
        // Keep most recent 60 observations
        return next.slice(-60);
      });
    }
  }, []);

  // Polling lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    setObservations([]); // Reset chart observations on ticker change
    setSnapshot(null);

    // Initial fetch
    poll(selectedTicker);

    // Recurring poll
    const scheduleNext = () => {
      pollTimerRef.current = setTimeout(async () => {
        await poll(selectedTicker);
        if (isMountedRef.current) {
          scheduleNext();
        }
      }, KALSHI_POLL_INTERVAL_MS);
    };

    scheduleNext();

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [selectedTicker, poll]);

  // Immediate manual refresh
  const refreshNow = useCallback(() => {
    poll(selectedTicker);
  }, [selectedTicker, poll]);

  // Change market
  const changeMarket = useCallback((ticker: string) => {
    if (ticker !== selectedTicker) {
      setSelectedTicker(ticker);
    }
  }, [selectedTicker]);

  // Submit Paper Order
  const submitOrder = useCallback(
    (action: 'buy' | 'close', qty: number) => {
      if (!snapshot) return { success: false, order: null, runRecord: null };

      setIsSubmitting(true);
      const runId = `run-paper-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const validation = validatePaperOrder(action, qty, snapshot, account);
      const { updatedAccount, order } = executePaperTrade(
        action,
        qty,
        snapshot,
        account,
        runId,
        'manual-user',
      );

      // Save account and orders
      setAccount(updatedAccount);
      savePersistedAccount(updatedAccount);

      const nextOrders = [order, ...orders];
      setOrders(nextOrders);
      savePersistedOrders(nextOrders);

      // Create linked RunRecord trace
      const runRecord: RunRecord = buildPaperTradeRunRecord(
        action,
        qty,
        snapshot,
        account,
        updatedAccount,
        order,
        validation,
      );

      setIsSubmitting(false);
      return { success: order.status === 'filled', order, runRecord };
    },
    [snapshot, account, orders],
  );

  // Reset Account ($1,000 cash)
  const resetAccount = useCallback(() => {
    const resetAcc: PaperAccount = {
      ...INITIAL_PAPER_ACCOUNT,
      lastUpdated: Date.now(),
    };
    setAccount(resetAcc);
    savePersistedAccount(resetAcc);
    setOrders([]);
    savePersistedOrders([]);
  }, []);

  return {
    selectedTicker,
    snapshot,
    observations,
    connectionStatus,
    errorMessage,
    account,
    orders,
    isSubmitting,
    lastPollTime,
    changeMarket,
    refreshNow,
    submitOrder,
    resetAccount,
  };
}
