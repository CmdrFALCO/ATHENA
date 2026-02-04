/**
 * Novelty Detector — WP 9B.3
 *
 * Detects near-duplicates using existing entity resolution infrastructure.
 *
 * Score interpretation:
 * - 1.0 = fully novel content
 * - 0.7 = related but distinct content exists
 * - 0.4 = similar content exists (worth reviewing)
 * - 0.1 = near-duplicate detected
 * - 0.0 = exact duplicate
 */

import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IEmbeddingAdapter } from '@/adapters/IEmbeddingAdapter';
import { computeSimilarityScores } from '@/modules/similarity/algorithms/combined';
import type { SimilarityWeights } from '@/modules/similarity/types';

export interface NoveltyResult {
  score: number;
  nearestMatch?: {
    id: string;
    title: string;
    similarity: number;
  };
}

const DEFAULT_NOVELTY_WEIGHTS: SimilarityWeights = {
  title: 0.4,
  content: 0.2,
  embedding: 0.4,
};

export class NoveltyDetector {
  constructor(
    private noteAdapter: INoteAdapter,
    private embeddingAdapter: IEmbeddingAdapter,
    private weights: SimilarityWeights = DEFAULT_NOVELTY_WEIGHTS,
  ) {}

  /**
   * Check how novel a proposed entity is relative to existing knowledge.
   * @param title - Proposed entity title
   * @param content - Optional content for deeper comparison
   * @param entityId - Optional entity ID if already created (to exclude self)
   * @returns Novelty score + nearest match info
   */
  async evaluate(
    title: string,
    content?: string,
    entityId?: string,
  ): Promise<NoveltyResult> {
    const allNotes = await this.noteAdapter.getAll();
    if (allNotes.length === 0) {
      return { score: 1.0 }; // No existing notes — fully novel
    }

    let highestSimilarity = 0;
    let nearestMatch: NoveltyResult['nearestMatch'] = undefined;

    // Compare against all existing notes
    for (const note of allNotes) {
      // Skip self if entity already exists
      if (entityId && note.id === entityId) continue;

      // Get embedding for comparison note (may not exist)
      const embedding = await this.embeddingAdapter.getForEntity(note.id);

      const scores = computeSimilarityScores(
        { title, content: content ?? '', embedding: undefined },
        {
          title: note.title,
          content: note.content,
          embedding: embedding?.vector,
        },
        this.weights,
      );

      if (scores.combined > highestSimilarity) {
        highestSimilarity = scores.combined;
        nearestMatch = {
          id: note.id,
          title: note.title,
          similarity: scores.combined,
        };
      }
    }

    // Map similarity to novelty score
    const noveltyScore = this.similarityToNovelty(highestSimilarity);

    return {
      score: noveltyScore,
      nearestMatch: nearestMatch && highestSimilarity > 0.5 ? nearestMatch : undefined,
    };
  }

  /**
   * Convert a similarity score to a novelty score.
   * Higher similarity = lower novelty.
   */
  private similarityToNovelty(similarity: number): number {
    if (similarity > 0.95) return 0.1; // Near-duplicate
    if (similarity > 0.85) return 0.4; // Similar, worth reviewing
    if (similarity > 0.70) return 0.7; // Related but distinct
    return 1.0; // Fully novel
  }

  /**
   * Update the detector's weights (e.g., from DevSettings).
   */
  updateWeights(weights: SimilarityWeights): void {
    this.weights = weights;
  }
}
