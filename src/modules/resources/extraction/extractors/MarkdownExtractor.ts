import type { IExtractor, ExtractionResult } from '../types';

export class MarkdownExtractor implements IExtractor {
  canExtract(mimeType: string): boolean {
    return mimeType === 'text/markdown' || mimeType === 'text/plain';
  }

  async extract(blob: Blob, _fileName: string): Promise<ExtractionResult> {
    try {
      const text = await blob.text();

      // For markdown, we could strip formatting, but keeping it
      // is often fine for FTS (headings, lists, etc. are still text)
      return {
        text: text.trim(),
      };
    } catch (error) {
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Markdown extraction failed',
      };
    }
  }
}
