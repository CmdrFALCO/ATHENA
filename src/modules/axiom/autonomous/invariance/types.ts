/**
 * WP 9B.5: Structural Invariance Types
 *
 * Types for paraphrase stability and compression survival tests.
 * These tests verify whether AI-suggested connections survive
 * transformation — evidence that they reflect real structure,
 * not artifacts of specific wording.
 */

/** Robustness classification based on invariance score */
export type RobustnessLabel = 'robust' | 'moderate' | 'fragile' | 'untested';

/** Compression interpretation based on survival depth */
export type CompressionInterpretation =
  | 'core_relationship'
  | 'contextual_relationship'
  | 'surface_pattern';

/** Paraphrase test result */
export interface ParaphraseResult {
  tested: boolean;
  stable: boolean;
  /** 0-1, fraction of variant pairs above threshold */
  survivalRate: number;
  minRelativeScore: number;
  maxRelativeScore: number;
  variance: number;
  /** How many variants were generated per note */
  variantCount: number;
  /** Total variant pairs tested */
  pairCount: number;
}

/** Compression test result */
export interface CompressionResult {
  tested: boolean;
  survives: boolean;
  /** e.g., 0.3 means survived at 30% compression */
  lowestSurvivingLevel: number;
  interpretation: CompressionInterpretation;
  breakdownCurve: CompressionBreakdownPoint[];
}

/** Single point on the compression breakdown curve */
export interface CompressionBreakdownPoint {
  /** Compression level (e.g. 0.5, 0.3, 0.2) */
  level: number;
  /** Cosine similarity at this level */
  score: number;
  /** Score >= originalScore * 0.5 */
  survives: boolean;
}

/** Full invariance evidence for a connection */
export interface InvarianceEvidence {
  connectionId: string;
  /** ISO timestamp */
  testedAt: string;

  paraphrase: ParaphraseResult | null;
  compression: CompressionResult | null;

  /** 0-1, weighted: 60% paraphrase + 40% compression */
  invarianceScore: number;
  robustnessLabel: RobustnessLabel;
  /** Human-readable explanations of failure modes */
  failureModes: string[];
}

/** Invariance configuration (stored in DevSettings) */
export interface InvarianceConfig {
  /** Master switch */
  enabled: boolean;
  /** When to trigger invariance tests */
  trigger: 'manual' | 'auto_high_confidence';
  /** Only for auto trigger: minimum confidence to auto-test */
  autoTestMinConfidence: number;

  paraphrase: {
    enabled: boolean;
    /** Number of paraphrase variants per note */
    variants: number;
    /** Minimum relative score for a pair to "survive" */
    stabilityThreshold: number;
    /** Minimum surviving pairs for connection to be "stable" */
    minSurvivingVariants: number;
  };

  compression: {
    enabled: boolean;
    /** Compression levels to test (fractions of original length) */
    levels: number[];
    /** Minimum level where connection must survive */
    minimumSurvivalLevel: number;
  };

  weights: {
    /** Weight for paraphrase score in aggregate (default 0.6) */
    paraphrase: number;
    /** Weight for compression score in aggregate (default 0.4) */
    compression: number;
  };

  /** If true, fragile connections force queue_for_review */
  fragileFloorVeto: boolean;

  ui: {
    showInvarianceScores: boolean;
    showFailureModes: boolean;
    highlightFragile: boolean;
  };
}

/** Adapter interface for invariance evidence persistence */
export interface IInvarianceAdapter {
  save(evidence: InvarianceEvidence): Promise<void>;
  get(connectionId: string): Promise<InvarianceEvidence | null>;
  getByLabel(label: RobustnessLabel): Promise<InvarianceEvidence[]>;
  getByScoreRange(min: number, max: number): Promise<InvarianceEvidence[]>;
  delete(connectionId: string): Promise<void>;
  deleteAll(): Promise<void>;
}
