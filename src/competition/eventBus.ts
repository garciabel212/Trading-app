// ─── Agent Trading OS — Competition Event Bus ────────────────────────────────
// Typed publish/subscribe event bus connecting execution events to the visual graph.

import type { SystemEvent } from './types';

type EventListener = (event: SystemEvent) => void;

class CompetitionEventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private history: SystemEvent[] = [];
  private maxHistory: number = 100;

  public subscribe(type: string | '*', callback: EventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  public emit(event: SystemEvent): void {
    this.history.unshift(event);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    // Specific listeners
    const specific = this.listeners.get(event.type);
    if (specific) {
      specific.forEach((cb) => {
        try {
          cb(event);
        } catch (err) {
          console.error('[EventBus listener error]', err);
        }
      });
    }

    // Wildcard listeners
    const wildcard = this.listeners.get('*');
    if (wildcard) {
      wildcard.forEach((cb) => {
        try {
          cb(event);
        } catch (err) {
          console.error('[EventBus wildcard listener error]', err);
        }
      });
    }
  }

  public getRecentEvents(): SystemEvent[] {
    return [...this.history];
  }

  public clear(): void {
    this.history = [];
  }
}

export const eventBus = new CompetitionEventBus();
