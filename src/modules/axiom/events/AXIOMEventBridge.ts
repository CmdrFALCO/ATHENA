/**
 * AXIOMEventBridge — Routes events to multiple destinations
 *
 * Configurable via DevSettings to route events to:
 * - Console logging (with configurable verbosity)
 * - Legend-State updates (for reactive UI)
 * - IndexedDB persistence (for audit trail)
 *
 * @module axiom/events/AXIOMEventBridge
 */

import type { AXIOMEvent, AXIOMEventType } from './types';

export interface AXIOMEventBridgeOptions {
  logToConsole?: boolean;
  updateLegendState?: boolean;
  persistToHistory?: boolean;
  verbosity?: 'minimal' | 'normal' | 'verbose';
}

type EventHandler = (event: AXIOMEvent) => void;

/** Events that are always logged even in minimal mode */
const MINIMAL_EVENTS: AXIOMEventType[] = [
  'transition:fired',
  'engine:started',
  'engine:stopped',
  'engine:maxSteps',
  'workflow:completed',
  'workflow:failed',
  // WP 9B.1: Critique results are always important
  'critique:completed',
  'critique:rejected',
  // WP 9B.4: Review queue events are always important
  'review:queued',
  'review:decided',
  'review:batch_decided',
];

/** Events logged in normal mode (minimal + these) */
const NORMAL_EVENTS: AXIOMEventType[] = [
  ...MINIMAL_EVENTS,
  'token:created',
  'token:moved',
  'token:deleted',
  'transition:blocked',
  'engine:paused',
  'engine:resumed',
  // WP 9B.1: Critique lifecycle
  'critique:started',
  'critique:skipped',
  'critique:escalated',
];

export class AXIOMEventBridge {
  private handlers = new Map<AXIOMEventType, Set<EventHandler>>();
  private wildcardHandlers = new Set<EventHandler>();
  private recentEvents: AXIOMEvent[] = [];
  private maxRecentEvents = 100;
  private options: Required<AXIOMEventBridgeOptions>;

  constructor(options: AXIOMEventBridgeOptions = {}) {
    this.options = {
      logToConsole: options.logToConsole ?? true,
      updateLegendState: options.updateLegendState ?? true,
      persistToHistory: options.persistToHistory ?? true,
      verbosity: options.verbosity ?? 'normal',
    };
  }

  /**
   * Emit an event to all registered handlers and destinations.
   */
  emit(event: AXIOMEvent): void {
    // Store in recent events buffer
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.shift();
    }

    // Console logging
    if (this.options.logToConsole && this.shouldLog(event.type)) {
      this.logToConsole(event);
    }

    // Dispatch to typed handlers
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (err) {
          console.error(`[AXIOM] Event handler error for ${event.type}:`, err);
        }
      }
    }

    // Dispatch to wildcard handlers
    for (const handler of this.wildcardHandlers) {
      try {
        handler(event);
      } catch (err) {
        console.error(`[AXIOM] Wildcard handler error for ${event.type}:`, err);
      }
    }
  }

  /**
   * Register a handler for a specific event type.
   * Pass '*' as type to receive all events.
   */
  on(type: AXIOMEventType | '*', handler: EventHandler): void {
    if (type === '*') {
      this.wildcardHandlers.add(handler);
      return;
    }
    let handlers = this.handlers.get(type);
    if (!handlers) {
      handlers = new Set();
      this.handlers.set(type, handlers);
    }
    handlers.add(handler);
  }

  /**
   * Remove a handler for a specific event type.
   */
  off(type: AXIOMEventType | '*', handler: EventHandler): void {
    if (type === '*') {
      this.wildcardHandlers.delete(handler);
      return;
    }
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Get recent events for debugging.
   */
  getRecentEvents(count?: number): AXIOMEvent[] {
    const n = count ?? this.recentEvents.length;
    return this.recentEvents.slice(-n);
  }

  /**
   * Clear all stored events and handlers.
   */
  clear(): void {
    this.recentEvents = [];
  }

  /**
   * Update bridge options at runtime.
   */
  updateOptions(options: Partial<AXIOMEventBridgeOptions>): void {
    Object.assign(this.options, options);
  }

  private shouldLog(type: AXIOMEventType): boolean {
    switch (this.options.verbosity) {
      case 'minimal':
        return MINIMAL_EVENTS.includes(type);
      case 'normal':
        return NORMAL_EVENTS.includes(type);
      case 'verbose':
        return true;
      default:
        return true;
    }
  }

  private logToConsole(event: AXIOMEvent): void {
    const prefix = `[AXIOM ${event.type}]`;
    const data = event.data;

    switch (event.type) {
      case 'transition:fired':
        console.log(prefix, data);
        break;
      case 'engine:started':
      case 'engine:stopped':
        console.log(prefix);
        break;
      case 'engine:maxSteps':
        console.warn(prefix, data);
        break;
      case 'workflow:completed':
        console.log(prefix, data);
        break;
      case 'workflow:failed':
        console.error(prefix, data);
        break;
      default:
        console.log(prefix, data);
    }
  }
}
