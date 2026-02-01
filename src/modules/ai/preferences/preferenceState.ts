/**
 * Preference State - Legend-State observable for preference learning
 * WP 8.4 - Preference Learning
 */

import { observable } from '@legendapp/state';
import type { PreferenceStats } from './types';

export interface PreferenceState {
  /** Cached statistics (refreshed periodically) */
  stats: PreferenceStats | null;
  /** Whether stats are loading */
  loading: boolean;
  /** Last error message */
  error: string | null;
  /** When stats were last refreshed */
  lastRefresh: string | null;
}

export const preferenceState$ = observable<PreferenceState>({
  stats: null,
  loading: false,
  error: null,
  lastRefresh: null,
});

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ATHENA_PREFERENCE_STATE__ =
    preferenceState$;
}
