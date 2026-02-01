/**
 * Selected Nodes Strategy
 * WP 7.2 - Gather explicitly selected nodes for AI context
 * WP 8.7.2 - Resource gathering with smart truncation and document tree support
 *
 * These are nodes the user has explicitly added to the thread context.
 * They always have the highest relevance score (1.0).
 */

import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IResourceAdapter } from '@/adapters/IResourceAdapter';
import type { Resource } from '@/shared/types/resources';
import { extractTextFromTiptap } from '@/shared/utils/extractTextFromTiptap';
import type { ContextItem, IContextStrategy } from './types';

interface DocumentTreeNode {
  title: string;
  node_id: string;
  summary?: string;
  children?: DocumentTreeNode[];
}

export class SelectedNodesStrategy implements IContextStrategy {
  readonly name = 'selected';
  private noteAdapter: INoteAdapter;
  private resourceAdapter: IResourceAdapter;

  constructor(noteAdapter: INoteAdapter, resourceAdapter: IResourceAdapter) {
    this.noteAdapter = noteAdapter;
    this.resourceAdapter = resourceAdapter;
  }

  /**
   * Gather explicitly selected nodes (entities)
   * These always have relevanceScore = 1.0 (highest priority)
   */
  async gather(nodeIds: string[]): Promise<ContextItem[]> {
    const items: ContextItem[] = [];

    for (const id of nodeIds) {
      // Try as entity first
      const note = await this.noteAdapter.getById(id);
      if (note) {
        items.push({
          id: note.id,
          type: 'entity',
          title: note.title,
          content: this.extractContent(note.content),
          relevanceScore: 1.0,
          source: 'selected',
        });
        continue;
      }

      // Try as resource
      const resource = await this.resourceAdapter.getById(id);
      if (resource) {
        items.push({
          id: resource.id,
          type: 'resource',
          title: resource.name,
          content: resource.extractedText || resource.userNotes || '',
          relevanceScore: 1.0,
          source: 'selected',
        });
      }
    }

    return items;
  }

  /**
   * Gather explicitly selected resources with smart truncation (WP 8.7.2).
   * Separate from gather() to handle resources with document tree support
   * and configurable truncation limits.
   */
  async gatherResources(
    resourceIds: string[],
    maxChars: number = 8000,
    useDocumentTree: boolean = true
  ): Promise<ContextItem[]> {
    const items: ContextItem[] = [];

    for (const id of resourceIds) {
      const resource = await this.resourceAdapter.getById(id);
      if (!resource) continue;

      const contextItem = this.resourceToContextItem(resource, maxChars, useDocumentTree);
      if (contextItem) {
        items.push(contextItem);
      }
    }

    return items;
  }

  /**
   * Convert a resource to a context item with smart truncation
   */
  private resourceToContextItem(
    resource: Resource,
    maxChars: number,
    useDocumentTree: boolean
  ): ContextItem | null {
    let content = '';
    let source: ContextItem['source'] = 'selected';

    // Strategy 1: Use document tree summaries if available (WP 8.2)
    if (useDocumentTree && resource.structure) {
      const treeContent = this.extractFromDocumentTree(resource.structure, maxChars);
      if (treeContent) {
        content = treeContent;
        source = 'document-tree';
      }
    }

    // Strategy 2: Fall back to extracted text with smart truncation
    if (!content) {
      const rawText = resource.extractedText || resource.userNotes || '';
      content = this.truncateResourceContent(rawText, maxChars);
    }

    if (!content.trim()) {
      console.warn(`[SelectedNodesStrategy] Resource ${resource.id} has no extractable content`);
      return null;
    }

    return {
      id: resource.id,
      type: 'resource',
      title: resource.name,
      content,
      relevanceScore: 1.0,
      source,
    };
  }

  /**
   * Extract content from document tree structure (WP 8.2).
   * Prefers section summaries over raw text for concise context.
   */
  private extractFromDocumentTree(
    structure: string | object,
    maxChars: number
  ): string | null {
    try {
      const tree: DocumentTreeNode =
        typeof structure === 'string' ? JSON.parse(structure) : structure;

      const sections: string[] = [];
      let totalChars = 0;

      const collectSummaries = (node: DocumentTreeNode, depth: number = 0) => {
        if (totalChars >= maxChars) return;

        const indent = '  '.repeat(depth);

        if (node.summary) {
          const line = `${indent}**${node.title}:** ${node.summary}`;
          if (totalChars + line.length <= maxChars) {
            sections.push(line);
            totalChars += line.length;
          }
        } else if (node.title && depth === 0) {
          const line = `**${node.title}**`;
          sections.push(line);
          totalChars += line.length;
        }

        if (node.children) {
          for (const child of node.children) {
            if (totalChars >= maxChars) break;
            collectSummaries(child, depth + 1);
          }
        }
      };

      collectSummaries(tree);

      return sections.length > 0 ? sections.join('\n') : null;
    } catch (error) {
      console.warn('[SelectedNodesStrategy] Failed to parse document tree:', error);
      return null;
    }
  }

  /**
   * Truncate content to max chars with smart boundaries.
   * Tries paragraph, then sentence boundaries before hard truncation.
   */
  private truncateResourceContent(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;

    const truncated = text.slice(0, maxChars);

    // Try to truncate at paragraph boundary
    const lastParagraph = truncated.lastIndexOf('\n\n');
    if (lastParagraph > maxChars * 0.7) {
      return truncated.slice(0, lastParagraph) + '\n\n[...content truncated...]';
    }

    // Fall back to sentence boundary
    const lastSentence = truncated.lastIndexOf('. ');
    if (lastSentence > maxChars * 0.8) {
      return truncated.slice(0, lastSentence + 1) + '\n\n[...content truncated...]';
    }

    // Hard truncate
    return truncated + '\n\n[...content truncated...]';
  }

  private extractContent(content: unknown): string {
    if (!content) return '';
    if (typeof content === 'string') return content;
    return extractTextFromTiptap(content);
  }
}
