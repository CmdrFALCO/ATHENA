import mammoth from 'mammoth';
import type { IExtractor, ExtractionResult } from '../types';

export class DocxExtractor implements IExtractor {
  canExtract(mimeType: string): boolean {
    return mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  async extract(blob: Blob, _fileName: string): Promise<ExtractionResult> {
    try {
      const arrayBuffer = await blob.arrayBuffer();

      // Extract raw text (not HTML) for cleaner FTS indexing
      const result = await mammoth.extractRawText({ arrayBuffer });

      return {
        text: result.value.trim(),
        structured: undefined,
        error:
          result.messages.length > 0
            ? result.messages.map((m) => m.message).join('; ')
            : undefined,
      };
    } catch (error) {
      return {
        text: '',
        error: error instanceof Error ? error.message : 'DOCX extraction failed',
      };
    }
  }
}
