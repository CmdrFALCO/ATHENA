import type { IWebScraper, ScrapeOptions, ScrapeResult } from './types';
import { FirecrawlScraper } from './scrapers/FirecrawlScraper';
import { BasicFetchScraper } from './scrapers/BasicFetchScraper';
import { devSettings$ } from '@/config/devSettings';

/**
 * Service that manages web scrapers with automatic fallback.
 * Uses Firecrawl when available/enabled, falls back to basic fetch.
 */
export class WebScraperService {
  private firecrawlScraper: FirecrawlScraper;
  private basicScraper: BasicFetchScraper;

  constructor() {
    this.firecrawlScraper = new FirecrawlScraper();
    this.basicScraper = new BasicFetchScraper();
  }

  /**
   * Initialize the service (load API keys, etc.)
   */
  async initialize(): Promise<void> {
    await this.firecrawlScraper.loadApiKey();
  }

  /**
   * Get the best available scraper based on settings and availability.
   */
  private getScraper(preferFirecrawl: boolean): IWebScraper {
    const firecrawlEnabled = devSettings$.url.firecrawl.enabled.get();

    if (preferFirecrawl && firecrawlEnabled && this.firecrawlScraper.isAvailable()) {
      return this.firecrawlScraper;
    }

    return this.basicScraper;
  }

  /**
   * Scrape a URL with automatic fallback.
   *
   * @param url URL to scrape
   * @param options Scrape options
   * @param preferFirecrawl Whether to prefer Firecrawl (true for JS-heavy sites)
   */
  async scrape(
    url: string,
    options: ScrapeOptions = {},
    preferFirecrawl = true,
  ): Promise<ScrapeResult> {
    const primaryScraper = this.getScraper(preferFirecrawl);

    console.log(`[WebScraper] Scraping ${url} with ${primaryScraper.name}`);

    let result = await primaryScraper.scrape(url, options);

    // Fallback to basic fetch if Firecrawl fails and we haven't already used it
    if (!result.success && primaryScraper.name === 'firecrawl') {
      console.log('[WebScraper] Firecrawl failed, falling back to basic fetch');
      result = await this.basicScraper.scrape(url, options);
    }

    return result;
  }

  /**
   * Check if Firecrawl is configured and available.
   */
  isFirecrawlAvailable(): boolean {
    return this.firecrawlScraper.isAvailable();
  }

  /**
   * Get Firecrawl scraper instance for direct access (e.g., API key management).
   */
  getFirecrawlScraper(): FirecrawlScraper {
    return this.firecrawlScraper;
  }
}

// Singleton instance
let webScraperService: WebScraperService | null = null;

export function getWebScraperService(): WebScraperService {
  if (!webScraperService) {
    webScraperService = new WebScraperService();
  }
  return webScraperService;
}

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ATHENA_WEB_SCRAPER__ =
    () => webScraperService;
}
