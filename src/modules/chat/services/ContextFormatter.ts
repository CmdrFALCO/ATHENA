/**
 * Context Formatter
 * WP 7.2 - Format context items for inclusion in AI prompts
 * WP 8.7.2 - Separate formatting for notes vs resources
 *
 * Provides utilities to format gathered context items into
 * a structured format suitable for AI system prompts.
 */

import type { ContextItem, ContextResult } from './contextStrategies/types';

/**
 * Format context items for inclusion in AI prompts
 */
export class ContextFormatter {
  /**
   * Format items for the AI prompt.
   * Separates entities (notes) and resources into distinct sections
   * for better AI comprehension.
   */
  static formatForPrompt(items: ContextItem[]): string {
    if (items.length === 0) {
      return 'No relevant notes in context.';
    }

    const entities = items.filter((i) => i.type === 'entity');
    const resources = items.filter((i) => i.type === 'resource');

    const sections: string[] = [];

    // Format entities (notes)
    if (entities.length > 0) {
      sections.push(
        entities
          .map((item, index) => {
            const sourceLabel = this.getSourceLabel(item.source);
            const maxContentLength = 2000;
            const content =
              item.content.length > maxContentLength
                ? item.content.slice(0, maxContentLength) + '...[truncated]'
                : item.content;

            return `[${index + 1}] Note: "${item.title}" (${sourceLabel})\n${content}\n---`;
          })
          .join('\n\n')
      );
    }

    // Format resources (documents) — higher truncation limit since
    // content is already smart-truncated by SelectedNodesStrategy
    if (resources.length > 0) {
      sections.push(
        '## Reference Documents\n\n' +
          resources
            .map((item, index) => {
              const sourceLabel = this.getSourceLabel(item.source);
              const maxContentLength = 10000;
              const content =
                item.content.length > maxContentLength
                  ? item.content.slice(0, maxContentLength) + '...[truncated]'
                  : item.content;

              return `[R${index + 1}] Document: "${item.title}" (${sourceLabel})\n${content}\n---`;
            })
            .join('\n\n')
      );
    }

    return sections.join('\n\n');
  }

  /**
   * Format a brief summary for debugging/display
   */
  static formatSummary(result: ContextResult): string {
    const { items, totalTokensEstimate, truncated, debug } = result;

    const parts = [`${items.length} items`, `~${totalTokensEstimate} tokens`];

    if (truncated) {
      parts.push('(truncated)');
    }

    if (debug) {
      parts.push(
        `[${debug.selectedCount} selected, ${debug.resourceCount} resources, ${debug.similarCount} similar, ${debug.traversalCount} traversal]`
      );
    }

    return parts.join(' | ');
  }

  private static getSourceLabel(source: ContextItem['source']): string {
    switch (source) {
      case 'selected':
        return 'in context';
      case 'similarity':
        return 'similar';
      case 'traversal':
        return 'connected';
      case 'document-tree':
        return 'doc summary';
      default:
        return source;
    }
  }
}
