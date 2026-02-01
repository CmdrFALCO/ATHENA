import type { IAIService } from '@/modules/ai';
import type { DocumentTree, TreeExtractionResult } from './types';
import { devSettings$ } from '@/config/devSettings';

/**
 * Extracts hierarchical document structure from PDF content (WP 8.2).
 * Uses AI to identify sections, page ranges, and generate summaries.
 * Enables reasoning-based retrieval instead of flat similarity search.
 */
export class DocumentTreeExtractor {
  constructor(private aiService: IAIService) {}

  /**
   * Extract document tree from PDF text content.
   * @param extractedText Full text from PDF extraction
   * @param pageCount Total pages in document (if known)
   * @param resourceTitle Resource title for context
   */
  async extract(
    extractedText: string,
    pageCount: number | null,
    resourceTitle: string
  ): Promise<TreeExtractionResult> {
    const pdfSettings = devSettings$.resources.pdf?.get();

    if (!pdfSettings?.extractStructure) {
      return {
        success: false,
        tree: null,
        error: 'Structure extraction disabled',
        sectionCount: 0,
        maxDepth: 0,
        model: '',
      };
    }

    const maxDepth = pdfSettings.maxStructureDepth ?? 4;
    const structureModel = pdfSettings.structureModel ?? '';

    const prompt = this.buildExtractionPrompt(
      extractedText,
      pageCount,
      resourceTitle,
      maxDepth
    );

    try {
      const response = await this.aiService.generate(prompt, {
        model: structureModel || undefined,
      });

      const responseText = typeof response === 'string' ? response : response.text;
      const tree = this.parseTreeResponse(responseText);

      if (!tree) {
        return {
          success: false,
          tree: null,
          error: 'Failed to parse tree structure from AI response',
          sectionCount: 0,
          maxDepth: 0,
          model: structureModel,
        };
      }

      const stats = this.calculateTreeStats(tree);

      return {
        success: true,
        tree,
        sectionCount: stats.count,
        maxDepth: stats.depth,
        model: structureModel,
      };
    } catch (error) {
      return {
        success: false,
        tree: null,
        error: error instanceof Error ? error.message : 'Unknown error during structure extraction',
        sectionCount: 0,
        maxDepth: 0,
        model: structureModel,
      };
    }
  }

  private buildExtractionPrompt(
    text: string,
    pageCount: number | null,
    title: string,
    maxDepth: number
  ): string {
    // Truncate if too long - structure extraction works on document overview
    const truncatedText =
      text.length > 50000
        ? text.slice(0, 25000) + '\n\n[...middle content omitted...]\n\n' + text.slice(-25000)
        : text;

    return `Analyze this document and extract its hierarchical structure as a table of contents.

Document title: "${title}"
${pageCount ? `Total pages: ${pageCount}` : ''}
Maximum nesting depth: ${maxDepth}

Instructions:
1. Identify major sections and subsections from the document content
2. For each section, determine:
   - The section title (as it appears or as clearly implied)
   - The approximate page range (if page markers exist, otherwise estimate)
   - A 1-2 sentence summary of what the section covers
3. Organize into a tree structure with maximum depth of ${maxDepth}
4. Use unique node_ids like "1", "1.1", "1.2", "2", etc.

Return ONLY a valid JSON object with this structure:
{
  "title": "Document Title",
  "node_id": "root",
  "start_page": 1,
  "end_page": <total pages>,
  "summary": "Brief document overview",
  "children": [
    {
      "title": "Section 1 Title",
      "node_id": "1",
      "start_page": 1,
      "end_page": 10,
      "summary": "What section 1 covers",
      "children": [...]
    }
  ]
}

Document content:
---
${truncatedText}
---

JSON structure:`;
  }

  private parseTreeResponse(response: string): DocumentTree | null {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch =
        response.match(/```(?:json)?\s*([\s\S]*?)```/) || response.match(/(\{[\s\S]*\})/);

      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[1].trim());

      if (!this.isValidTree(parsed)) return null;

      return parsed as DocumentTree;
    } catch {
      return null;
    }
  }

  private isValidTree(obj: unknown): obj is DocumentTree {
    if (!obj || typeof obj !== 'object') return false;
    const tree = obj as Record<string, unknown>;

    return (
      typeof tree.title === 'string' &&
      typeof tree.node_id === 'string' &&
      typeof tree.start_page === 'number' &&
      typeof tree.end_page === 'number' &&
      typeof tree.summary === 'string' &&
      Array.isArray(tree.children)
    );
  }

  private calculateTreeStats(tree: DocumentTree): { count: number; depth: number } {
    let count = 1;
    let maxChildDepth = 0;

    for (const child of tree.children) {
      const childStats = this.calculateTreeStats(child);
      count += childStats.count;
      maxChildDepth = Math.max(maxChildDepth, childStats.depth);
    }

    return { count, depth: maxChildDepth + 1 };
  }
}

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_TREE_EXTRACTOR__: DocumentTreeExtractor | null }).__ATHENA_TREE_EXTRACTOR__ = null;
}
