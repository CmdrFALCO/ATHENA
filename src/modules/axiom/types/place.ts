/**
 * Place type definitions for the CPN
 *
 * Places are containers that hold tokens. Each place has a configuration
 * (static) and a runtime state (dynamic).
 *
 * @module axiom/types/place
 */

import type { AetherToken } from './token';
import type { TokenColor } from './colorSets';

/**
 * PlaceConfig — Static configuration for a CPN place
 */
export interface PlaceConfig {
  /** Unique place identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Optional description of what this place represents */
  description?: string;

  /** Maximum tokens allowed (undefined = unlimited) */
  capacity?: number;

  /** Terminal place — tokens enter but don't leave (committed, rejected) */
  isSink?: boolean;

  /** Entry place — where tokens first enter the CPN */
  isSource?: boolean;

  /** Which token colors this place accepts */
  acceptedColors: TokenColor[];
}

/**
 * PlaceState — Runtime state of a place (snapshot)
 */
export interface PlaceState<T = unknown> {
  config: PlaceConfig;
  tokens: AetherToken<T>[];
  tokenCount: number;
}
