// ─── Agent Trading OS — Genuine Observation Price Chart ───────────────────────
// Plots genuine collected live observations (bid, ask, last price) over time.
// Zero mocked points. Transparently displays empty, stale, or paused states.

import { memo, useMemo } from 'react';
import type { ConnectionStatus, PriceObservation } from '../paper/types';

interface PriceChartProps {
  observations: PriceObservation[];
  ticker: string;
  isStale: boolean;
  status: ConnectionStatus;
}

const PriceChart = memo(function PriceChart({
  observations,
  ticker,
  isStale,
  status,
}: PriceChartProps) {
  const width = 600;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 25, left: 45 };

  const chartData = useMemo(() => {
    if (observations.length === 0) return null;

    // Collect all valid numbers for min/max
    const allPrices: number[] = [];
    observations.forEach((o) => {
      if (o.bid !== null) allPrices.push(o.bid);
      if (o.ask !== null) allPrices.push(o.ask);
      if (o.lastPrice !== null) allPrices.push(o.lastPrice);
    });

    if (allPrices.length === 0) return null;

    const minPrice = Math.max(0, Math.min(...allPrices) - 0.04);
    const maxPrice = Math.min(1.0, Math.max(...allPrices) + 0.04);
    const priceRange = maxPrice - minPrice || 0.1;

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const minTime = observations[0].timestamp;
    const maxTime = observations[observations.length - 1].timestamp;
    const timeRange = maxTime - minTime || 1;

    const getX = (t: number) =>
      padding.left + ((t - minTime) / timeRange) * plotWidth;

    const getY = (p: number) =>
      padding.top + plotHeight - ((p - minPrice) / priceRange) * plotHeight;

    // Generate paths
    const bidPoints = observations
      .filter((o): o is typeof o & { bid: number } => o.bid !== null)
      .map((o) => ({ x: getX(o.timestamp), y: getY(o.bid), val: o.bid }));

    const askPoints = observations
      .filter((o): o is typeof o & { ask: number } => o.ask !== null)
      .map((o) => ({ x: getX(o.timestamp), y: getY(o.ask), val: o.ask }));

    const bidPath = bidPoints.reduce(
      (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`,
      '',
    );

    const askPath = askPoints.reduce(
      (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`,
      '',
    );

    // Y ticks (3 ticks)
    const yTicks = [
      minPrice,
      minPrice + priceRange / 2,
      maxPrice,
    ].map((val) => ({
      val,
      y: getY(val),
    }));

    return {
      bidPoints,
      askPoints,
      bidPath,
      askPath,
      yTicks,
      count: observations.length,
      latestBid: bidPoints[bidPoints.length - 1]?.val ?? null,
      latestAsk: askPoints[askPoints.length - 1]?.val ?? null,
    };
  }, [observations]);

  return (
    <div className="price-chart-panel" role="region" aria-label={`Price chart for ${ticker}`}>
      <div className="price-chart-panel__header">
        <div className="price-chart-panel__title-group">
          <span className="price-chart-panel__title">Observation Chart (YES Contract)</span>
          <span className="price-chart-panel__source">Genuine collected snapshots · {ticker}</span>
        </div>

        <div className="price-chart-panel__legend">
          <span className="chart-legend chart-legend--bid">
            <span className="chart-legend__dot" />
            Bid: {chartData?.latestBid !== null ? `$${chartData?.latestBid?.toFixed(2)}` : '—'}
          </span>
          <span className="chart-legend chart-legend--ask">
            <span className="chart-legend__dot" />
            Ask: {chartData?.latestAsk !== null ? `$${chartData?.latestAsk?.toFixed(2)}` : '—'}
          </span>
          {isStale && (
            <span className="badge badge--stale">Stale ({status})</span>
          )}
        </div>
      </div>

      <div className="price-chart-panel__canvas-container">
        {!chartData || chartData.count === 0 ? (
          <div className="price-chart-panel__empty">
            <span className="price-chart-panel__empty-icon">⏳</span>
            <p>Collecting real-time Kalshi observations for <code>{ticker}</code>…</p>
            <span className="price-chart-panel__empty-sub">
              (Polls every 6 seconds. No fabricated price data.)
            </span>
          </div>
        ) : (
          <svg
            className="price-chart-svg"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {/* Grid lines */}
            {chartData.yTicks.map((tick, i) => (
              <g key={i} className="chart-grid-row">
                <line
                  x1={padding.left}
                  y1={tick.y}
                  x2={width - padding.right}
                  y2={tick.y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={tick.y + 4}
                  className="chart-axis-label"
                  textAnchor="end"
                >
                  ${tick.val.toFixed(2)}
                </text>
              </g>
            ))}

            {/* Bid line & points */}
            {chartData.bidPath && (
              <path
                d={chartData.bidPath}
                fill="none"
                stroke="var(--status-success)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {chartData.bidPoints.map((pt, i) => (
              <circle
                key={`b-${i}`}
                cx={pt.x}
                cy={pt.y}
                r="3"
                fill="var(--status-success)"
              />
            ))}

            {/* Ask line & points */}
            {chartData.askPath && (
              <path
                d={chartData.askPath}
                fill="none"
                stroke="var(--status-warning)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {chartData.askPoints.map((pt, i) => (
              <circle
                key={`a-${i}`}
                cx={pt.x}
                cy={pt.y}
                r="3"
                fill="var(--status-warning)"
              />
            ))}
          </svg>
        )}
      </div>

      <div className="price-chart-panel__footer">
        <span>Observed: {observations.length} points</span>
        <span>Green = Best YES Bid · Amber = Best YES Ask</span>
      </div>
    </div>
  );
});

export default PriceChart;
