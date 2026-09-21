// ─── Agent Trading OS — Competitor Portfolio Store ───────────────────────────
// Manages independent virtual portfolios for Trader Alpha, Beta, Gamma, and Manager.
// Persists balances, positions, structured theses, proposals, and no-trade records.

import type {
  CompetitorRole,
  NoTradeDecision,
  PositionThesis,
  TradeProposal,
  TraderPortfolio,
  MarketCategory,
} from './types';
import { INITIAL_BANKROLLS, getCompetitorProfile } from './traderProfiles';

const PORTFOLIOS_STORAGE_KEY = 'agent_trading_os_competitor_portfolios_v1';

function getInitialPortfolio(role: CompetitorRole): TraderPortfolio {
  const profile = getCompetitorProfile(role);
  const initialCash = INITIAL_BANKROLLS[role] || 10000;
  return {
    traderId: profile.id,
    traderName: profile.name,
    role,
    initialCash,
    cash: initialCash,
    equity: initialCash,
    realizedPnL: 0,
    unrealizedPnL: 0,
    peakEquity: initialCash,
    maxDrawdown: 0,
    maxDrawdownPct: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    noTradeCount: 0,
    positions: {},
    theses: {},
    recentProposals: [],
    recentNoTrades: [],
    updatedAt: Date.now(),
  };
}

let inMemoryPortfolios: Record<string, TraderPortfolio> | null = null;

export function loadAllPortfolios(): Record<string, TraderPortfolio> {
  if (inMemoryPortfolios) return inMemoryPortfolios;
  const initial: Record<string, TraderPortfolio> = {
    alpha: getInitialPortfolio('alpha'),
    beta: getInitialPortfolio('beta'),
    gamma: getInitialPortfolio('gamma'),
    manager: getInitialPortfolio('manager'),
  };

  if (typeof window === 'undefined') {
    inMemoryPortfolios = initial;
    return initial;
  }

  try {
    const raw = localStorage.getItem(PORTFOLIOS_STORAGE_KEY);
    if (!raw) {
      inMemoryPortfolios = initial;
      return initial;
    }
    const parsed = JSON.parse(raw) as Record<string, TraderPortfolio>;
    inMemoryPortfolios = { ...initial, ...parsed };
    return inMemoryPortfolios;
  } catch {
    inMemoryPortfolios = initial;
    return initial;
  }
}

export function saveAllPortfolios(portfolios: Record<string, TraderPortfolio>): void {
  inMemoryPortfolios = { ...portfolios };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(portfolios));
  } catch {
    // ignore quota
  }
}

export function loadTraderPortfolio(roleOrId: CompetitorRole | string): TraderPortfolio {
  const portfolios = loadAllPortfolios();
  const normalizedKey = roleOrId.replace('trader-', '') as CompetitorRole;
  if (portfolios[normalizedKey]) {
    return portfolios[normalizedKey];
  }
  if (portfolios[roleOrId]) {
    return portfolios[roleOrId];
  }
  const fresh = getInitialPortfolio(normalizedKey in INITIAL_BANKROLLS ? normalizedKey : 'alpha');
  portfolios[normalizedKey] = fresh;
  saveAllPortfolios(portfolios);
  return fresh;
}

export function saveTraderPortfolio(portfolio: TraderPortfolio): void {
  const portfolios = loadAllPortfolios();
  const key = portfolio.role || portfolio.traderId.replace('trader-', '');
  portfolios[key] = portfolio;
  saveAllPortfolios(portfolios);
}

export function recordProposal(proposal: TradeProposal): void {
  const portfolio = loadTraderPortfolio(proposal.traderId as CompetitorRole);
  portfolio.recentProposals = [proposal, ...portfolio.recentProposals.slice(0, 49)];
  portfolio.updatedAt = Date.now();
  saveTraderPortfolio(portfolio);
}

export function recordNoTrade(decision: NoTradeDecision): void {
  const portfolio = loadTraderPortfolio(decision.traderId as CompetitorRole);
  portfolio.recentNoTrades = [decision, ...portfolio.recentNoTrades.slice(0, 49)];
  portfolio.noTradeCount = (portfolio.noTradeCount || 0) + 1;
  portfolio.updatedAt = Date.now();
  saveTraderPortfolio(portfolio);
}

export function recordExecution(
  roleOrId: CompetitorRole | string,
  ticker: string,
  side: 'yes' | 'no' | 'buy' | 'sell',
  contracts: number,
  price: number,
  fee: number,
  category: MarketCategory = 'macro',
  thesisNotes: string = 'Automated execution'
): TraderPortfolio {
  const portfolio = loadTraderPortfolio(roleOrId);
  const now = Date.now();
  const cost = Number((contracts * price).toFixed(2));
  const totalCost = Number((cost + fee).toFixed(2));

  if (side === 'buy' || side === 'yes') {
    portfolio.cash = Number((portfolio.cash - totalCost).toFixed(2));
    const existing = portfolio.positions[ticker];
    if (existing) {
      const combinedContracts = existing.contracts + contracts;
      const combinedBasis = Number((existing.averageEntryPrice * existing.contracts + cost).toFixed(2));
      const avgPrice = Number((combinedBasis / combinedContracts).toFixed(2));
      portfolio.positions[ticker] = {
        ...existing,
        contracts: combinedContracts,
        averageEntryPrice: avgPrice,
        currentPrice: price,
        unrealizedPnL: Number(((price - avgPrice) * combinedContracts).toFixed(2)),
      };
    } else {
      const positionThesis: PositionThesis = {
        positionId: `thesis-${ticker}-${now}`,
        ticker,
        traderId: portfolio.traderId,
        initialThesis: thesisNotes,
        invalidationCriteria: ['Adverse move > 15%', 'Catalyst disconfirmed'],
        currentStatus: 'intact',
        lastReassessed: now,
        notes: thesisNotes,
      };
      portfolio.positions[ticker] = {
        ticker,
        side,
        contracts,
        averageEntryPrice: price,
        currentPrice: price,
        marketCategory: category,
        openedAt: now,
        unrealizedPnL: 0,
        thesis: positionThesis,
      };
      portfolio.theses[ticker] = positionThesis;
    }
    portfolio.totalTrades += 1;
  } else {
    // sell or exit
    const existing = portfolio.positions[ticker];
    if (existing) {
      const gross = Number((contracts * price).toFixed(2));
      const net = Number((gross - fee).toFixed(2));
      const basis = Number((existing.averageEntryPrice * contracts).toFixed(2));
      const pnl = Number((net - basis).toFixed(2));

      portfolio.cash = Number((portfolio.cash + net).toFixed(2));
      portfolio.realizedPnL = Number((portfolio.realizedPnL + pnl).toFixed(2));
      portfolio.totalTrades += 1;
      if (pnl >= 0) portfolio.winningTrades += 1;
      else portfolio.losingTrades += 1;

      if (contracts >= existing.contracts) {
        delete portfolio.positions[ticker];
        if (portfolio.theses[ticker]) {
          portfolio.theses[ticker].currentStatus = 'invalidated';
        }
      } else {
        const remaining = existing.contracts - contracts;
        portfolio.positions[ticker] = {
          ...existing,
          contracts: remaining,
          currentPrice: price,
          unrealizedPnL: Number(((price - existing.averageEntryPrice) * remaining).toFixed(2)),
        };
      }
    }
  }

  // Recalculate equity & drawdown
  let positionsValue = 0;
  for (const pos of Object.values(portfolio.positions)) {
    positionsValue += Number((pos.contracts * pos.currentPrice).toFixed(2));
  }
  portfolio.equity = Number((portfolio.cash + positionsValue).toFixed(2));
  if (portfolio.equity > portfolio.peakEquity) {
    portfolio.peakEquity = portfolio.equity;
  }
  portfolio.maxDrawdown = Math.max(
    portfolio.maxDrawdown,
    Number((portfolio.peakEquity - portfolio.equity).toFixed(2))
  );
  portfolio.maxDrawdownPct =
    portfolio.peakEquity > 0
      ? Number(((portfolio.maxDrawdown / portfolio.peakEquity) * 100).toFixed(2))
      : 0;
  portfolio.updatedAt = now;

  saveTraderPortfolio(portfolio);
  return portfolio;
}

export function resetAllPortfolios(): Record<string, TraderPortfolio> {
  inMemoryPortfolios = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PORTFOLIOS_STORAGE_KEY);
  }
  return loadAllPortfolios();
}
