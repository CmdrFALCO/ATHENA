/**
 * Similarity Strategy
 * WP 7.2 - Find semantically similar content to the user's query
 *
 * Uses embeddings to find notes and resources that are semantically
 * related to the current user message.
 */

import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IResourceAdapter } from '@/adapters/IResourceAdapter';
import type { IEmbeddingAdapter } from '@/adapters/IEmbeddingAdapter';
import type { IAIService } from '@/modules/ai';
import { extractTextFromTiptap } from '@/shared/utils/extractTextFromTiptap';
import type { ContextItem, IContextStrategy } from './types';

export class SimilarityStrategy implements IContextStrategy {
  readonly name = 'similarity';
  private noteAdapter: INoteAdapter;
  private resourceAdapter: IResourceAdapter;
  private embeddingAdapter: IEmbeddingAdapter;
  private aiService: IAIService;

  constructor(
    noteAdapter: INoteAdapter,
    resourceAdapter: IResourceAdapter,
    embeddingAdapter: IEmbeddingAdapter,
    aiService: IAIService
  ) {
    this.noteAdapter = noteAdapter;
    this.resourceAdapter = resourceAdapter;
    this.embeddingAdapter = embeddingAdapter;
    this.aiService = aiService;
  }

  /**
   * Find semantically similar content to the query
   */
  async gather(query: string, limit: number, threshold: number): Promise<ContextItem[]> {
    if (!query.trim()) return [];

    // 1. Embed the query
    let embeddingResult;
    try {
      embeddingResult = await this.aiService.embed(query);
    } catch (err) {
      console.warn('[SimilarityStrategy] Failed to embed query:', err);
      return [];
    }

    if (!embeddingResult.vector || embeddingResult.vector.length === 0) {
      console.warn('[SimilarityStrategy] Embedding result has no vector');
      return [];
    }

    const items: ContextItem[] = [];

    // 2. Find similar entities
    try {
      const similarEntities = await this.embeddingAdapter.findSimilar(
        embeddingResult.vector,
        embeddingResult.model,
        limit,
        threshold
      );

      for (const result of similarEntities) {
        const note = await this.noteAdapter.getById(result.entity_id);
        if (note) {
          items.push({
            id: note.id,
            type: 'entity',
            title: note.title,
            content: this.extractContent(note.content),
            relevanceScore: result.similarity,
            source: 'similarity',
          });
        }
      }
    } catch (err) {
      console.warn('[SimilarityStrategy] Entity search failed:', err);
    }

    // 3. Find similar resources (if we have room)
    if (items.length < limit) {
      try {
        const similarResources = await this.embeddingAdapter.findSimilarResources(
          embeddingResult.vector,
          embeddingResult.model,
          limit - items.length,
          threshold
        );

        for (const result of similarResources) {
          const resource = await this.resourceAdapter.getById(result.resource_id);
          if (resource) {
            items.push({
              id: resource.id,
              type: 'resource',
              title: resource.name,
              content: resource.extractedText || resource.userNotes || '',
              relevanceScore: result.similarity,
              source: 'similarity',
            });
          }
        }
      } catch (err) {
        console.warn('[SimilarityStrategy] Resource search failed:', err);
      }
    }

    return items;
  }

  private extractContent(content: unknown): string {
    if (!content) return '';
    if (typeof content === 'string') return content;
    return extractTextFromTiptap(content);
  }
}
