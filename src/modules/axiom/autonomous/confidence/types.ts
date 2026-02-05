/**
 * WP 9B.3: Multi-Factor Confidence Scoring Types
 *
 * Extends the simple 4-factor ConfidenceSnapshot from WP 9B.2 with
 * 8 distinct factors, floor veto, human-readable explanations,
 * and dynamic threshold adjustment.
 */

/** Source trust classification */
export type SourceTrustLevel = 'trusted' | 'neutral' | 'untrusted';

/** All confidence factors — extends the simple 4-factor snapshot from 9B.2 */
export interface ConfidenceFactors {
  /** Source reliability: domain/type trust level (0-1) */
  sourceQuality: number;
  /** AI extraction confidence: how clear was the content structure (0-1) */
  extractionClarity: number;
  /** Graph coherence: fits existing knowledge patterns (0-1) */
  graphCoherence: number;
  /** Embedding similarity: semantic match strength (0-1) */
  embeddingSimilarity: number;
  /** Novelty: not a near-duplicate (1=novel, 0=exact duplicate) */
  noveltyScore: number;
  /** CPN validation: rules passed (0-1) */
  validationScore: number;
  /** Devil's Advocate: critique survival score (0-1) */
  critiqueSurvival: number;
  /** Structural invariance: stub for WP 9B.5 (null = not tested yet) */
  invarianceScore: number | null;
  /** Council vetting: multi-agent consensus score (null = not council-generated) */
  councilVetted: number | null;
}

/** Human-readable explanation for a confidence factor */
export interface ConfidenceExplanation {
  factor: keyof ConfidenceFactors;
  score: number;
  label: string;
  explanation: string;
  severity: 'ok' | 'warning' | 'critical';
  isFloorVeto: boolean;
}

/** Result from MultiFactorConfidenceCalculator */
export interface ConfidenceResult {
  /** Overall weighted score (0-1) */
  score: number;
  /** Per-factor breakdown */
  factors: ConfidenceFactors;
  /** Human-readable explanations (only for notable factors) */
  explanations: ConfidenceExplanation[];
  /** Whether any floor veto was triggered */
  hasFloorVeto: boolean;
  /** Which factors triggered floor veto */
  vetoFactors: (keyof ConfidenceFactors)[];
  /** Weights used for this calculation */
  weightsUsed: Partial<Record<keyof ConfidenceFactors, number>>;
}

/** Configuration for factor weights */
export interface ConfidenceWeights {
  sourceQuality: number;
  extractionClarity: number;
  graphCoherence: number;
  embeddingSimilarity: number;
  noveltyScore: number;
  validationScore: number;
  critiqueSurvival: number;
  // invarianceScore excluded — null factors are auto-excluded from weighting
}

/** Minimum floor values — below these triggers forced review */
export interface ConfidenceFloors {
  sourceQuality: number;
  extractionClarity: number;
  graphCoherence: number;
  embeddingSimilarity: number;
  noveltyScore: number;
  validationScore: number;
  critiqueSurvival: number;
}

/** Source trust mapping configuration */
export interface SourceTrustConfig {
  /** Trusted domain suffixes/patterns */
  trustedDomains: string[];
  /** Untrusted domain suffixes/patterns */
  untrustedDomains: string[];
  /** User overrides: domain -> trust level */
  userOverrides: Record<string, SourceTrustLevel>;
  /** Score for user-created content (no external source) */
  userContentScore: number;
  /** Score for trusted sources */
  trustedScore: number;
  /** Score for neutral sources */
  neutralScore: number;
  /** Score for untrusted sources */
  untrustedScore: number;
}

/** Dynamic threshold adjustment configuration */
export interface DynamicAdjustmentConfig {
  enabled: boolean;
  /** Number of recent decisions to consider */
  windowSize: number;
  /** If rejection rate exceeds this, tighten thresholds */
  tightenAbove: number;
  /** If rejection rate below this, loosen thresholds */
  loosenBelow: number;
  /** How much to adjust per cycle */
  adjustmentStep: number;
  /** Hard bounds for threshold adjustment */
  minThreshold: number;
  maxThreshold: number;
}

/** Record of a threshold adjustment event */
export interface ThresholdAdjustment {
  id: string;
  timestamp: string;
  strategy: string;
  previousAutoAccept: number;
  newAutoAccept: number;
  previousAutoReject: number;
  newAutoReject: number;
  rejectionRate: number;
  windowSize: number;
  reason: string;
}

/** Adjusted thresholds after dynamic adjustment */
export interface AdjustedThresholds {
  autoAcceptEntity: number;
  autoAcceptConnection: number;
  autoRejectBelow: number;
  wasAdjusted: boolean;
  adjustmentReason?: string;
}

/** Full confidence configuration for DevSettings */
export interface ConfidenceConfig {
  /** Which calculator to use */
  calculator: 'simple' | 'multi_factor';
  /** Factor weights (must sum to ~1.0, normalized internally) */
  weights: ConfidenceWeights;
  /** Floor values — below these forces review */
  floors: ConfidenceFloors;
  /** Graph coherence strategy */
  coherenceStrategy: 'neighborhood' | 'type_statistics' | 'combined';
  /** Threshold adjustment strategy */
  thresholdStrategy: 'static' | 'global_ratio' | 'per_factor';
  /** Source trust configuration */
  sourceTrust: SourceTrustConfig;
  /** Dynamic threshold adjustment */
  dynamicAdjustment: DynamicAdjustmentConfig;
}
