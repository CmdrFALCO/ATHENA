import type { IWebScraper, ScrapeOptions, ScrapeResult, FirecrawlApiResponse } from '../types';
import { getSecureStorage } from '@/services/secureStorage';

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1/scrape';

/**
 * Firecrawl-based web scraper for JS-heavy sites.
 * Requires API key stored in SecureStorage.
 */
export class FirecrawlScraper implements IWebScraper {
  readonly name = 'firecrawl';

  private apiKey: string | null = null;
  private keyLoaded = false;

  async loadApiKey(): Promise<string | null> {
    if (this.keyLoaded) return this.apiKey;

    try {
      const storage = getSecureStorage();
      this.apiKey = await storage.retrieve('firecrawl-api-key');
      this.keyLoaded = true;
      return this.apiKey;
    } catch {
      this.keyLoaded = true;
      return null;
    }
  }

  /** Clears cached key state so the next call to loadApiKey() re-reads storage. */
  resetKeyCache(): void {
    this.apiKey = null;
    this.keyLoaded = false;
  }

  isAvailable(): boolean {
    return this.keyLoaded && this.apiKey !== null;
  }

  async scrape(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const apiKey = await this.loadApiKey();

    if (!apiKey) {
      return {
        success: false,
        url,
        markdown: null,
        metadata: { title: null, description: null },
        error: 'Firecrawl API key not configured',
        scrapedBy: 'firecrawl',
      };
    }

    const formats = options.formats ?? ['markdown'];
    const timeout = options.timeout ?? 30000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(FIRECRAWL_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats,
          waitFor: options.waitFor,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          url,
          markdown: null,
          metadata: { title: null, description: null },
          error: `Firecrawl API error: ${response.status} - ${errorText}`,
          scrapedBy: 'firecrawl',
        };
      }

      const data: FirecrawlApiResponse = await response.json();

      if (!data.success || !data.data) {
        return {
          success: false,
          url,
          markdown: null,
          metadata: { title: null, description: null },
          error: data.error ?? 'Firecrawl returned no data',
          scrapedBy: 'firecrawl',
        };
      }

      return {
        success: true,
        url,
        markdown: data.data.markdown ?? null,
        html: data.data.html,
        links: data.data.links,
        metadata: {
          title: data.data.metadata?.title ?? null,
          description: data.data.metadata?.description ?? null,
          ogImage: data.data.metadata?.ogImage,
          language: data.data.metadata?.language,
        },
        scrapedBy: 'firecrawl',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        url,
        markdown: null,
        metadata: { title: null, description: null },
        error: `Firecrawl request failed: ${message}`,
        scrapedBy: 'firecrawl',
      };
    }
  }
}
