/**
 * Context Builder - Main Orchestrator
 * WP 7.2 - GraphRAG context gathering for AI conversations
 * Extended WP 8.2 - Document reasoning strategy for structured resources
 *
 * Coordinates strategies to gather relevant context:
 * 1. Selected Nodes - Explicit user-selected context (highest priority)
 * 2. Document Reasoning - Navigate document trees for structured resources
 * 3. Similarity Search - Semantically similar content to the query
 * 4. Graph Traversal - Connected nodes (1-hop expansion)
 */

import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IResourceAdapter } from '@/adapters/IResourceAdapter';
import type { IConnectionAdapter } from '@/adapters/IConnectionAdapter';
import type { IEmbeddingAdapter } from '@/adapters/IEmbeddingAdapter';
import type { IAIService } from '@/modules/ai';
import { devSettings$ } from '@/config/devSettings';
import { SelectedNodesStrategy } from './contextStrategies/SelectedNodesStrategy';
import { SimilarityStrategy } from './contextStrategies/SimilarityStrategy';
import { TraversalStrategy } from './contextStrategies/TraversalStrategy';
import { DocumentReasoningStrategy } from './contextStrategies/DocumentReasoningStrategy';
import type { ContextItem, ContextOptions, ContextResult } from './contextStrategies/types';

export class ContextBuilder {
  private selectedStrategy: SelectedNodesStrategy;
  private similarityStrategy: SimilarityStrategy;
  private traversalStrategy: TraversalStrategy;
  private documentReasoningStrategy: DocumentReasoningStrategy;
  private resourceAdapter: IResourceAdapter;

  constructor(
    noteAdapter: INoteAdapter,
    resourceAdapter: IResourceAdapter,
    connectionAdapter: IConnectionAdapter,
    embeddingAdapter: IEmbeddingAdapter,
    aiService: IAIService
  ) {
    this.resourceAdapter = resourceAdapter;
    this.selectedStrategy = new SelectedNodesStrategy(noteAdapter, resourceAdapter);
    this.similarityStrategy = new SimilarityStrategy(
      noteAdapter,
      resourceAdapter,
      embeddingAdapter,
      aiService
    );
    this.traversalStrategy = new TraversalStrategy(
      noteAdapter,
      resourceAdapter,
      connectionAdapter
    );
    this.documentReasoningStrategy = new DocumentReasoningStrategy(
      aiService,
      resourceAdapter
    );
  }

  /**
   * Build context for an AI conversation
   *
   * Strategy execution order:
   * 1. Selected nodes (explicit user choice, highest priority)
   * 2. Similarity search (semantic relevance to query)
   * 3. Traversal (graph neighborhood expansion)
   *
   * Items are deduplicated across strategies.
   */
  async build(options: ContextOptions): Promise<ContextResult> {
    // Get defaults from DevSettings
    const contextConfig = devSettings$.chat.context?.peek();

    const {
      selectedNodeIds = [],
      query = '',
      maxItems = contextConfig?.maxItems ?? 10,
      similarityThreshold = contextConfig?.similarityThreshold ?? 0.7,
      includeTraversal = contextConfig?.includeTraversal ?? true,
      traversalDepth = contextConfig?.traversalDepth ?? 1,
    } = options;

    const allItems: ContextItem[] = [];
    const seenIds = new Set<string>();

    // Debug counters
    let selectedCount = 0;
    let similarCount = 0;
    let traversalCount = 0;

    // Strategy 1: Selected nodes (always included, max priority)
    if (selectedNodeIds.length > 0) {
      const selectedItems = await this.selectedStrategy.gather(selectedNodeIds);
      for (const item of selectedItems) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
          selectedCount++;
        }
      }
    }

    // Strategy 2: Document reasoning (WP 8.2 - for resources with structure)
    if (query.trim() && allItems.length < maxItems) {
      // Find resource IDs from selected items that have structure
      const resourceIdsWithStructure: string[] = [];
      for (const item of allItems) {
        if (item.type === 'resource') {
          try {
            const resource = await this.resourceAdapter.getById(item.id);
            if (resource?.structure) {
              resourceIdsWithStructure.push(item.id);
            }
          } catch {
            // Skip on error
          }
        }
      }

      if (resourceIdsWithStructure.length > 0) {
        try {
          const reasoningItems = await this.documentReasoningStrategy.gather(
            query,
            resourceIdsWithStructure,
            maxItems - allItems.length
          );
          for (const item of reasoningItems) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              allItems.push(item);
              similarCount++;
            }
          }
        } catch (err) {
          console.warn('[ContextBuilder] Document reasoning strategy failed:', err);
        }
      }
    }

    // Strategy 3: Similarity search (if query provided and room remains)
    if (query.trim() && allItems.length < maxItems) {
      const similarItems = await this.similarityStrategy.gather(
        query,
        maxItems - allItems.length,
        similarityThreshold
      );
      for (const item of similarItems) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
          similarCount++;
        }
      }
    }

    // Strategy 4: Traversal (if enabled and room remains)
    if (includeTraversal && allItems.length < maxItems && allItems.length > 0) {
      const baseIds = allItems.map((item) => item.id);
      const traversalItems = await this.traversalStrategy.gather(
        baseIds,
        traversalDepth,
        maxItems - allItems.length
      );
      for (const item of traversalItems) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
          traversalCount++;
        }
      }
    }

    // Sort by relevance score (descending)
    allItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Truncate to maxItems
    const truncated = allItems.length > maxItems;
    const finalItems = allItems.slice(0, maxItems);

    // Estimate tokens (rough: 4 chars per token)
    const totalChars = finalItems.reduce(
      (sum, item) => sum + item.title.length + item.content.length,
      0
    );
    const totalTokensEstimate = Math.ceil(totalChars / 4);

    return {
      items: finalItems,
      totalTokensEstimate,
      truncated,
      debug: {
        selectedCount,
        similarCount,
        traversalCount,
      },
    };
  }
}

// Singleton for debugging - set by ChatService in WP 7.3
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_CONTEXT_BUILDER__: ContextBuilder | null }).__ATHENA_CONTEXT_BUILDER__ = null;
}
