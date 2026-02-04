/**
 * WP 9B.5: Compression Survival Test
 *
 * Tests whether a connection between two notes survives when both
 * notes are compressed/summarized to progressively shorter lengths.
 * If the connection breaks under compression, it's likely a surface-level
 * similarity rather than a core structural relationship.
 */

import type { IAIBackend } from '@/modules/ai/types';
import type {
  CompressionResult,
  CompressionBreakdownPoint,
  CompressionInterpretation,
  InvarianceConfig,
} from './types';

export class CompressionSurvivalTest {
  constructor(
    private aiBackend: IAIBackend,
    private config: InvarianceConfig['compression'],
  ) {}

  /**
   * Run the compression survival test on two note contents.
   *
   * @param sourceContent - Text content of the source note
   * @param targetContent - Text content of the target note
   * @param originalScore - Original cosine similarity between the two notes
   * @returns CompressionResult with breakdown curve and interpretation
   */
  async run(
    sourceContent: string,
    targetContent: string,
    originalScore: number,
  ): Promise<CompressionResult> {
    // Guard: if original score is 0, nothing to test
    if (originalScore <= 0) {
      return this.untestedResult();
    }

    try {
      const breakdownCurve: CompressionBreakdownPoint[] = [];
      const survivalThreshold = originalScore * 0.5;

      // Sort levels descending (test least compressed first)
      const sortedLevels = [...this.config.levels].sort((a, b) => b - a);

      for (const level of sortedLevels) {
        try {
          // Compress each note to this level
          const [compressedSource, compressedTarget] = await Promise.all([
            this.compress(sourceContent, level),
            this.compress(targetContent, level),
          ]);

          if (!compressedSource || !compressedTarget) {
            // AI failed at this level — mark as not surviving
            breakdownCurve.push({
              level,
              score: 0,
              survives: false,
            });
            continue;
          }

          // Compute embeddings for compressed versions
          const [sourceEmb, targetEmb] = await Promise.all([
            this.embed(compressedSource),
            this.embed(compressedTarget),
          ]);

          if (!sourceEmb || !targetEmb) {
            breakdownCurve.push({
              level,
              score: 0,
              survives: false,
            });
            continue;
          }

          const score = this.cosineSimilarity(sourceEmb, targetEmb);
          const survives = score >= survivalThreshold;

          breakdownCurve.push({ level, score, survives });
        } catch (err) {
          console.warn(
            `[Invariance/Compression] Level ${level} failed:`,
            err,
          );
          breakdownCurve.push({ level, score: 0, survives: false });
        }
      }

      // If all levels failed to test, return untested
      if (breakdownCurve.every((p) => p.score === 0)) {
        return this.untestedResult();
      }

      // Find lowest surviving level
      const survivingLevels = breakdownCurve
        .filter((p) => p.survives)
        .map((p) => p.level);

      const lowestSurvivingLevel =
        survivingLevels.length > 0
          ? Math.min(...survivingLevels)
          : 1.0; // 1.0 = none survived

      const survives = survivingLevels.length > 0;
      const interpretation = this.interpret(lowestSurvivingLevel);

      return {
        tested: true,
        survives,
        lowestSurvivingLevel,
        interpretation,
        breakdownCurve,
      };
    } catch (err) {
      console.error('[Invariance/Compression] Test failed:', err);
      return this.untestedResult();
    }
  }

  // --- Private helpers ---

  /**
   * Compress text to approximately the given fraction of its original length.
   */
  private async compress(
    content: string,
    level: number,
  ): Promise<string | null> {
    try {
      const percentage = Math.round(level * 100);
      const result = await this.aiBackend.generate(
        `Summarize the following text to approximately ${percentage}% of its original length. Preserve the core meaning and key concepts.\n\n${content}`,
        {
          temperature: 0.3,
          maxTokens: Math.max(100, Math.round(content.length * level * 1.5)),
        },
      );

      if (result.text && result.text.trim().length > 0) {
        return result.text.trim();
      }
      return null;
    } catch (err) {
      console.warn(
        `[Invariance/Compression] Compression at ${level} failed:`,
        err,
      );
      return null;
    }
  }

  /**
   * Compute embedding for a text. Returns null on failure.
   */
  private async embed(text: string): Promise<number[] | null> {
    try {
      const result = await this.aiBackend.embed(text);
      return result.vector;
    } catch (err) {
      console.warn('[Invariance/Compression] Embedding failed:', err);
      return null;
    }
  }

  /**
   * Interpret the lowest surviving compression level.
   */
  private interpret(
    lowestSurvivingLevel: number,
  ): CompressionInterpretation {
    if (lowestSurvivingLevel <= 0.2) return 'core_relationship';
    if (lowestSurvivingLevel <= 0.5) return 'contextual_relationship';
    return 'surface_pattern';
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

  private untestedResult(): CompressionResult {
    return {
      tested: false,
      survives: false,
      lowestSurvivingLevel: 1.0,
      interpretation: 'surface_pattern',
      breakdownCurve: [],
    };
  }
}
