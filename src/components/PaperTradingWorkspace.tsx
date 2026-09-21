// ─── Agent Trading OS — Paper Trading Workspace ───────────────────────────────
// Real Kalshi binary market data integration with simulated paper execution.
// Strictly labeled: "Real market data · Simulated execution".

import { memo, useMemo, useState } from 'react';
import { isSnapshotStale } from '../paper/kalshi';
import { isCryptoTicker } from '../paper/crypto';
import {
  MAX_ORDER_SIZE_LIMIT,
  validatePaperOrder,
  valuePosition,
} from '../paper/account';
import PriceChart from './PriceChart';
import type { usePaperTrading } from '../paper/usePaperTrading';

interface PaperTradingWorkspaceProps {
  paperState: ReturnType<typeof usePaperTrading>;
  onInspectDecision: (runId: string) => void;
}

const PaperTradingWorkspace = memo(function PaperTradingWorkspace({
  paperState,
  onInspectDecision,
}: PaperTradingWorkspaceProps) {
  const {
    selectedTicker,
    snapshot,
    observations,
    connectionStatus,
    errorMessage,
    account,
    orders,
    isSubmitting,
    lastPollTime,
    isLiveRunning,
    toggleLiveRunning,
    allMarkets,
    changeMarket,
    refreshNow,
    submitOrder,
    resetAccount,
  } = paperState;

  // Local ticket state
  const [ticketAction, setTicketAction] = useState<'buy' | 'close'>('buy');
  const [orderQty, setOrderQty] = useState<number>(5);
  const [customTickerInput, setCustomTickerInput] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Validation pre-flight
  const validation = useMemo(() => {
    return validatePaperOrder(ticketAction, orderQty, snapshot, account);
  }, [ticketAction, orderQty, snapshot, account]);

  // Position valuation
  const valuation = useMemo(() => {
    return valuePosition(account, snapshot);
  }, [account, snapshot]);

  // Handlers
  const handleMarketSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      changeMarket(val);
    }
  };

  const handleCustomTickerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTickerInput.trim().toUpperCase();
    if (clean) {
      changeMarket(clean);
      setShowCustomInput(false);
    }
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    const result = submitOrder(ticketAction, orderQty);
    if (result.success) {
      setFeedbackMessage({
        type: 'success',
        text: `✓ Order ${result.order?.orderId} filled: ${ticketAction === 'buy' ? 'Purchased' : 'Closed'} ${orderQty} YES @ $${result.order?.price.toFixed(2)} (Fee: $${result.order?.fee.toFixed(2)})`,
      });
      // If closed, default back to buy
      if (ticketAction === 'close' && (!account.position || account.position.contracts <= orderQty)) {
        setTicketAction('buy');
        setOrderQty(5);
      }
    } else {
      setFeedbackMessage({
        type: 'error',
        text: `✗ Order rejected: ${result.order?.reason ?? 'Risk checks failed'}`,
      });
    }
  };

  const formatElapsed = (timestamp: number | null) => {
    if (!timestamp) return '—';
    const s = Math.floor((Date.now() - timestamp) / 1000);
    return `${s}s ago`;
  };

  const isCurrentCrypto = isCryptoTicker(selectedTicker);

  return (
    <main className="paper-workspace" role="main" aria-label="Paper Trading Workspace">
      {/* ── 1. Workspace Header & Market Selector ──────────────────────────── */}
      <header className="paper-header">
        <div className="paper-header__top-row">
          <div className="paper-header__label-group">
            <h1 className="paper-header__title">
              {isCurrentCrypto ? 'Crypto Live Paper Trading' : 'Kalshi Bets & Prediction Paper Trading'}
            </h1>
            <span className="paper-header__badge-banner" role="status">
              Real market data · Simulated execution
            </span>
          </div>

          <div className="paper-header__status-group">
            {/* Live Streaming Toggle Button */}
            <button
              id="btn-toggle-live-stream"
              className={`live-stream-btn ${isLiveRunning ? 'live-stream-btn--running' : 'live-stream-btn--paused'} font-mono`}
              onClick={toggleLiveRunning}
              title={isLiveRunning ? 'Click to pause live feed' : 'Click to start live streaming feed'}
            >
              <span className={`live-stream-dot ${isLiveRunning ? 'live-stream-dot--active' : ''}`} />
              {isLiveRunning ? '● LIVE RUNNING (3.5s)' : '⏸ PAUSED (CLICK TO RUN)'}
            </button>

            <span className={`connection-pill connection-pill--${connectionStatus}`}>
              <span className="connection-pill__dot" aria-hidden="true" />
              {connectionStatus === 'connected' && (isCurrentCrypto ? 'Live Coinbase Feed' : 'Live Kalshi Feed')}
              {connectionStatus === 'polling' && 'Updating quotes…'}
              {connectionStatus === 'rate-limited' && 'Rate Limited (HTTP 429)'}
              {connectionStatus === 'stale' && 'Quote Stale'}
              {connectionStatus === 'error' && 'Feed Error'}
            </span>

            <button
              className="btn btn--timeline"
              onClick={refreshNow}
              title="Poll latest market snapshot immediately"
              aria-label="Refresh market data now"
            >
              ⟳ Refresh
            </button>
          </div>
        </div>

        {/* Market Selector Bar */}
        <div className="paper-header__selector-bar">
          <div className="market-selector-control">
            <label htmlFor="select-market" className="market-selector-label">
              Selected Market:
            </label>
            <select
              id="select-market"
              className="market-dropdown"
              value={showCustomInput ? 'custom' : selectedTicker}
              onChange={handleMarketSelect}
              aria-label="Select market or prediction bet"
            >
              <optgroup label="🎯 HIGH-VOLUME PREDICTION BETS (Kalshi CFTC)">
                {allMarkets.filter((m) => !isCryptoTicker(m.ticker)).map((m) => (
                  <option key={m.ticker} value={m.ticker}>
                    {m.ticker} — {m.title.slice(0, 52)}…
                  </option>
                ))}
              </optgroup>
              <optgroup label="📈 LIVE SPOT CRYPTO (Coinbase Exchange)">
                {allMarkets.filter((m) => isCryptoTicker(m.ticker)).map((m) => (
                  <option key={m.ticker} value={m.ticker}>
                    {m.ticker} — {m.title}
                  </option>
                ))}
              </optgroup>
              <option value="custom">Enter Custom Ticker…</option>
            </select>
          </div>

          {showCustomInput && (
            <form onSubmit={handleCustomTickerSubmit} className="custom-ticker-form">
              <input
                type="text"
                className="input input--ticker"
                placeholder="e.g. KXWARMING-50"
                value={customTickerInput}
                onChange={(e) => setCustomTickerInput(e.target.value)}
                autoFocus
                aria-label="Custom Kalshi ticker"
              />
              <button type="submit" className="btn btn--timeline-primary">
                Load
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowCustomInput(false)}
              >
                Cancel
              </button>
            </form>
          )}

          {snapshot && (
            <div className="paper-header__meta-chips">
              <span className="meta-chip">
                Status: <strong>{snapshot.status}</strong>
              </span>
              <span className="meta-chip">
                Updated: <strong>{formatElapsed(lastPollTime)}</strong>
              </span>
              <span className="meta-chip font-mono" title={snapshot.snapshotId}>
                ID: {snapshot.snapshotId.slice(0, 24)}…
              </span>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="paper-alert paper-alert--error" role="alert">
            ⚠ {errorMessage} (Never silently substituting mock prices)
          </div>
        )}
      </header>

      {/* ── 2. Market Details & Live Quote Bar ──────────────────────────────── */}
      <section className="paper-quote-bar" aria-label="Market quote and depth">
        <div className="paper-quote-bar__title-block">
          <span className="paper-quote-bar__ticker font-mono">{snapshot?.ticker ?? selectedTicker}</span>
          <h2 className="paper-quote-bar__title">
            {snapshot?.marketTitle ?? 'Loading market description…'}
          </h2>
        </div>

        <div className="paper-quote-bar__metrics">
          {/* Best YES Bid */}
          <div className="quote-card quote-card--bid">
            <span className="quote-card__label">Best YES Bid (Sell Price)</span>
            <span className="quote-card__value">
              {snapshot?.bestYesBid !== null && snapshot?.bestYesBid !== undefined
                ? `$${snapshot.bestYesBid.toFixed(2)}`
                : '—'}
            </span>
            <span className="quote-card__size">
              Size: {snapshot?.bestYesBidSize ? `${snapshot.bestYesBidSize.toFixed(0)} contracts` : '0'}
            </span>
          </div>

          {/* Best YES Ask */}
          <div className="quote-card quote-card--ask">
            <span className="quote-card__label">Best YES Ask (Buy Price)</span>
            <span className="quote-card__value">
              {snapshot?.bestYesAsk !== null && snapshot?.bestYesAsk !== undefined
                ? `$${snapshot.bestYesAsk.toFixed(2)}`
                : '—'}
            </span>
            <span className="quote-card__size">
              Size: {snapshot?.bestYesAskSize ? `${snapshot.bestYesAskSize.toFixed(0)} contracts` : '0'}
            </span>
          </div>

          {/* Spread */}
          <div className="quote-card quote-card--neutral">
            <span className="quote-card__label">Bid/Ask Spread</span>
            <span className="quote-card__value">
              {snapshot?.spread !== null && snapshot?.spread !== undefined
                ? `$${snapshot.spread.toFixed(2)}`
                : '—'}
            </span>
            <span className="quote-card__size">
              Reciprocal YES/NO
            </span>
          </div>

          {/* Last Trade */}
          <div className="quote-card quote-card--neutral">
            <span className="quote-card__label">Last Trade Price</span>
            <span className="quote-card__value">
              {snapshot?.lastPrice !== null && snapshot?.lastPrice !== undefined
                ? `$${snapshot.lastPrice.toFixed(2)}`
                : '—'}
            </span>
            <span className="quote-card__size">
              Kalshi Tape
            </span>
          </div>
        </div>
      </section>

      {/* ── 3. Chart & Trading Grid ────────────────────────────────────────── */}
      <div className="paper-grid">
        {/* Left Column: Price Chart & Account Overview */}
        <div className="paper-grid__left">
          {/* Real Observations Chart */}
          <PriceChart
            observations={observations}
            ticker={snapshot?.ticker ?? selectedTicker}
            isStale={isSnapshotStale(snapshot)}
            status={connectionStatus}
          />

          {/* Portfolio & Virtual Account Ledger */}
          <section className="paper-account-panel" aria-label="Paper account summary">
            <div className="paper-account-panel__header">
              <h3 className="paper-account-panel__title">Virtual Paper Account</h3>
              <button
                className="btn btn--ghost"
                onClick={resetAccount}
                title="Reset cash to $1,000.00 and clear positions"
                aria-label="Reset paper account"
              >
                ↺ Reset Account ($1k)
              </button>
            </div>

            <div className="account-metrics-grid">
              <div className="account-metric">
                <span className="account-metric__label">Available Cash</span>
                <span className="account-metric__value font-mono">
                  ${account.cash.toFixed(2)}
                </span>
              </div>

              <div className="account-metric">
                <span className="account-metric__label">Current Position</span>
                <span className="account-metric__value">
                  {account.position && account.position.contracts > 0 ? (
                    <span>
                      <strong>{account.position.contracts} YES</strong> @ ${account.position.avgEntryPrice.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-muted">No open position</span>
                  )}
                </span>
              </div>

              <div className="account-metric">
                <span className="account-metric__label">Unrealized P&L</span>
                <span
                  className={`account-metric__value font-mono ${valuation.unrealizedPnl >= 0 ? 'text-success' : 'text-danger'}`}
                >
                  {valuation.status === 'active' ? (
                    `${valuation.unrealizedPnl >= 0 ? '+' : ''}$${valuation.unrealizedPnl.toFixed(2)}`
                  ) : valuation.status === 'pending-settlement' ? (
                    'Pending Settlement'
                  ) : (
                    '—'
                  )}
                </span>
                <span className="account-metric__sub">{valuation.note}</span>
              </div>

              <div className="account-metric">
                <span className="account-metric__label">Realized P&L</span>
                <span
                  className={`account-metric__value font-mono ${account.realizedPnl >= 0 ? 'text-success' : 'text-danger'}`}
                >
                  {account.realizedPnl >= 0 ? '+' : ''}${account.realizedPnl.toFixed(2)}
                </span>
              </div>

              <div className="account-metric">
                <span className="account-metric__label">Total Taker Fees Paid</span>
                <span className="account-metric__value font-mono text-warning">
                  ${account.totalFeesPaid.toFixed(2)}
                </span>
              </div>

              <div className="account-metric">
                <span className="account-metric__label">Total Portfolio Equity</span>
                <span className="account-metric__value font-mono font-bold">
                  ${valuation.totalEquity.toFixed(2)}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Order Ticket */}
        <div className="paper-grid__right">
          <section className="order-ticket" aria-label="Paper Order Ticket">
            <h3 className="order-ticket__title">Paper Order Ticket</h3>
            <p className="order-ticket__subtitle">
              Simulated execution against live Kalshi orderbook
            </p>

            {/* Action Tabs */}
            <div className="order-ticket__tabs" role="tablist">
              <button
                type="button"
                className={`order-ticket__tab ${ticketAction === 'buy' ? 'order-ticket__tab--active' : ''}`}
                onClick={() => setTicketAction('buy')}
                role="tab"
                aria-selected={ticketAction === 'buy'}
              >
                Buy YES Contracts
              </button>
              <button
                type="button"
                className={`order-ticket__tab ${ticketAction === 'close' ? 'order-ticket__tab--active' : ''}`}
                onClick={() => {
                  setTicketAction('close');
                  if (account.position && account.position.ticker === snapshot?.ticker) {
                    setOrderQty(account.position.contracts);
                  }
                }}
                disabled={!account.position || account.position.ticker !== snapshot?.ticker}
                role="tab"
                aria-selected={ticketAction === 'close'}
                title={
                  !account.position || account.position.ticker !== snapshot?.ticker
                    ? 'No position held in this market'
                    : 'Close existing YES position'
                }
              >
                Close YES Position
              </button>
            </div>

            <form onSubmit={handleOrderSubmit} className="order-ticket__form">
              {/* Contract Target */}
              <div className="ticket-field">
                <label className="ticket-field__label">Contract</label>
                <div className="ticket-field__static font-mono">
                  {snapshot?.ticker ?? selectedTicker} (YES)
                </div>
              </div>

              {/* Quantity Input */}
              <div className="ticket-field">
                <label htmlFor="input-order-qty" className="ticket-field__label">
                  Contracts Quantity
                  <span className="ticket-field__hint">
                    {ticketAction === 'buy'
                      ? `Max ask size: ${snapshot?.bestYesAskSize ? snapshot.bestYesAskSize.toFixed(0) : '0'}`
                      : `Held: ${account.position?.contracts ?? 0} contracts`}
                  </span>
                </label>
                <div className="ticket-field__input-row">
                  <input
                    id="input-order-qty"
                    type="number"
                    min="1"
                    max={ticketAction === 'close' ? (account.position?.contracts ?? 10) : MAX_ORDER_SIZE_LIMIT}
                    step="1"
                    className="input input--number font-mono"
                    value={orderQty}
                    onChange={(e) => setOrderQty(parseInt(e.target.value) || 0)}
                    disabled={isSubmitting}
                    required
                  />
                  <div className="ticket-quick-buttons">
                    <button
                      type="button"
                      className="btn btn--timeline"
                      onClick={() => setOrderQty(1)}
                    >
                      1
                    </button>
                    <button
                      type="button"
                      className="btn btn--timeline"
                      onClick={() => setOrderQty(5)}
                    >
                      5
                    </button>
                    <button
                      type="button"
                      className="btn btn--timeline"
                      onClick={() => setOrderQty(10)}
                    >
                      10
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="ticket-summary-box">
                <div className="inspector__kv-row">
                  <span className="inspector__kv-key">Executable Price</span>
                  <span className="inspector__kv-val font-mono">
                    ${validation.unitPrice.toFixed(2)} ({ticketAction === 'buy' ? 'Best Ask' : 'Best Bid'})
                  </span>
                </div>
                <div className="inspector__kv-row">
                  <span className="inspector__kv-key">Contract Gross</span>
                  <span className="inspector__kv-val font-mono">
                    ${validation.grossAmount.toFixed(2)}
                  </span>
                </div>
                <div className="inspector__kv-row">
                  <span className="inspector__kv-key">Kalshi Taker Fee</span>
                  <span className="inspector__kv-val font-mono text-warning">
                    +${validation.estimatedFee.toFixed(2)} (0.07 × C × P × (1-P))
                  </span>
                </div>
                <div className="inspector__kv-row font-bold" style={{ borderTop: '1px solid var(--border-default)' }}>
                  <span className="inspector__kv-key">{ticketAction === 'buy' ? 'Total Cash Debit' : 'Net Proceeds Credit'}</span>
                  <span className="inspector__kv-val font-mono">
                    ${validation.netTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Risk Pre-Check Indicator */}
              <div className={`ticket-risk-gate ${validation.canExecute ? 'ticket-risk-gate--pass' : 'ticket-risk-gate--fail'}`}>
                <div className="ticket-risk-gate__header">
                  <span>🛡 Risk Engine Pre-Check</span>
                  <span>{validation.canExecute ? '✓ Ready' : '✗ Blocked'}</span>
                </div>
                {!validation.canExecute && (
                  <p className="ticket-risk-gate__reason">{validation.reason}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                id="btn-submit-paper-order"
                type="submit"
                className={`btn ${ticketAction === 'buy' ? 'btn--primary' : 'btn--warning'} btn--full`}
                disabled={!validation.canExecute || isSubmitting}
                aria-label={`Submit simulated ${ticketAction} order`}
              >
                {isSubmitting
                  ? 'Submitting…'
                  : ticketAction === 'buy'
                    ? `Simulate Buy ${orderQty} YES ($${validation.netTotal.toFixed(2)})`
                    : `Simulate Close ${orderQty} YES (+$${validation.netTotal.toFixed(2)})`}
              </button>

              {feedbackMessage && (
                <div className={`paper-feedback paper-feedback--${feedbackMessage.type}`} role="alert">
                  {feedbackMessage.text}
                </div>
              )}
            </form>
          </section>
        </div>
      </div>

      {/* ── 4. Transaction History & Trace Linkage ─────────────────────────── */}
      <section className="paper-history-panel" aria-label="Transaction history">
        <div className="paper-history-panel__header">
          <h3 className="paper-history-panel__title">Simulated Transaction History</h3>
          <span className="paper-history-panel__count">{orders.length} transaction(s)</span>
        </div>

        {orders.length === 0 ? (
          <div className="paper-history-panel__empty">
            No paper transactions recorded yet. Execute a buy order above to start testing.
          </div>
        ) : (
          <div className="paper-table-container">
            <table className="paper-table" role="table">
              <thead>
                <tr>
                  <th>Placed At</th>
                  <th>Origin</th>
                  <th>Action</th>
                  <th>Qty</th>
                  <th>Exec Price</th>
                  <th>Taker Fee</th>
                  <th>Net Total</th>
                  <th>Status</th>
                  <th>Decision Trace</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.orderId}>
                    <td className="font-mono text-muted">
                      {new Date(o.placedAt).toLocaleTimeString()}
                    </td>
                    <td>
                      <span className="origin-badge origin-badge--user">
                        {o.origin}
                      </span>
                    </td>
                    <td>
                      <span className={`side-badge side-badge--${o.side}`}>
                        {o.side === 'buy' ? 'BUY YES' : 'CLOSE YES'}
                      </span>
                    </td>
                    <td className="font-mono">{o.qty}</td>
                    <td className="font-mono">${o.price.toFixed(2)}</td>
                    <td className="font-mono text-warning">${o.fee.toFixed(2)}</td>
                    <td className="font-mono font-bold">${o.totalAmount.toFixed(2)}</td>
                    <td>
                      <span className={`status-pill status-pill--${o.status}`}>
                        {o.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn--timeline"
                        onClick={() => onInspectDecision(o.runId)}
                        title={`Inspect decision trace for ${o.orderId} in Agent Lab`}
                        aria-label={`Inspect decision for order ${o.orderId}`}
                      >
                        🔍 Inspect Decision
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
});

export default PaperTradingWorkspace;
