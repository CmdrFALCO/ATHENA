import { jaroWinklerSimilarity } from './jaroWinkler';
import { levenshteinSimilarity } from './levenshtein';
import { extractTextFromTiptap } from '@/shared/utils/extractTextFromTiptap';
import type { SimilarityWeights, SimilarityScores } from '../types';

export const DEFAULT_WEIGHTS: SimilarityWeights = {
  title: 0.3,
  content: 0.2,
  embedding: 0.5,
};

export interface NoteForComparison {
  title: string;
  content: unknown; // Tiptap JSON or string
  embedding?: number[];
}

/**
 * Compute similarity scores between two notes.
 *
 * When one or both notes lack embeddings, the weights are redistributed
 * proportionally across title and content so the combined score remains
 * meaningful (graceful degradation).
 */
export function computeSimilarityScores(
  note1: NoteForComparison,
  note2: NoteForComparison,
  weights: SimilarityWeights = DEFAULT_WEIGHTS
): SimilarityScores {
  // Title similarity (Jaro-Winkler — good for short strings)
  const titleScore = jaroWinklerSimilarity(note1.title, note2.title);

  // Content similarity (Levenshtein on first 500 chars of plain text)
  const text1 = extractTextFromTiptap(note1.content).slice(0, 500);
  const text2 = extractTextFromTiptap(note2.content).slice(0, 500);
  const contentScore = levenshteinSimilarity(text1, text2);

  // Embedding similarity (cosine) — may be unavailable
  const hasEmbeddings = note1.embedding && note2.embedding;
  let embeddingScore = 0;
  if (hasEmbeddings) {
    embeddingScore = cosineSimilarity(note1.embedding!, note2.embedding!);
  }

  // Compute combined score with weight redistribution when embeddings are missing
  let combined: number;
  if (hasEmbeddings) {
    combined =
      titleScore * weights.title + contentScore * weights.content + embeddingScore * weights.embedding;
  } else {
    // Redistribute embedding weight proportionally to title and content
    const textTotal = weights.title + weights.content;
    if (textTotal === 0) {
      combined = 0;
    } else {
      const titleW = weights.title / textTotal;
      const contentW = weights.content / textTotal;
      combined = titleScore * titleW + contentScore * contentW;
    }
  }

  return {
    title: titleScore,
    content: contentScore,
    embedding: embeddingScore,
    combined,
  };
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
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

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}
