/**
 * AXIOMEngine — Der Supervisor
 *
 * Core CPN executor that orchestrates the validation workflow.
 * Implements the formal CPN execution semantics:
 *
 * 1. Find all enabled transitions (guards pass, input places have tokens)
 * 2. Select highest-priority enabled transition
 * 3. Fire it (take tokens, run action, deposit results)
 * 4. Record the transition in the audit trail
 * 5. Repeat until no transitions are enabled or max steps reached
 *
 * @module axiom/engine/AXIOMEngine
 */

import type { PlaceConfig, PlaceState } from '../types/place';
import type { TransitionConfig, TransitionContext } from '../types/transition';
import type { AetherToken } from '../types/token';
import type { AXIOMEvent } from '../events/types';
import type { ITokenStore } from '../stores/ITokenStore';
import { Place } from './Place';
import { Transition } from './Transition';
import { AXIOMEventBridge } from '../events/AXIOMEventBridge';

export interface AXIOMEngineOptions {
  tokenStore: ITokenStore;
  eventBridge: AXIOMEventBridge;
  maxSteps?: number;
}

export interface EngineState {
  stepCount: number;
  isRunning: boolean;
  isPaused: boolean;
  places: PlaceState[];
  enabledTransitions: string[];
}

export interface EngineStats {
  totalTokensProcessed: number;
  transitionsFired: number;
  averageStepDurationMs: number;
}

type EngineEventHandler = (data: unknown) => void;

export class AXIOMEngine {
  private places = new Map<string, Place>();
  private transitions = new Map<string, Transition>();
  private readonly tokenStore: ITokenStore;
  private readonly eventBridge: AXIOMEventBridge;
  private readonly maxSteps: number;
  private stepCount = 0;
  private isRunning = false;
  private isPaused = false;
  private totalTokensProcessed = 0;
  private transitionsFired = 0;
  private totalStepDurationMs = 0;

  // Local event handlers (delegates to eventBridge)
  private localHandlers = new Map<string, Set<EngineEventHandler>>();

  constructor(options: AXIOMEngineOptions) {
    this.tokenStore = options.tokenStore;
    this.eventBridge = options.eventBridge;
    this.maxSteps = options.maxSteps ?? 100;
  }

  // --- Configuration ---

  /**
   * Add a place to the CPN.
   */
  addPlace(config: PlaceConfig): void {
    if (this.places.has(config.id)) {
      throw new Error(`Place "${config.id}" already exists`);
    }
    this.places.set(config.id, new Place(config));
  }

  /**
   * Add a transition to the CPN.
   */
  addTransition(config: TransitionConfig): void {
    if (this.transitions.has(config.id)) {
      throw new Error(`Transition "${config.id}" already exists`);
    }
    // Validate that input/output places exist
    for (const placeId of config.inputPlaces) {
      if (!this.places.has(placeId)) {
        throw new Error(
          `Transition "${config.id}" references unknown input place "${placeId}"`,
        );
      }
    }
    for (const placeId of config.outputPlaces) {
      if (!this.places.has(placeId)) {
        throw new Error(
          `Transition "${config.id}" references unknown output place "${placeId}"`,
        );
      }
    }
    this.transitions.set(config.id, new Transition(config));
  }

  // --- Token Management ---

  /**
   * Add a token to a specific place.
   */
  addToken<T>(placeId: string, token: AetherToken<T>): void {
    const place = this.places.get(placeId);
    if (!place) {
      throw new Error(`Place "${placeId}" not found`);
    }
    const accepted = (place as Place<T>).push(token);
    if (!accepted) {
      throw new Error(
        `Place "${placeId}" rejected token (at capacity or wrong color)`,
      );
    }

    // Update token metadata
    token._meta.currentPlace = placeId;

    // Persist
    this.tokenStore.save(token).catch((err) => {
      console.error('[AXIOM] Failed to persist token:', err);
    });

    this.totalTokensProcessed++;

    this.emitEvent({
      type: 'token:created',
      timestamp: new Date().toISOString(),
      data: {
        tokenId: token._meta.id,
        correlationId: token._meta.correlationId,
        color: token.color,
        placeId,
      },
    });
  }

  /**
   * Get all tokens in a specific place.
   */
  getTokensInPlace(placeId: string): AetherToken[] {
    const place = this.places.get(placeId);
    if (!place) {
      return [];
    }
    return place.pull();
  }

  /**
   * Find a token by its ID across all places.
   */
  findToken(tokenId: string): AetherToken | undefined {
    for (const place of this.places.values()) {
      const tokens = place.pull();
      const found = tokens.find((t) => t._meta.id === tokenId);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  // --- Execution Control ---

  /**
   * Execute exactly one step: find and fire the highest-priority enabled transition.
   * Returns true if a transition was fired, false if none were enabled.
   */
  async step(): Promise<boolean> {
    const stepStart = performance.now();
    const context = this.createContext();

    // Find enabled transitions
    const enabled = this.getEnabledTransitions();

    if (enabled.length === 0) {
      this.emitEvent({
        type: 'engine:step',
        timestamp: context.timestamp,
        data: {
          stepNumber: this.stepCount,
          transitionFired: null,
          enabledTransitions: [],
        },
      });
      return false;
    }

    // Select highest priority
    const selected = enabled[0];
    const reason = `Step ${this.stepCount}: highest priority enabled transition`;

    // Gather input and output places
    const inputPlaces = new Map<string, Place>();
    for (const placeId of selected.inputPlaceIds) {
      const place = this.places.get(placeId);
      if (place) inputPlaces.set(placeId, place);
    }

    const outputPlaces = new Map<string, Place>();
    for (const placeId of selected.outputPlaceIds) {
      const place = this.places.get(placeId);
      if (place) outputPlaces.set(placeId, place);
    }

    // Fire
    const record = await selected.fire(inputPlaces, outputPlaces, context, reason);

    this.stepCount++;
    this.transitionsFired++;
    this.totalStepDurationMs += performance.now() - stepStart;

    this.emitEvent({
      type: 'transition:fired',
      timestamp: context.timestamp,
      data: {
        transitionId: record.transitionId,
        inputTokenIds: [],
        outputTokenIds: [],
        reason: record.reason,
        durationMs: record.durationMs,
      },
    });

    this.emitEvent({
      type: 'engine:step',
      timestamp: context.timestamp,
      data: {
        stepNumber: this.stepCount,
        transitionFired: selected.id,
        enabledTransitions: enabled.map((t) => t.id),
      },
    });

    return true;
  }

  /**
   * Run the engine until no transitions are enabled or max steps reached.
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.isPaused = false;

    this.emitEvent({
      type: 'engine:started',
      timestamp: new Date().toISOString(),
      data: { maxSteps: this.maxSteps },
    });

    while (this.isRunning && !this.isPaused) {
      // Safety: max steps limit
      if (this.stepCount >= this.maxSteps) {
        this.emitEvent({
          type: 'engine:maxSteps',
          timestamp: new Date().toISOString(),
          data: { maxSteps: this.maxSteps, stepCount: this.stepCount },
        });
        break;
      }

      const fired = await this.step();
      if (!fired) {
        break;
      }
    }

    this.isRunning = false;

    this.emitEvent({
      type: 'engine:stopped',
      timestamp: new Date().toISOString(),
      data: { stepCount: this.stepCount, reason: 'completed' },
    });
  }

  /**
   * Pause execution. Can be resumed with resume().
   */
  pause(): void {
    if (!this.isRunning) return;
    this.isPaused = true;

    this.emitEvent({
      type: 'engine:paused',
      timestamp: new Date().toISOString(),
      data: { stepCount: this.stepCount },
    });
  }

  /**
   * Resume a paused engine.
   */
  async resume(): Promise<void> {
    if (!this.isPaused) return;
    this.isPaused = false;

    this.emitEvent({
      type: 'engine:resumed',
      timestamp: new Date().toISOString(),
      data: { stepCount: this.stepCount },
    });

    await this.run();
  }

  /**
   * Reset the engine: clear all tokens, reset step count.
   */
  reset(): void {
    for (const place of this.places.values()) {
      place.clear();
    }
    this.stepCount = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.totalTokensProcessed = 0;
    this.transitionsFired = 0;
    this.totalStepDurationMs = 0;
  }

  // --- State Queries ---

  /**
   * Get all enabled transitions, sorted by priority (highest first).
   */
  getEnabledTransitions(): Transition[] {
    const context = this.createContext();
    const enabled: Transition[] = [];

    for (const transition of this.transitions.values()) {
      if (transition.isEnabled(this.places as Map<string, Place>, context)) {
        enabled.push(transition);
      }
    }

    // Sort by priority, highest first
    enabled.sort((a, b) => b.priority - a.priority);
    return enabled;
  }

  /**
   * Get the state of all places.
   */
  getPlaces(): PlaceState[] {
    const result: PlaceState[] = [];
    for (const place of this.places.values()) {
      result.push(place.state);
    }
    return result;
  }

  /**
   * Get a specific place by ID.
   */
  getPlace(placeId: string): Place | undefined {
    return this.places.get(placeId);
  }

  /**
   * Current engine state snapshot.
   */
  get state(): EngineState {
    return {
      stepCount: this.stepCount,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      places: this.getPlaces(),
      enabledTransitions: this.getEnabledTransitions().map((t) => t.id),
    };
  }

  /**
   * Engine statistics.
   */
  get stats(): EngineStats {
    return {
      totalTokensProcessed: this.totalTokensProcessed,
      transitionsFired: this.transitionsFired,
      averageStepDurationMs:
        this.transitionsFired > 0
          ? this.totalStepDurationMs / this.transitionsFired
          : 0,
    };
  }

  /**
   * Whether the engine is currently running.
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Whether the engine is currently paused.
   */
  get paused(): boolean {
    return this.isPaused;
  }

  /**
   * Current step count.
   */
  get steps(): number {
    return this.stepCount;
  }

  // --- Events ---

  /**
   * Register an event handler.
   */
  on(event: string, handler: EngineEventHandler): void {
    let handlers = this.localHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.localHandlers.set(event, handlers);
    }
    handlers.add(handler);
  }

  /**
   * Remove an event handler.
   */
  off(event: string, handler: EngineEventHandler): void {
    const handlers = this.localHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  // --- Private ---

  private createContext(): TransitionContext {
    return {
      engine: this,
      timestamp: new Date().toISOString(),
      stepNumber: this.stepCount,
    };
  }

  private emitEvent(event: AXIOMEvent): void {
    // Route through the event bridge
    this.eventBridge.emit(event);

    // Also dispatch to local handlers
    const handlers = this.localHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event.data);
        } catch (err) {
          console.error(`[AXIOM] Local handler error for ${event.type}:`, err);
        }
      }
    }
  }
}
