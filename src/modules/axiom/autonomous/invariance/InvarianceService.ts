/**
 * WP 9B.5: Invariance Service
 *
 * Orchestrates structural invariance tests for a connection:
 * 1. Loads both notes (source + target)
 * 2. Computes original cosine similarity
 * 3. Runs enabled tests (paraphrase, compression) in parallel
 * 4. Computes aggregate invariance score
 * 5. Persists evidence via IInvarianceAdapter
 */

import type { IAIBackend } from '@/modules/ai/types';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type {
  InvarianceEvidence,
  InvarianceConfig,
  IInvarianceAdapter,
  RobustnessLabel,
  ParaphraseResult,
  CompressionResult,
} from './types';
import { ParaphraseStabilityTest } from './ParaphraseStabilityTest';
import { CompressionSurvivalTest } from './CompressionSurvivalTest';
import { extractTextFromTiptap } from '@/shared/utils/extractTextFromTiptap';

export class InvarianceService {
  constructor(
    private invarianceAdapter: IInvarianceAdapter,
    private noteAdapter: INoteAdapter,
    private connectionAdapter: IConnectionAdapter,
    private aiBackend: IAIBackend,
    private config: InvarianceConfig,
  ) {}

  /**
   * Run invariance tests on an existing connection.
   * Loads source/target notes, computes original similarity,
   * runs enabled tests, and persists evidence.
   */
  async testConnection(connectionId: string): Promise<InvarianceEvidence> {
    // 1. Load the connection
    const connection = await this.connectionAdapter.getById(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // 2. Load source and target notes
    const [sourceNote, targetNote] = await Promise.all([
      this.noteAdapter.getById(connection.source_id),
      this.noteAdapter.getById(connection.target_id),
    ]);

    if (!sourceNote || !targetNote) {
      throw new Error(
        `Source or target note not found for connection ${connectionId}`,
      );
    }

    // 3. Extract text content
    const sourceContent = extractTextFromTiptap(sourceNote.content);
    const targetContent = extractTextFromTiptap(targetNote.content);

    if (!sourceContent.trim() || !targetContent.trim()) {
      // Empty content — cannot test
      const evidence = this.buildUntestedEvidence(connectionId);
      await this.invarianceAdapter.save(evidence);
      return evidence;
    }

    // 4. Compute original cosine similarity
    const originalScore = await this.computeOriginalSimilarity(
      sourceContent,
      targetContent,
    );

    // 5. Run enabled tests
    return this.runTests(connectionId, sourceContent, targetContent, originalScore);
  }

  /**
   * Run invariance tests directly on two texts (for proposals
   * where the connection may not exist in the DB yet).
   */
  async testConnectionDirect(
    connectionId: string,
    sourceContent: string,
    targetContent: string,
  ): Promise<InvarianceEvidence> {
    if (!sourceContent.trim() || !targetContent.trim()) {
      const evidence = this.buildUntestedEvidence(connectionId);
      await this.invarianceAdapter.save(evidence);
      return evidence;
    }

    const originalScore = await this.computeOriginalSimilarity(
      sourceContent,
      targetContent,
    );

    return this.runTests(connectionId, sourceContent, targetContent, originalScore);
  }

  /**
   * Get previously computed evidence for a connection.
   */
  async getEvidence(
    connectionId: string,
  ): Promise<InvarianceEvidence | null> {
    return this.invarianceAdapter.get(connectionId);
  }

  /**
   * Update config (e.g., when DevSettings change).
   */
  updateConfig(config: InvarianceConfig): void {
    this.config = config;
  }

  // --- Private helpers ---

  private async runTests(
    connectionId: string,
    sourceContent: string,
    targetContent: string,
    originalScore: number,
  ): Promise<InvarianceEvidence> {
    // Run enabled tests in parallel
    const testPromises: [
      Promise<ParaphraseResult | null>,
      Promise<CompressionResult | null>,
    ] = [
      this.config.paraphrase.enabled
        ? new ParaphraseStabilityTest(
            this.aiBackend,
            this.config.paraphrase,
          ).run(sourceContent, targetContent, originalScore)
        : Promise.resolve(null),
      this.config.compression.enabled
        ? new CompressionSurvivalTest(
            this.aiBackend,
            this.config.compression,
          ).run(sourceContent, targetContent, originalScore)
        : Promise.resolve(null),
    ];

    const [paraphrase, compression] = await Promise.all(testPromises);

    // Compute aggregate score
    const invarianceScore = this.computeAggregateScore(paraphrase, compression);
    const robustnessLabel = this.assignLabel(invarianceScore, paraphrase, compression);
    const failureModes = this.generateFailureModes(paraphrase, compression);

    const evidence: InvarianceEvidence = {
      connectionId,
      testedAt: new Date().toISOString(),
      paraphrase,
      compression,
      invarianceScore,
      robustnessLabel,
      failureModes,
    };

    // Persist
    await this.invarianceAdapter.save(evidence);

    return evidence;
  }

  /**
   * Compute original cosine similarity between two text contents.
   */
  private async computeOriginalSimilarity(
    sourceContent: string,
    targetContent: string,
  ): Promise<number> {
    try {
      const [sourceEmb, targetEmb] = await Promise.all([
        this.aiBackend.embed(sourceContent),
        this.aiBackend.embed(targetContent),
      ]);

      return this.cosineSimilarity(sourceEmb.vector, targetEmb.vector);
    } catch (err) {
      console.error(
        '[Invariance] Failed to compute original similarity:',
        err,
      );
      return 0;
    }
  }

  /**
   * Compute aggregate invariance score from test results.
   *
   * - Both tests ran: 60% paraphrase + 40% compression
   * - Only one test ran: use that test's score directly
   * - No tests ran: 0
   */
  private computeAggregateScore(
    paraphrase: ParaphraseResult | null,
    compression: CompressionResult | null,
  ): number {
    const paraphraseTested = paraphrase?.tested ?? false;
    const compressionTested = compression?.tested ?? false;

    if (paraphraseTested && compressionTested) {
      const paraphraseScore = paraphrase!.survivalRate;
      const compressionScore = this.normalizeCompressionScore(compression!);
      return (
        this.config.weights.paraphrase * paraphraseScore +
        this.config.weights.compression * compressionScore
      );
    }

    if (paraphraseTested) {
      return paraphrase!.survivalRate;
    }

    if (compressionTested) {
      return this.normalizeCompressionScore(compression!);
    }

    return 0;
  }

  /**
   * Normalize compression lowestSurvivingLevel to 0-1 score.
   * 0.2 → 1.0, 0.3 → 0.75, 0.5 → 0.5, 1.0 → 0.0
   */
  private normalizeCompressionScore(compression: CompressionResult): number {
    if (!compression.survives) return 0;

    const level = compression.lowestSurvivingLevel;
    // Linear mapping: 0.2 → 1.0, 1.0 → 0.0
    // score = (1.0 - level) / (1.0 - 0.2) = (1.0 - level) / 0.8
    const score = (1.0 - level) / 0.8;
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Assign robustness label based on invariance score.
   */
  private assignLabel(
    score: number,
    paraphrase: ParaphraseResult | null,
    compression: CompressionResult | null,
  ): RobustnessLabel {
    const paraphraseTested = paraphrase?.tested ?? false;
    const compressionTested = compression?.tested ?? false;

    if (!paraphraseTested && !compressionTested) return 'untested';
    if (score >= 0.7) return 'robust';
    if (score >= 0.4) return 'moderate';
    return 'fragile';
  }

  /**
   * Generate human-readable failure mode strings.
   */
  private generateFailureModes(
    paraphrase: ParaphraseResult | null,
    compression: CompressionResult | null,
  ): string[] {
    const modes: string[] = [];

    if (paraphrase?.tested) {
      if (!paraphrase.stable) {
        const failed = paraphrase.pairCount - Math.round(paraphrase.survivalRate * paraphrase.pairCount);
        modes.push(
          `Connection broke under paraphrase in ${failed} of ${paraphrase.pairCount} variant pairs`,
        );
      }
      if (paraphrase.variance > 0.1) {
        modes.push(
          `Connection strength varies significantly across phrasings (σ=${Math.sqrt(paraphrase.variance).toFixed(3)})`,
        );
      }
    }

    if (compression?.tested) {
      if (!compression.survives) {
        modes.push(
          `Connection lost at earliest compression level — likely surface-level similarity`,
        );
      } else if (compression.interpretation === 'surface_pattern') {
        modes.push(
          `Connection doesn't survive summarization — may be a wording artifact`,
        );
      } else if (compression.lowestSurvivingLevel > 0.3) {
        const pct = Math.round(compression.lowestSurvivingLevel * 100);
        modes.push(
          `Connection lost at ${pct}% compression — likely surface-level similarity`,
        );
      }
    }

    return modes;
  }

  /**
   * Build untested evidence stub.
   */
  private buildUntestedEvidence(connectionId: string): InvarianceEvidence {
    return {
      connectionId,
      testedAt: new Date().toISOString(),
      paraphrase: null,
      compression: null,
      invarianceScore: 0,
      robustnessLabel: 'untested',
      failureModes: [],
    };
  }

  /**
   * Cosine similarity between two vectors.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i];
      const bVal = b[i];
      if (aVal !== undefined && bVal !== undefined) {
        dotProduct += aVal * bVal;
        normA += aVal * aVal;
        normB += bVal * bVal;
      }
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}
