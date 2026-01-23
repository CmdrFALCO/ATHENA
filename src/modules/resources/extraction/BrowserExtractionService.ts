import type { Resource } from '@/shared/types/resources';
import type { IExtractor, ExtractionResult } from './types';
import { DocxExtractor } from './extractors/DocxExtractor';
import { XlsxExtractor } from './extractors/XlsxExtractor';
import { MarkdownExtractor } from './extractors/MarkdownExtractor';
import { blobStorage } from '@/services/blobStorage';
import { updateResource } from '@/store/resourceActions';
import { devSettings$ } from '@/config/devSettings';
import { aiExtractionService } from './AIExtractionService';

/**
 * Map file extensions to MIME types for fallback detection.
 * Browsers often report .md files as application/octet-stream.
 */
const EXTENSION_TO_MIME: Record<string, string> = {
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.txt': 'text/plain',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
};

/**
 * Get effective MIME type, falling back to extension-based detection.
 */
function getEffectiveMimeType(resource: Resource): string | null {
  // If browser provided a specific MIME type (not generic), use it
  if (resource.mimeType && resource.mimeType !== 'application/octet-stream') {
    return resource.mimeType;
  }

  // Fall back to extension-based detection
  const ext = resource.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext && EXTENSION_TO_MIME[ext]) {
    return EXTENSION_TO_MIME[ext];
  }

  // Return original (might be null or application/octet-stream)
  return resource.mimeType ?? null;
}

/**
 * Service for content extraction with strategy-based routing.
 * Browser extraction: DOCX, XLSX, MD (fast, local)
 * AI extraction: PDF, images (requires AI backend)
 *
 * Strategy options (from devSettings):
 * - 'browser': Only use browser extractors
 * - 'ai': Only use AI extraction
 * - 'browser-then-ai': Try browser first, fall back to AI
 */
export class BrowserExtractionService {
  private extractors: IExtractor[] = [
    new DocxExtractor(),
    new XlsxExtractor(),
    new MarkdownExtractor(),
  ];

  /**
   * Check if any extraction method is available for this resource
   */
  canExtract(resource: Resource): boolean {
    const strategy = devSettings$.resources.extraction.strategy.get();

    // Check browser extraction
    if (strategy === 'browser' || strategy === 'browser-then-ai') {
      if (this.canBrowserExtract(resource)) {
        return true;
      }
    }

    // Check AI extraction
    if (strategy === 'ai' || strategy === 'browser-then-ai') {
      if (aiExtractionService.canExtract(resource)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if browser-only extraction is available
   */
  private canBrowserExtract(resource: Resource): boolean {
    const mimeType = getEffectiveMimeType(resource);
    if (!mimeType) return false;
    return this.extractors.some((e) => e.canExtract(mimeType));
  }

  /**
   * Extract content from a resource using strategy-based routing.
   * Updates the resource record with extracted text and status.
   */
  async extract(resource: Resource): Promise<ExtractionResult> {
    const strategy = devSettings$.resources.extraction.strategy.get();

    // Strategy: AI only
    if (strategy === 'ai') {
      return this.extractWithAI(resource);
    }

    // Strategy: Browser only or Browser-then-AI
    const browserResult = await this.extractWithBrowser(resource);

    // If browser extraction succeeded, we're done
    if (browserResult.text && !browserResult.error) {
      return browserResult;
    }

    // If strategy is browser-only, return whatever we got
    if (strategy === 'browser') {
      return browserResult;
    }

    // Strategy: browser-then-ai - try AI fallback
    if (aiExtractionService.canExtract(resource)) {
      console.log(`[Extraction] Browser extraction unavailable for ${resource.name}, trying AI...`);
      return this.extractWithAI(resource);
    }

    // No extraction method available
    return browserResult;
  }

  /**
   * Extract using browser-based extractors (DOCX, XLSX, MD)
   */
  private async extractWithBrowser(resource: Resource): Promise<ExtractionResult> {
    // Find appropriate extractor using effective MIME type
    const mimeType = getEffectiveMimeType(resource);
    const extractor = this.extractors.find((e) => mimeType && e.canExtract(mimeType));

    if (!extractor) {
      // Don't update status here - let the caller decide (might fall back to AI)
      return {
        text: '',
        error: `No browser extractor available for ${mimeType} (original: ${resource.mimeType})`,
      };
    }

    // Get blob from storage
    if (!resource.storageKey) {
      const result: ExtractionResult = {
        text: '',
        error: 'No storage key for resource',
      };
      await this.updateResourceStatus(resource.id, result, 'failed', 'browser');
      return result;
    }

    const blob = await blobStorage.retrieve(resource.storageKey);
    if (!blob) {
      const result: ExtractionResult = {
        text: '',
        error: 'Blob not found in storage',
      };
      await this.updateResourceStatus(resource.id, result, 'failed', 'browser');
      return result;
    }

    // Perform extraction
    const result = await extractor.extract(blob, resource.name);

    // Update resource with results
    const status = result.error && !result.text ? 'failed' : 'complete';
    await this.updateResourceStatus(resource.id, result, status, 'browser');

    // Trigger post-extraction processing (embedding generation)
    if (status === 'complete' && result.text) {
      this.triggerPostExtraction(resource.id).catch((err) => {
        console.error('[BrowserExtraction] Post-extraction failed:', err);
      });
    }

    return result;
  }

  /**
   * Extract using AI (PDF, images)
   */
  private async extractWithAI(resource: Resource): Promise<ExtractionResult> {
    if (!aiExtractionService.canExtract(resource)) {
      const result: ExtractionResult = {
        text: '',
        error: `AI extraction not available for ${resource.type}`,
      };
      await this.updateResourceStatus(resource.id, result, 'skipped', undefined);
      return result;
    }

    const result = await aiExtractionService.extract(resource);

    // Update resource with results
    const status = result.error && !result.text ? 'failed' : 'complete';
    await this.updateResourceStatus(resource.id, result, status, 'ai');

    // Trigger post-extraction processing (embedding generation)
    if (status === 'complete' && result.text) {
      this.triggerPostExtraction(resource.id).catch((err) => {
        console.error('[AIExtraction] Post-extraction failed:', err);
      });
    }

    return result;
  }

  private async updateResourceStatus(
    resourceId: string,
    result: ExtractionResult,
    status: 'complete' | 'failed' | 'skipped',
    method?: 'browser' | 'ai'
  ): Promise<void> {
    await updateResource(resourceId, {
      extractedText: result.text || undefined,
      extractionStatus: status,
      extractionMethod: method,
    });
  }

  private async triggerPostExtraction(resourceId: string): Promise<void> {
    // Dynamic import to avoid circular dependencies
    const { postExtraction } = await import('./postExtraction');
    await postExtraction(resourceId);
  }
}

// Singleton instance
export const browserExtractionService = new BrowserExtractionService();

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  (window as unknown as { __ATHENA_EXTRACTION__: typeof browserExtractionService }).__ATHENA_EXTRACTION__ =
    browserExtractionService;
}
