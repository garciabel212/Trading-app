// ─── Agent Trading OS — Season Store ─────────────────────────────────────────
// Manages competitive seasons, participating agents, and benchmark references.

import type { Season } from './types';
import { TRADER_ALPHA_PROFILE, TRADER_BETA_PROFILE, TRADER_GAMMA_PROFILE } from './traderProfiles';

const SEASONS_STORAGE_KEY = 'agent_trading_os_seasons_v1';

export const DEFAULT_SEASON: Season = {
  seasonId: 'season-1',
  name: 'Season 1 — Inaugural Autonomous Cup',
  startedAt: Date.now() - 86400000 * 7, // 7 days ago
  status: 'active',
  participants: [
    {
      traderId: TRADER_ALPHA_PROFILE.id,
      name: TRADER_ALPHA_PROFILE.name,
      role: 'alpha',
      initialBankroll: 10000,
      strategyStyle: 'Momentum / Market Microstructure',
      activeVersion: 'v1.4.2',
      enabled: true,
    },
    {
      traderId: TRADER_BETA_PROFILE.id,
      name: TRADER_BETA_PROFILE.name,
      role: 'beta',
      initialBankroll: 10000,
      strategyStyle: 'Fundamental Probability / Brier Calibration',
      activeVersion: 'v2.1.0',
      enabled: true,
    },
    {
      traderId: TRADER_GAMMA_PROFILE.id,
      name: TRADER_GAMMA_PROFILE.name,
      role: 'gamma',
      initialBankroll: 10000,
      strategyStyle: 'Contrarian / Sentiment Mean Reversion',
      activeVersion: 'v1.8.5',
      enabled: true,
    },
  ],
  benchmarks: {
    sp500Return: 2.1,
    cashYield: 0.1,
  },
};

let inMemorySeason: Season | null = null;

export function getCurrentSeason(): Season {
  if (inMemorySeason) return inMemorySeason;
  if (typeof window === 'undefined') return DEFAULT_SEASON;
  try {
    const raw = localStorage.getItem(SEASONS_STORAGE_KEY);
    inMemorySeason = raw ? JSON.parse(raw) : DEFAULT_SEASON;
    return inMemorySeason || DEFAULT_SEASON;
  } catch {
    return DEFAULT_SEASON;
  }
}

export function saveCurrentSeason(season: Season): void {
  inMemorySeason = season;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SEASONS_STORAGE_KEY, JSON.stringify(season));
  } catch {
    // ignore
  }
}
