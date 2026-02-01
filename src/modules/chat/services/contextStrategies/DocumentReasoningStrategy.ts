/**
 * Document Reasoning Strategy (WP 8.2)
 *
 * Uses document tree structure to reason about which sections are relevant,
 * rather than pure similarity matching. Enables targeted retrieval for
 * resources with hierarchical structure (e.g., PDFs).
 */

import type { IAIService } from '@/modules/ai';
import type { IResourceAdapter } from '@/adapters/IResourceAdapter';
import type { ContextItem, IContextStrategy } from './types';
import type { DocumentTree } from '@/modules/resources/extraction/types';

interface RelevantSection {
  node_id: string;
  title: string;
  relevanceScore: number;
  reasoning: string;
}

export class DocumentReasoningStrategy implements IContextStrategy {
  readonly name = 'document-reasoning';

  constructor(
    private aiService: IAIService,
    private resourceAdapter: IResourceAdapter
  ) {}

  /**
   * Gather context by reasoning over document tree structures.
   * @param query User's question
   * @param resourceIds Resource IDs to search within
   * @param limit Maximum sections to return
   */
  async gather(query: string, resourceIds: string[], limit: number): Promise<ContextItem[]> {
    if (!resourceIds?.length || !query) {
      return [];
    }

    const items: ContextItem[] = [];

    for (const resourceId of resourceIds) {
      if (items.length >= limit) break;

      const resource = await this.resourceAdapter.getById(resourceId);
      if (!resource?.structure) continue;

      let tree: DocumentTree;
      try {
        tree = JSON.parse(resource.structure) as DocumentTree;
      } catch {
        continue;
      }

      // Ask AI to navigate the tree
      const relevantSections = await this.reasonOverTree(query, tree);

      for (const section of relevantSections) {
        if (items.length >= limit) break;

        // Extract content for this section
        const content = this.extractSectionContent(
          resource.extractedText || '',
          tree,
          section.node_id
        );

        if (content) {
          items.push({
            id: `${resourceId}:${section.node_id}`,
            type: 'resource',
            title: `${resource.name} > ${section.title}`,
            content,
            relevanceScore: section.relevanceScore,
            source: 'similarity', // Map to existing source type
          });
        }
      }
    }

    return items;
  }

  private async reasonOverTree(
    query: string,
    tree: DocumentTree
  ): Promise<RelevantSection[]> {
    const treeOutline = this.formatTreeForPrompt(tree);

    const prompt = `You are helping find relevant sections in a document to answer a question.

Document structure:
${treeOutline}

Question: "${query}"

Which sections should I examine to answer this question? Consider:
1. Direct relevance to the question topic
2. Prerequisite information needed for context
3. Related concepts that might help

Return a JSON array of relevant sections, ordered by relevance:
[
  {
    "node_id": "section id from structure",
    "title": "section title",
    "relevanceScore": 0.0-1.0,
    "reasoning": "why this section is relevant"
  }
]

Return only sections that are actually relevant. If no sections are relevant, return [].

JSON array:`;

    try {
      const response = await this.aiService.generate(prompt);
      const responseText = typeof response === 'string' ? response : response.text;
      return this.parseReasoningResponse(responseText);
    } catch {
      return [];
    }
  }

  private formatTreeForPrompt(tree: DocumentTree, indent = 0): string {
    const prefix = '  '.repeat(indent);
    let result = `${prefix}- [${tree.node_id}] ${tree.title} (pages ${tree.start_page}-${tree.end_page})\n`;
    result += `${prefix}  Summary: ${tree.summary}\n`;

    for (const child of tree.children) {
      result += this.formatTreeForPrompt(child, indent + 1);
    }

    return result;
  }

  private parseReasoningResponse(response: string): RelevantSection[] {
    try {
      const jsonMatch =
        response.match(/```(?:json)?\s*([\s\S]*?)```/) || response.match(/(\[[\s\S]*\])/);

      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[1].trim());

      if (!Array.isArray(parsed)) return [];

      return parsed.filter(
        (item): item is RelevantSection =>
          typeof item.node_id === 'string' &&
          typeof item.title === 'string' &&
          typeof item.relevanceScore === 'number' &&
          typeof item.reasoning === 'string'
      );
    } catch {
      return [];
    }
  }

  private extractSectionContent(
    fullText: string,
    tree: DocumentTree,
    targetNodeId: string
  ): string | null {
    const section = this.findSection(tree, targetNodeId);
    if (!section) return null;

    // Strategy 1: Look for section title in text
    const titleIndex = fullText.toLowerCase().indexOf(section.title.toLowerCase());
    if (titleIndex >= 0) {
      const nextSection = this.findNextSibling(tree, targetNodeId);
      if (nextSection) {
        const nextTitleIndex = fullText
          .toLowerCase()
          .indexOf(nextSection.title.toLowerCase(), titleIndex + 1);
        if (nextTitleIndex > titleIndex) {
          return fullText.slice(titleIndex, nextTitleIndex).trim();
        }
      }
      // No next section found, take reasonable chunk
      return fullText.slice(titleIndex, titleIndex + 5000).trim();
    }

    // Strategy 2: Estimate based on page proportions
    const totalPages = tree.end_page - tree.start_page + 1;
    if (totalPages <= 0) return null;

    const textPerPage = fullText.length / totalPages;
    const startOffset = Math.floor((section.start_page - tree.start_page) * textPerPage);
    const endOffset = Math.floor((section.end_page - tree.start_page + 1) * textPerPage);

    return fullText.slice(startOffset, endOffset).trim() || null;
  }

  private findSection(tree: DocumentTree, nodeId: string): DocumentTree | null {
    if (tree.node_id === nodeId) return tree;

    for (const child of tree.children) {
      const found = this.findSection(child, nodeId);
      if (found) return found;
    }

    return null;
  }

  private findNextSibling(tree: DocumentTree, nodeId: string): DocumentTree | null {
    const findInChildren = (parent: DocumentTree): DocumentTree | null => {
      for (let i = 0; i < parent.children.length; i++) {
        if (parent.children[i].node_id === nodeId) {
          return parent.children[i + 1] || null;
        }
        const found = findInChildren(parent.children[i]);
        if (found) return found;
      }
      return null;
    };

    return findInChildren(tree);
  }
}
