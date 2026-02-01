/**
 * Preference Learning Module
 * WP 8.4 - Preference Learning
 *
 * Tracks accept/reject patterns from AI proposals to learn user preferences
 * and adjust confidence scores for future suggestions.
 */

// Types
export type {
  PreferenceSignal,
  SignalMetadata,
  PreferenceStats,
  ConfidenceAdjustment,
  AdjustmentFactor,
  PreferenceLearningConfig,
} from './types';

// Adapter
export { SQLitePreferenceAdapter } from './PreferenceAdapter';
export type { IPreferenceAdapter } from './PreferenceAdapter';

// Services
export { PreferenceTracker } from './PreferenceTracker';
export { ConfidenceAdjuster } from './ConfidenceAdjuster';

// State & Actions
export { preferenceState$ } from './preferenceState';
export { preferenceActions } from './preferenceActions';

// Components
export { PreferenceInsights } from './components/PreferenceInsights';
