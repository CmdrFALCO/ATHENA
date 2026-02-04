/**
 * Global Query Service — WP 9B.7
 * Map-reduce answering across community summaries for thematic/global queries.
 */

import type { IAIService } from '@/modules/ai';
import type { ICommunityAdapter } from '@/adapters/ICommunityAdapter';
import { devSettings$ } from '@/config/devSettings';

export class GlobalQueryService {
  constructor(
    private aiService: IAIService,
    private communityAdapter: ICommunityAdapter,
  ) {}

  /**
   * Check if a query is a "global" query using signal word heuristic.
   */
  isGlobalQuery(query: string): boolean {
    const config = devSettings$.community.globalQuery.peek();
    if (!config.enabled) return false;

    const lower = query.toLowerCase();
    return config.signalWords.some((word) => lower.includes(word));
  }

  /**
   * Answer a global query using map-reduce across community summaries.
   *
   * Map: ask each top-level community if it's relevant to the query
   * Filter: remove NOT_RELEVANT responses
   * Reduce: synthesize relevant partial answers into one coherent response
   */
  async answer(query: string): Promise<string | null> {
    // Get top-level communities (highest level)
    const hierarchy = await this.communityAdapter.getHierarchy();
    if (hierarchy.roots.length === 0) return null;

    // Filter to roots with summaries
    const rootsWithSummaries = hierarchy.roots.filter(
      (c) => c.summary !== null,
    );

    if (rootsWithSummaries.length === 0) return null;

    // Map phase: parallel LLM calls per community
    const mapPromises = rootsWithSummaries.map(async (community) => {
      const prompt = `Based on this theme from the knowledge base:
Theme: ${community.summary}
Keywords: ${community.keywords.join(', ')}

Answer this question if this theme is relevant. If not relevant, respond with exactly "NOT_RELEVANT".

Question: ${query}`;

      try {
        const result = await this.aiService.generate(prompt, {
          temperature: 0.3,
          maxTokens: 512,
        });
        return { communityId: community.id, answer: result.text.trim() };
      } catch (err) {
        console.warn(
          `[GlobalQuery] Map call failed for community ${community.id}:`,
          err,
        );
        return null;
      }
    });

    const mapResults = await Promise.all(mapPromises);

    // Filter: remove nulls and NOT_RELEVANT
    const relevant = mapResults.filter(
      (r): r is { communityId: string; answer: string } =>
        r !== null && !r.answer.includes('NOT_RELEVANT'),
    );

    // No relevant communities
    if (relevant.length === 0) {
      return null;
    }

    // Single relevant: return directly
    if (relevant.length === 1) {
      return relevant[0].answer;
    }

    // Reduce phase: synthesize multiple perspectives
    const partialAnswers = relevant
      .map(
        (a, i) => `Theme ${i + 1}: ${a.answer}`,
      )
      .join('\n\n');

    const reducePrompt = `Synthesize these perspectives from different themes in a knowledge base into a single coherent answer.

${partialAnswers}

Original question: ${query}

Provide a comprehensive answer that draws from all relevant themes.`;

    try {
      const result = await this.aiService.generate(reducePrompt, {
        temperature: 0.5,
        maxTokens: 1024,
      });
      return result.text.trim();
    } catch (err) {
      console.error('[GlobalQuery] Reduce phase failed:', err);
      // Fall back to concatenated partial answers
      return relevant.map((r) => r.answer).join('\n\n');
    }
  }
}

// ============================================
// Singleton Management
// ============================================

let globalQueryInstance: GlobalQueryService | null = null;

export function initGlobalQueryService(
  aiService: IAIService,
  communityAdapter: ICommunityAdapter,
): GlobalQueryService {
  globalQueryInstance = new GlobalQueryService(aiService, communityAdapter);
  return globalQueryInstance;
}

export function getGlobalQueryService(): GlobalQueryService | null {
  return globalQueryInstance;
}
