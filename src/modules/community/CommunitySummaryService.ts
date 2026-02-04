/**
 * Community Summary Service — WP 9B.7
 * Generates LLM summaries, keywords, and embeddings for communities.
 * Processes bottom-up: level 0 first, then level 1+.
 */

import type { IAIService } from '@/modules/ai';
import type { INoteAdapter } from '@/adapters/INoteAdapter';
import type { ICommunityAdapter } from '@/adapters/ICommunityAdapter';
import type { Community } from './types';

interface SummaryResult {
  summary: string;
  keywords: string[];
}

export class CommunitySummaryService {
  constructor(
    private aiService: IAIService,
    private noteAdapter: INoteAdapter,
    private communityAdapter: ICommunityAdapter,
  ) {}

  /**
   * Generate summaries for all communities bottom-up.
   * Level 0 communities use entity content; level 1+ use child summaries.
   */
  async summarizeAll(communities: Community[]): Promise<void> {
    // Group by level
    const byLevel = new Map<number, Community[]>();
    for (const c of communities) {
      const level = byLevel.get(c.level) || [];
      level.push(c);
      byLevel.set(c.level, level);
    }

    // Process bottom-up (level 0, then 1, then 2, etc.)
    const levels = Array.from(byLevel.keys()).sort((a, b) => a - b);

    for (const level of levels) {
      const levelCommunities = byLevel.get(level) || [];

      for (const community of levelCommunities) {
        try {
          const result = level === 0
            ? await this.summarizeLeaf(community)
            : await this.summarizeParent(community);

          if (result) {
            // Generate embedding for the summary
            let embedding: number[] = [];
            try {
              const embeddingResult = await this.aiService.embed(result.summary);
              embedding = embeddingResult.vector;
            } catch (err) {
              console.warn(
                `[CommunitySummary] Embedding failed for community ${community.id}:`,
                err,
              );
            }

            // Persist
            await this.communityAdapter.updateSummary(
              community.id,
              result.summary,
              result.keywords,
              embedding,
            );

            // Update in-memory for parent summarization
            community.summary = result.summary;
            community.keywords = result.keywords;
            community.embedding = embedding.length > 0 ? embedding : null;
          }
        } catch (err) {
          console.error(
            `[CommunitySummary] Failed to summarize community ${community.id}:`,
            err,
          );
          // Don't abort — other communities still get summaries
        }
      }
    }
  }

  /**
   * Summarize a single stale community (re-summarize).
   */
  async summarizeOne(community: Community): Promise<void> {
    try {
      const result = community.level === 0
        ? await this.summarizeLeaf(community)
        : await this.summarizeParent(community);

      if (result) {
        let embedding: number[] = [];
        try {
          const embeddingResult = await this.aiService.embed(result.summary);
          embedding = embeddingResult.vector;
        } catch {
          // Continue without embedding
        }

        await this.communityAdapter.updateSummary(
          community.id,
          result.summary,
          result.keywords,
          embedding,
        );
      }
    } catch (err) {
      console.error(
        `[CommunitySummary] Failed to re-summarize community ${community.id}:`,
        err,
      );
    }
  }

  /**
   * Level 0: summarize from entity titles + content snippets.
   */
  private async summarizeLeaf(community: Community): Promise<SummaryResult | null> {
    const items: string[] = [];

    for (const entityId of community.memberEntityIds) {
      const entity = await this.noteAdapter.getById(entityId);
      if (entity) {
        const contentPreview = typeof entity.content === 'string'
          ? entity.content.slice(0, 200)
          : '';
        items.push(`- "${entity.title}"${contentPreview ? `: ${contentPreview}` : ''}`);
      }
    }

    if (items.length === 0) return null;

    const prompt = `You are analyzing a cluster of related knowledge items.

Items in this cluster:
${items.join('\n')}

Provide:
1. A 2-3 sentence summary of the common theme connecting these items
2. 3-5 keywords that capture the theme

Respond ONLY in JSON: { "summary": "...", "keywords": ["...", ...] }`;

    return this.callLLM(prompt);
  }

  /**
   * Level 1+: summarize from child community summaries.
   */
  private async summarizeParent(community: Community): Promise<SummaryResult | null> {
    const childSummaries: string[] = [];

    for (const childId of community.childCommunityIds) {
      const child = await this.communityAdapter.get(childId);
      if (child?.summary) {
        const keywordsStr = child.keywords.length > 0
          ? ` (Keywords: ${child.keywords.join(', ')})`
          : '';
        childSummaries.push(`- ${child.summary}${keywordsStr}`);
      }
    }

    if (childSummaries.length === 0) return null;

    const prompt = `You are analyzing a group of related themes from a knowledge base.

Themes:
${childSummaries.join('\n')}

Provide:
1. A 2-3 sentence summary of the overarching theme connecting these sub-themes
2. 3-5 keywords that capture the overarching theme

Respond ONLY in JSON: { "summary": "...", "keywords": ["...", ...] }`;

    return this.callLLM(prompt);
  }

  /**
   * Call LLM and parse JSON response.
   */
  private async callLLM(prompt: string): Promise<SummaryResult | null> {
    const result = await this.aiService.generate(prompt, {
      temperature: 0.3,
      maxTokens: 512,
    });

    return this.parseResponse(result.text);
  }

  /**
   * Parse JSON from LLM response, handling markdown fences.
   */
  private parseResponse(text: string): SummaryResult | null {
    // Strip markdown code fences if present
    let cleaned = text.trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.summary === 'string' && Array.isArray(parsed.keywords)) {
        return {
          summary: parsed.summary,
          keywords: parsed.keywords.filter((k: unknown) => typeof k === 'string'),
        };
      }
    } catch {
      // Try to extract summary from non-JSON response
      console.warn('[CommunitySummary] Failed to parse JSON response:', text.slice(0, 200));
    }

    return null;
  }
}
