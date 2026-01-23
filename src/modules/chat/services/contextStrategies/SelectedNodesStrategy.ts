/**
 * Selected Nodes Strategy
 * WP 7.2 - Gather explicitly selected nodes for AI context
 *
 * These are nodes the user has explicitly added to the thread context.
 * They always have the highest relevance score (1.0).
 */

import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { IResourceAdapter } from '@/adapters/IResourceAdapter';
import { extractTextFromTiptap } from '@/shared/utils/extractTextFromTiptap';
import type { ContextItem, IContextStrategy } from './types';

export class SelectedNodesStrategy implements IContextStrategy {
  readonly name = 'selected';
  private noteAdapter: INoteAdapter;
  private resourceAdapter: IResourceAdapter;

  constructor(noteAdapter: INoteAdapter, resourceAdapter: IResourceAdapter) {
    this.noteAdapter = noteAdapter;
    this.resourceAdapter = resourceAdapter;
  }

  /**
   * Gather explicitly selected nodes
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

  private extractContent(content: unknown): string {
    if (!content) return '';
    if (typeof content === 'string') return content;
    return extractTextFromTiptap(content);
  }
}
