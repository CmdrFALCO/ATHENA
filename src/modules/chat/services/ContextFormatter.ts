/**
 * Context Formatter
 * WP 7.2 - Format context items for inclusion in AI prompts
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
   * Format items as a numbered list for the AI
   */
  static formatForPrompt(items: ContextItem[]): string {
    if (items.length === 0) {
      return 'No relevant notes in context.';
    }

    return items
      .map((item, index) => {
        const typeLabel = item.type === 'entity' ? 'Note' : 'Resource';
        const sourceLabel = this.getSourceLabel(item.source);

        // Truncate long content to avoid overwhelming the prompt
        const maxContentLength = 2000;
        const content =
          item.content.length > maxContentLength
            ? item.content.slice(0, maxContentLength) + '...[truncated]'
            : item.content;

        return `[${index + 1}] ${typeLabel}: "${item.title}" (${sourceLabel})
${content}
---`;
      })
      .join('\n\n');
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
        `[${debug.selectedCount} selected, ${debug.similarCount} similar, ${debug.traversalCount} traversal]`
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
      default:
        return source;
    }
  }
}
