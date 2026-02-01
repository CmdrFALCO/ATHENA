/**
 * Web scraper interface — abstracts Firecrawl vs basic fetch.
 * Allows easy testing, future scrapers, and automatic fallback chains.
 */
export interface IWebScraper {
  /** Single page scrape */
  scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult>;

  /** Check if scraper is available/configured */
  isAvailable(): boolean;

  /** Get scraper name for logging */
  readonly name: string;
}

export interface ScrapeOptions {
  /** Output formats to request */
  formats?: ('markdown' | 'html' | 'links')[];
  /** Wait for JS rendering (ms) — Firecrawl only */
  waitFor?: number;
  /** Include page metadata */
  includeMetadata?: boolean;
  /** Timeout in ms */
  timeout?: number;
}

export interface ScrapeResult {
  success: boolean;
  url: string;
  /** Clean markdown content */
  markdown: string | null;
  /** Raw HTML (if requested) */
  html?: string;
  /** Extracted links (if requested) */
  links?: string[];
  /** Page metadata */
  metadata: PageMetadata;
  /** Error message if failed */
  error?: string;
  /** Which scraper was used */
  scrapedBy: 'firecrawl' | 'basic-fetch';
}

export interface PageMetadata {
  title: string | null;
  description: string | null;
  ogImage?: string;
  language?: string;
  author?: string;
  publishedDate?: string;
}

/**
 * Firecrawl API response shape (v1/scrape endpoint).
 */
export interface FirecrawlApiResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    links?: string[];
    metadata?: {
      title?: string;
      description?: string;
      ogImage?: string;
      language?: string;
    };
  };
  error?: string;
}
