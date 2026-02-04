/**
 * Community Search Service — WP 9B.7
 * Ranks communities by semantic similarity to a query embedding.
 */

import type { IAIService } from '@/modules/ai';
import type { ICommunityAdapter } from '@/adapters/ICommunityAdapter';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { CommunitySearchResult } from './types';

export class CommunitySearchService {
  constructor(
    private aiService: IAIService,
    private communityAdapter: ICommunityAdapter,
    private noteAdapter: INoteAdapter,
  ) {}

  /**
   * Search communities by semantic similarity to a query.
   * Embeds the query, computes cosine similarity against all community embeddings.
   */
  async search(query: string, limit = 5): Promise<CommunitySearchResult[]> {
    // 1. Embed the query
    const queryEmbedding = await this.aiService.embed(query);

    // 2. Get all communities (level 0 — leaf communities for granularity)
    const hierarchy = await this.communityAdapter.getHierarchy();
    const allCommunities = Array.from(hierarchy.levels.values()).flat();

    // 3. Filter to communities with embeddings and summaries
    const withEmbeddings = allCommunities.filter(
      (c) => c.embedding !== null && c.summary !== null,
    );

    if (withEmbeddings.length === 0) return [];

    // 4. Compute cosine similarity
    const scored: Array<{ community: typeof withEmbeddings[0]; score: number }> = [];

    for (const community of withEmbeddings) {
      const score = this.cosineSimilarity(
        queryEmbedding.vector,
        community.embedding!,
      );
      scored.push({ community, score });
    }

    // 5. Sort by score descending, take top N
    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, limit);

    // 6. Build search results with member previews
    const results: CommunitySearchResult[] = [];
    for (const { community, score } of topResults) {
      const previews = await this.getMemberPreviews(community.memberEntityIds);
      results.push({
        community,
        relevanceScore: score,
        memberPreviews: previews,
      });
    }

    return results;
  }

  private async getMemberPreviews(
    entityIds: string[],
  ): Promise<Array<{ id: string; title: string }>> {
    const previews: Array<{ id: string; title: string }> = [];
    for (const id of entityIds.slice(0, 5)) {
      const entity = await this.noteAdapter.getById(id);
      if (entity) {
        previews.push({ id: entity.id, title: entity.title });
      }
    }
    return previews;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }
}
