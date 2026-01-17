import type { ValidationRule } from '../types';
import { rulesEngine } from '../engine';

// Structural rules
export { orphanNoteRule } from './structural/orphanNote';
export { selfLoopRule } from './structural/selfLoop';
export { duplicateConnectionRule } from './structural/duplicateConnection';
export { bidirectionalConnectionRule } from './structural/bidirectionalConnection';

// Quality rules
export { weaklyConnectedRule } from './quality/weaklyConnected';
export { staleSuggestionRule } from './quality/staleSuggestion';

// Import for mvpRules array
import { orphanNoteRule } from './structural/orphanNote';
import { selfLoopRule } from './structural/selfLoop';
import { duplicateConnectionRule } from './structural/duplicateConnection';
import { bidirectionalConnectionRule } from './structural/bidirectionalConnection';
import { weaklyConnectedRule } from './quality/weaklyConnected';
import { staleSuggestionRule } from './quality/staleSuggestion';

/**
 * All MVP validation rules.
 * 5 enabled by default, 1 (bidirectional) disabled by default.
 */
export const mvpRules: ValidationRule[] = [
  // Structural (errors)
  orphanNoteRule,
  selfLoopRule,
  duplicateConnectionRule,
  // Structural (warning, opt-in)
  bidirectionalConnectionRule,
  // Quality (warnings)
  weaklyConnectedRule,
  staleSuggestionRule,
];

/**
 * Register all MVP rules with the singleton engine.
 * Call this during app initialization.
 */
export function registerMvpRules(): void {
  rulesEngine.registerRules(mvpRules);
}
