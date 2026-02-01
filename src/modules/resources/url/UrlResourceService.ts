import type { CreateResourceInput } from '@/shared/types/resources';
import type { ExtractionResult } from '../extraction/types';
import type { ScrapeResult } from './types';
import { getAIService } from '@/modules/ai/AIService';
import { getWebScraperService } from './WebScraperService';

/**
 * Service for creating URL resources with two modes:
 * - Reference: Just store URL and user notes (instant, no AI)
 * - Extracted: AI fetches and summarizes page content
 */
export class UrlResourceService {
  /**
   * Create a URL resource in Reference mode.
   * Just stores the URL and user notes — no extraction.
   */
  async createReference(url: string, notes: string): Promise<CreateResourceInput> {
    const name = this.extractTitleFromUrl(url);

    return {
      type: 'url',
      name,
      url,
      urlMode: 'reference',
      storageType: 'url', // No blob storage needed
      userNotes: notes || undefined,
    };
  }

  /**
   * Create a URL resource in AI Extract mode.
   * Sends URL to AI for fetching and summarization.
   * If preferFirecrawl is true, tries web scraping first then feeds content to AI.
   */
  async createWithExtraction(
    url: string,
    notes: string,
    preferFirecrawl = true,
  ): Promise<{
    input: CreateResourceInput;
    extractedText: string | null;
    extractionStatus: 'complete' | 'failed' | 'skipped';
    extractionMethod: 'ai' | 'firecrawl' | 'basic-fetch' | null;
    extractionError: string | null;
  }> {
    const name = this.extractTitleFromUrl(url);

    // Try web scraping first, then fall back to AI-only
    const scrapeResult = await this.extractContent(url, preferFirecrawl);

    if (scrapeResult.success && scrapeResult.content) {
      // Web scrape succeeded — use scraped content
      return {
        input: {
          type: 'url',
          name: scrapeResult.metadata.title ?? name,
          url,
          urlMode: 'extracted',
          storageType: 'url',
          userNotes: notes || undefined,
        },
        extractedText: scrapeResult.content,
        extractionStatus: 'complete',
        extractionMethod: scrapeResult.scrapedBy,
        extractionError: null,
      };
    }

    // Web scrape failed — fall back to AI extraction
    const extraction = await this.extractViaAI(url);

    return {
      input: {
        type: 'url',
        name,
        url,
        urlMode: 'extracted',
        storageType: 'url',
        userNotes: notes || undefined,
      },
      extractedText: extraction.text || null,
      extractionStatus: extraction.error ? 'failed' : 'complete',
      extractionMethod: extraction.error ? null : 'ai',
      extractionError: extraction.error || null,
    };
  }

  /**
   * Extract content from URL using best available scraper.
   */
  async extractContent(
    url: string,
    preferFirecrawl = true,
  ): Promise<{
    success: boolean;
    content: string | null;
    metadata: { title: string | null; description: string | null };
    error?: string;
    scrapedBy: ScrapeResult['scrapedBy'];
  }> {
    const scraper = getWebScraperService();
    await scraper.initialize();

    const result = await scraper.scrape(
      url,
      { formats: ['markdown'], includeMetadata: true },
      preferFirecrawl,
    );

    return {
      success: result.success,
      content: result.markdown,
      metadata: {
        title: result.metadata.title,
        description: result.metadata.description,
      },
      error: result.error,
      scrapedBy: result.scrapedBy,
    };
  }

  /**
   * Extract URL content via AI.
   * Uses Gemini's ability to fetch and analyze web pages.
   */
  private async extractViaAI(url: string): Promise<ExtractionResult> {
    const aiService = getAIService();

    const isAvailable = await aiService.isAvailable();
    if (!isAvailable) {
      return { text: '', error: 'AI service not available' };
    }

    try {
      const result = await aiService.generate(this.buildExtractionPrompt(url));

      if (result.finishReason === 'error') {
        return { text: '', error: 'AI extraction failed - URL may be inaccessible' };
      }

      return {
        text: result.text,
        error: undefined,
      };
    } catch (error) {
      return { text: '', error: String(error) };
    }
  }

  private buildExtractionPrompt(url: string): string {
    return `Please fetch and analyze the content at this URL: ${url}

Extract the following:
1. The main title of the page
2. A summary of the key content (2-3 paragraphs)
3. Any important facts, dates, or data points
4. Key topics or themes

Format your response as:

TITLE: [page title]

SUMMARY:
[your summary]

KEY POINTS:
- [point 1]
- [point 2]
- [etc.]

If you cannot access the URL, explain why.`;
  }

  /**
   * Extract a reasonable name from the URL.
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Try to get something meaningful from the pathname
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart) {
        // Remove file extension and clean up
        const name = lastPart
          .replace(/\.[^/.]+$/, '') // Remove extension
          .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
          .replace(/\b\w/g, (c) => c.toUpperCase()); // Title case

        if (name.length > 3) {
          return name;
        }
      }

      // Fall back to hostname
      return parsed.hostname.replace('www.', '');
    } catch {
      return 'URL Resource';
    }
  }
}

// Singleton instance
export const urlResourceService = new UrlResourceService();
