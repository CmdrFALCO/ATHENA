/**
 * WP 9B.5: Paraphrase Stability Test
 *
 * Tests whether a connection between two notes survives when both
 * notes are paraphrased with completely different wording.
 * If the connection breaks under paraphrase, it's likely an artifact
 * of specific wording rather than a real structural relationship.
 */

import type { IAIBackend } from '@/modules/ai/types';
import type { ParaphraseResult, InvarianceConfig } from './types';

export class ParaphraseStabilityTest {
  constructor(
    private aiBackend: IAIBackend,
    private config: InvarianceConfig['paraphrase'],
  ) {}

  /**
   * Run the paraphrase stability test on two note contents.
   *
   * @param sourceContent - Text content of the source note
   * @param targetContent - Text content of the target note
   * @param originalScore - Original cosine similarity between the two notes
   * @returns ParaphraseResult with stability metrics
   */
  async run(
    sourceContent: string,
    targetContent: string,
    originalScore: number,
  ): Promise<ParaphraseResult> {
    // Guard: if original score is 0, nothing to test
    if (originalScore <= 0) {
      return this.untestedResult();
    }

    try {
      // 1. Generate N paraphrase variants of each note
      const [sourceVariants, targetVariants] = await Promise.all([
        this.generateVariants(sourceContent),
        this.generateVariants(targetContent),
      ]);

      // Verify we got enough variants
      if (sourceVariants.length === 0 || targetVariants.length === 0) {
        console.warn(
          '[Invariance/Paraphrase] Failed to generate enough variants',
        );
        return this.untestedResult();
      }

      // 2. Compute embeddings for all variants
      const [sourceEmbeddings, targetEmbeddings] = await Promise.all([
        this.embedAll(sourceVariants),
        this.embedAll(targetVariants),
      ]);

      // 3. Compute cosine similarity for ALL variant pairs (N×N)
      const relativeScores: number[] = [];
      let skipped = 0;

      for (const srcEmb of sourceEmbeddings) {
        if (!srcEmb) {
          skipped += targetEmbeddings.length;
          continue;
        }
        for (const tgtEmb of targetEmbeddings) {
          if (!tgtEmb) {
            skipped++;
            continue;
          }
          const pairScore = this.cosineSimilarity(srcEmb, tgtEmb);
          const relativeScore = pairScore / originalScore;
          relativeScores.push(relativeScore);
        }
      }

      // If all pairs failed, return untested
      if (relativeScores.length === 0) {
        console.warn(
          '[Invariance/Paraphrase] All embedding pairs failed',
        );
        return this.untestedResult();
      }

      // 4. Count surviving pairs
      const surviving = relativeScores.filter(
        (s) => s >= this.config.stabilityThreshold,
      ).length;

      // 5. Compute statistics
      const survivalRate = surviving / relativeScores.length;
      const minRelativeScore = Math.min(...relativeScores);
      const maxRelativeScore = Math.max(...relativeScores);
      const mean =
        relativeScores.reduce((a, b) => a + b, 0) / relativeScores.length;
      const variance =
        relativeScores.reduce((acc, s) => acc + (s - mean) ** 2, 0) /
        relativeScores.length;

      const stable = surviving >= this.config.minSurvivingVariants;

      return {
        tested: true,
        stable,
        survivalRate,
        minRelativeScore,
        maxRelativeScore,
        variance,
        variantCount: this.config.variants,
        pairCount: relativeScores.length,
      };
    } catch (err) {
      console.error('[Invariance/Paraphrase] Test failed:', err);
      return this.untestedResult();
    }
  }

  // --- Private helpers ---

  /**
   * Generate N paraphrase variants of the given content.
   */
  private async generateVariants(content: string): Promise<string[]> {
    const variants: string[] = [];

    for (let i = 0; i < this.config.variants; i++) {
      try {
        const result = await this.aiBackend.generate(
          `Rewrite the following text preserving all meaning but using completely different wording and sentence structure. Do not add or remove any information.\n\n${content}`,
          {
            temperature: 0.8,
            maxTokens: Math.max(500, content.length * 2),
          },
        );

        if (result.text && result.text.trim().length > 0) {
          variants.push(result.text.trim());
        }
      } catch (err) {
        console.warn(
          `[Invariance/Paraphrase] Variant ${i + 1} generation failed:`,
          err,
        );
        // Skip this variant, continue with others
      }
    }

    return variants;
  }

  /**
   * Compute embeddings for an array of texts.
   * Returns null for texts that fail to embed.
   */
  private async embedAll(
    texts: string[],
  ): Promise<(number[] | null)[]> {
    const results: (number[] | null)[] = [];

    for (const text of texts) {
      try {
        const embedding = await this.aiBackend.embed(text);
        results.push(embedding.vector);
      } catch (err) {
        console.warn('[Invariance/Paraphrase] Embedding failed:', err);
        results.push(null);
      }
    }

    return results;
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

  private untestedResult(): ParaphraseResult {
    return {
      tested: false,
      stable: false,
      survivalRate: 0,
      minRelativeScore: 0,
      maxRelativeScore: 0,
      variance: 0,
      variantCount: 0,
      pairCount: 0,
    };
  }
}
