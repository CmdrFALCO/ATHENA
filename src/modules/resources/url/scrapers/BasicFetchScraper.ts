import type { IWebScraper, ScrapeOptions, ScrapeResult, PageMetadata } from '../types';

/**
 * Basic fetch-based scraper for simple HTML pages.
 * Used as fallback when Firecrawl is not available.
 */
export class BasicFetchScraper implements IWebScraper {
  readonly name = 'basic-fetch';

  isAvailable(): boolean {
    return true; // Always available
  }

  async scrape(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const timeout = options.timeout ?? 15000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ATHENA Knowledge Manager',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          url,
          markdown: null,
          metadata: { title: null, description: null },
          error: `HTTP ${response.status}: ${response.statusText}`,
          scrapedBy: 'basic-fetch',
        };
      }

      const html = await response.text();
      const metadata = this.extractMetadata(html);
      const markdown = this.htmlToMarkdown(html);
      const links = options.formats?.includes('links')
        ? this.extractLinks(html, url)
        : undefined;

      return {
        success: true,
        url,
        markdown,
        html: options.formats?.includes('html') ? html : undefined,
        links,
        metadata,
        scrapedBy: 'basic-fetch',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        url,
        markdown: null,
        metadata: { title: null, description: null },
        error: `Fetch failed: ${message}`,
        scrapedBy: 'basic-fetch',
      };
    }
  }

  private extractMetadata(html: string): PageMetadata {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const ogImageMatch =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    return {
      title: titleMatch ? this.decodeHtmlEntities(titleMatch[1].trim()) : null,
      description: descMatch ? this.decodeHtmlEntities(descMatch[1].trim()) : null,
      ogImage: ogImageMatch?.[1],
    };
  }

  private htmlToMarkdown(html: string): string {
    // Remove script, style, nav, footer, header tags
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

    // Convert headers
    text = text.replace(/<h1[^>]*>([^<]+)<\/h1>/gi, '# $1\n\n');
    text = text.replace(/<h2[^>]*>([^<]+)<\/h2>/gi, '## $1\n\n');
    text = text.replace(/<h3[^>]*>([^<]+)<\/h3>/gi, '### $1\n\n');

    // Convert paragraphs and line breaks
    text = text.replace(/<p[^>]*>/gi, '\n\n');
    text = text.replace(/<\/p>/gi, '');
    text = text.replace(/<br\s*\/?>/gi, '\n');

    // Convert lists
    text = text.replace(/<li[^>]*>/gi, '- ');
    text = text.replace(/<\/li>/gi, '\n');

    // Convert links (keep text only)
    text = text.replace(/<a[^>]*>([^<]+)<\/a>/gi, '$1');

    // Remove remaining tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode entities and clean up whitespace
    text = this.decodeHtmlEntities(text);
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    return text;
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      try {
        const href = match[1];
        const absoluteUrl = new URL(href, baseUrl).href;
        if (absoluteUrl.startsWith('http')) {
          links.push(absoluteUrl);
        }
      } catch {
        // Invalid URL, skip
      }
    }

    return [...new Set(links)]; // Dedupe
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  }
}
