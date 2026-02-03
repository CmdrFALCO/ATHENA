/**
 * Critique types for the Devil's Advocate layer (WP 9B.1)
 *
 * Defines the CRITIQUE_RESULT color set, scoring functions,
 * and configuration interfaces for the critique workflow.
 *
 * @module axiom/types/critique
 */

// ── Interfaces ──

/**
 * CRITIQUE_RESULT — Output of the Devil's Advocate agent
 *
 * Attached to token._meta.critiqueResult after T_critique fires.
 */
export interface CRITIQUE_RESULT {
  proposalId: string;
  correlationId: string;
  scope: 'batch' | 'individual';
  survived: boolean;
  survivalScore: number;          // 0.0-1.0
  adjustedConfidence: number;     // originalConfidence * survivalScore
  counterArguments: CounterArgument[];
  blindSpots: string[];
  riskFactors: RiskFactor[];
  recommendation: 'proceed' | 'reconsider' | 'reject';
  critiquedAt: string;
  critiqueModel: string;
  durationMs: number;
}

/**
 * CounterArgument — A specific challenge against a proposal item
 */
export interface CounterArgument {
  target: 'node' | 'edge';
  targetId: string;
  targetLabel: string;
  argument: string;
  severity: 'minor' | 'moderate' | 'major';
  survivalScore: number;          // 0.0-1.0
}

/**
 * RiskFactor — A category-level risk assessment
 */
export interface RiskFactor {
  category: 'accuracy' | 'completeness' | 'coherence' | 'redundancy' | 'scope';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * CritiqueTriggerConfig — When to invoke the critique agent
 */
export interface CritiqueTriggerConfig {
  minConfidence: number;          // Default: 0.85
  skipBelowConfidence: number;    // Default: 0.5
  minConnections: number;         // Default: 3
  entityTypes: string[];          // Default: ['decision', 'claim', 'argument']
  probabilisticRate: number;      // Default: 0
}

/**
 * CritiqueBehaviorConfig — How the critique agent operates
 */
export interface CritiqueBehaviorConfig {
  scope: 'batch' | 'individual';  // Default: 'batch'
  model: string;                   // Default: '' (use chat model)
  temperature: number;             // Default: 0.7
  maxCounterArguments: number;     // Default: 5
  survivalThreshold: number;       // Default: 0.7
  rejectThreshold: number;         // Default: 0.3
}

/**
 * CritiqueUIConfig — UI display preferences
 */
export interface CritiqueUIConfig {
  showInProposalCard: boolean;     // Default: true
  showSurvivalScore: boolean;      // Default: true
  collapseWhenSurvived: boolean;   // Default: true
  allowManualCritique: boolean;    // Default: true
  allowHumanOverride: boolean;     // Default: true
}

/**
 * CritiqueConfig — Top-level critique configuration for DevSettings
 */
export interface CritiqueConfig {
  enabled: boolean;
  triggers: CritiqueTriggerConfig;
  behavior: CritiqueBehaviorConfig;
  ui: CritiqueUIConfig;
}

// ── Constants ──

/** Severity weights for survival score calculation */
export const SEVERITY_WEIGHTS: Record<CounterArgument['severity'], number> = {
  major: 0.50,
  moderate: 0.30,
  minor: 0.20,
};

// ── Scoring Functions ──

/**
 * Calculate weighted survival score from counter-arguments.
 *
 * Each counter-argument contributes its survivalScore weighted by severity.
 * No counter-arguments = 1.0 (full survival).
 */
export function calculateSurvivalScore(counterArguments: CounterArgument[]): number {
  if (counterArguments.length === 0) return 1.0;

  let totalWeight = 0;
  let weightedSurvival = 0;

  for (const arg of counterArguments) {
    const weight = SEVERITY_WEIGHTS[arg.severity];
    totalWeight += weight;
    weightedSurvival += weight * arg.survivalScore;
  }

  return totalWeight > 0 ? weightedSurvival / totalWeight : 1.0;
}

/**
 * Adjust confidence by multiplying with survival score.
 * Rounds to 2 decimal places.
 */
export function adjustConfidence(original: number, survivalScore: number): number {
  return Math.round(original * survivalScore * 100) / 100;
}
