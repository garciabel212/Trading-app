/* Trading App — Dashboard JS */

const BASE = '/api/v1';
let currentTicker = 'AAPL';
let orderSide = 'BUY';
let candleData = [];
let animFrame = null;

// ─── Ticker select ────────────────────────────────────────────────────────────
document.getElementById('ticker-select').addEventListener('change', (e) => {
  currentTicker = e.target.value;
  loadCandles();
  loadQuote();
});

// ─── Quote polling ────────────────────────────────────────────────────────────
async function loadQuote() {
  try {
    const r = await fetch(`${BASE}/market/quote/${currentTicker}`);
    if (!r.ok) return;
    const q = await r.json();
    document.getElementById('live-price').textContent = `$${q.price.toFixed(2)}`;
    const chEl = document.getElementById('price-change');
    const sign = q.change >= 0 ? '+' : '';
    chEl.textContent = `${sign}${q.change.toFixed(2)} (${sign}${q.change_pct.toFixed(2)}%)`;
    chEl.style.color = q.change >= 0 ? 'var(--green)' : 'var(--red)';
  } catch (_) {}
}

setInterval(loadQuote, 5000);
loadQuote();

// ─── Candle chart (minimal canvas renderer) ───────────────────────────────────
async function loadCandles() {
  try {
    const r = await fetch(`${BASE}/market/candles/${currentTicker}?bars=80&interval_minutes=60`);
    if (!r.ok) return;
    candleData = await r.json();
    drawChart();
  } catch (_) {}
}

function drawChart() {
  const canvas = document.getElementById('chart');
  const dpr = window.devicePixelRatio || 1;
  const container = canvas.parentElement;
  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
  canvas.style.width = container.clientWidth + 'px';
  canvas.style.height = container.clientHeight + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const W = container.clientWidth;
  const H = container.clientHeight;
  const padL = 8, padR = 55, padT = 12, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  ctx.clearRect(0, 0, W, H);

  if (!candleData.length) return;

  const highs = candleData.map(c => c.high);
  const lows = candleData.map(c => c.low);
  const maxP = Math.max(...highs);
  const minP = Math.min(...lows);
  const priceRange = maxP - minP || 1;

  const toY = (p) => padT + chartH - ((p - minP) / priceRange) * chartH;

  const candleW = Math.max(2, (chartW / candleData.length) - 1);
  const step = chartW / candleData.length;

  // Grid lines
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    const price = maxP - (priceRange / 4) * i;
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('$' + price.toFixed(2), W - padR + 4, y + 4);
  }

  // Draw candles
  candleData.forEach((c, i) => {
    const x = padL + i * step + step / 2;
    const bull = c.close >= c.open;
    const color = bull ? '#3fb950' : '#f85149';

    // Wick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, toY(c.high));
    ctx.lineTo(x, toY(c.low));
    ctx.stroke();

    // Body
    const bodyTop = toY(Math.max(c.open, c.close));
    const bodyH = Math.max(1, Math.abs(toY(c.open) - toY(c.close)));
    ctx.fillStyle = color;
    ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
  });

  // X-axis labels (every ~20 candles)
  ctx.fillStyle = '#8b949e';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  const step20 = Math.max(1, Math.floor(candleData.length / 5));
  candleData.forEach((c, i) => {
    if (i % step20 === 0) {
      const x = padL + i * step + step / 2;
      const d = new Date(c.timestamp + 'Z');
      ctx.fillText(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), x, H - 8);
    }
  });
}

window.addEventListener('resize', drawChart);
loadCandles();
setInterval(loadCandles, 30000);

// ─── Portfolio ────────────────────────────────────────────────────────────────
async function loadPortfolio() {
  try {
    const r = await fetch(`${BASE}/portfolio`);
    if (!r.ok) return;
    const p = await r.json();
    setMetric('m-equity', p.total_equity, true);
    setMetric('m-cash', p.cash, true);
    setMetric('m-upnl', p.total_unrealized_pnl, true, true);
    setMetric('m-rpnl', p.realized_pnl, true, true);
    renderPositions(p.positions);
  } catch (_) {}
}

function setMetric(id, val, currency = false, signed = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const formatted = currency ? '$' + Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val;
  el.textContent = (signed && val < 0 ? '-' : (signed && val > 0 ? '+' : '')) + formatted;
  if (signed) el.style.color = val >= 0 ? 'var(--green)' : 'var(--red)';
}

function renderPositions(positions) {
  const tbody = document.getElementById('positions-body');
  const entries = Object.values(positions || {});
  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--muted);text-align:center">No open positions</td></tr>';
    return;
  }
  tbody.innerHTML = entries.map(p => {
    const upnl = p.unrealized_pnl || ((p.current_price - p.avg_entry_price) * p.quantity);
    const cls = upnl >= 0 ? 'pos' : 'neg';
    const sign = upnl >= 0 ? '+' : '';
    return `<tr>
      <td><strong>${p.ticker}</strong></td>
      <td>${p.quantity.toFixed(2)}</td>
      <td>$${p.avg_entry_price.toFixed(2)}</td>
      <td>$${p.current_price.toFixed(2)}</td>
      <td>$${(p.quantity * p.current_price).toFixed(2)}</td>
      <td class="${cls}">${sign}$${Math.abs(upnl).toFixed(2)}</td>
    </tr>`;
  }).join('');
}

setInterval(loadPortfolio, 5000);
loadPortfolio();

// ─── Orders ───────────────────────────────────────────────────────────────────
async function loadOrders() {
  try {
    const r = await fetch(`${BASE}/orders`);
    if (!r.ok) return;
    const orders = await r.json();
    const tbody = document.getElementById('orders-body');
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted);text-align:center">No orders yet</td></tr>';
      return;
    }
    // Show last 10 orders, newest first
    tbody.innerHTML = [...orders].reverse().slice(0, 10).map(o => {
      const cls = o.side === 'BUY' ? 'pos' : 'neg';
      const price = o.filled_avg_price ? '$' + o.filled_avg_price.toFixed(2) : '—';
      const statusColor = o.status === 'FILLED' ? 'var(--green)' : o.status === 'REJECTED' ? 'var(--red)' : 'var(--yellow)';
      return `<tr>
        <td class="${cls}">${o.side}</td>
        <td>${o.ticker}</td>
        <td>${o.quantity}</td>
        <td>${price}</td>
        <td style="color:${statusColor}">${o.status}</td>
      </tr>`;
    }).join('');
  } catch (_) {}
}

setInterval(loadOrders, 5000);
loadOrders();

// ─── Order form ───────────────────────────────────────────────────────────────
function setOrderSide(side) {
  orderSide = side;
  document.getElementById('tab-buy').classList.toggle('active', side === 'BUY');
  document.getElementById('tab-sell').classList.toggle('active', side === 'SELL');
  const btn = document.getElementById('order-btn');
  btn.className = `btn-place ${side.toLowerCase()}`;
  btn.textContent = `Place ${side}`;
}

function onOrderTypeChange() {
  const type = document.getElementById('order-type').value;
  document.getElementById('limit-group').style.display = type === 'LIMIT' ? 'block' : 'none';
  document.getElementById('stop-group').style.display = type === 'STOP' ? 'block' : 'none';
}

async function placeOrder() {
  const msg = document.getElementById('order-msg');
  const qty = parseFloat(document.getElementById('order-qty').value);
  const type = document.getElementById('order-type').value;
  const limitPrice = parseFloat(document.getElementById('order-limit').value) || null;
  const stopPrice = parseFloat(document.getElementById('order-stop').value) || null;

  if (!qty || qty <= 0) { msg.textContent = 'Enter a valid quantity.'; msg.className = 'err'; return; }

  const body = { ticker: currentTicker, side: orderSide, order_type: type, quantity: qty, limit_price: limitPrice, stop_price: stopPrice };

  try {
    const r = await fetch(`${BASE}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const order = await r.json();
    if (r.ok) {
      msg.textContent = `✓ Order ${order.status}: ${order.filled_quantity} @ $${order.filled_avg_price?.toFixed(2) || '—'}`;
      msg.className = 'ok';
      loadPortfolio();
      loadOrders();
    } else {
      msg.textContent = order.detail || 'Order failed.';
      msg.className = 'err';
    }
  } catch (e) {
    msg.textContent = 'Network error.';
    msg.className = 'err';
  }
}

// ─── Backtest ─────────────────────────────────────────────────────────────────
async function runBacktest() {
  const strategy = document.getElementById('bt-strategy').value;
  const bars = parseInt(document.getElementById('bt-bars').value);
  const short = parseInt(document.getElementById('bt-short').value);
  const long_ = parseInt(document.getElementById('bt-long').value);

  const body = {
    ticker: currentTicker,
    strategy,
    bars,
    short_window: strategy === 'sma_cross' ? short : undefined,
    long_window: strategy === 'sma_cross' ? long_ : undefined,
    rsi_period: strategy === 'rsi' ? short : undefined,
    rsi_overbought: strategy === 'rsi' ? long_ : undefined,
  };

  try {
    const r = await fetch(`${BASE}/backtest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { alert('Backtest failed: ' + (await r.json()).detail); return; }
    const res = await r.json();
    renderBacktestResults(res);
  } catch (e) { alert('Network error.'); }
}

function renderBacktestResults(res) {
  const container = document.getElementById('bt-results');
  container.style.display = 'block';
  const retColor = res.total_return_pct >= 0 ? 'var(--green)' : 'var(--red)';
  document.getElementById('bt-metrics').innerHTML = [
    { label: 'Strategy', value: res.strategy_name },
    { label: 'Total Return', value: `${res.total_return_pct >= 0 ? '+' : ''}${res.total_return_pct.toFixed(2)}%`, color: retColor },
    { label: 'Ann. Return', value: `${res.annualized_return_pct >= 0 ? '+' : ''}${res.annualized_return_pct.toFixed(2)}%` },
    { label: 'Sharpe Ratio', value: res.sharpe_ratio.toFixed(3) },
    { label: 'Max Drawdown', value: `-${res.max_drawdown_pct.toFixed(2)}%`, color: 'var(--red)' },
    { label: 'Total Trades', value: res.total_trades },
    { label: 'Winning', value: res.winning_trades, color: 'var(--green)' },
    { label: 'Losing', value: res.losing_trades, color: 'var(--red)' },
  ].map(m => `
    <div class="bt-metric">
      <div class="label">${m.label}</div>
      <div class="value" style="color:${m.color || 'inherit'}">${m.value}</div>
    </div>
  `).join('');
}
